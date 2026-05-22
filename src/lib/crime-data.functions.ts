import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server function que busca indicadores de criminalidade reais por cidade
 * usando Firecrawl (web search em portais brasileiros) + Lovable AI Gateway
 * (extração de dados estruturados a partir dos textos coletados).
 *
 * Cache em memória de 1 hora por (cidade + período) para economizar créditos.
 */

const InputSchema = z.object({
  city: z.string().min(2).max(80),
  period: z.enum(["semana", "mes", "ano"]),
});

const SourceSchema = z.object({
  titulo: z.string(),
  url: z.string(),
});

const CategorySchema = z.object({
  categoria: z.string(),
  total: z.number(),
});

const SeriePointSchema = z.object({
  label: z.string(),
  total: z.number(),
});

export const CrimeReportSchema = z.object({
  totalOcorrencias: z.number(),
  variacao: z.number(), // % vs período anterior
  tipoMaisFrequente: z.string(),
  tiposFrequentes: z.array(CategorySchema),
  serie: z.array(SeriePointSchema),
  fontesConsultadas: z.array(SourceSchema),
  resumo: z.string().optional(),
});

export type CrimeReport = z.infer<typeof CrimeReportSchema>;

// ---------- cache simples em memória ----------
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const cache = new Map<string, { at: number; data: CrimeReport }>();

const PERIOD_PT: Record<string, string> = {
  semana: "última semana",
  mes: "último mês",
  ano: "último ano",
};

const SERIE_HINT: Record<string, string> = {
  semana: 'série com 7 pontos rotulados "Seg","Ter","Qua","Qui","Sex","Sáb","Dom"',
  mes: 'série com 4 ou 5 pontos rotulados "Sem 1","Sem 2","Sem 3","Sem 4","Sem 5"',
  ano: 'série com 12 pontos rotulados "Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"',
};

async function firecrawlSearch(query: string) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY não configurada");

  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: 6,
      lang: "pt",
      country: "br",
      tbs: "qdr:y",
      scrapeOptions: { formats: ["markdown"] },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firecrawl search falhou [${res.status}]: ${t.slice(0, 300)}`);
  }
  return res.json();
}

interface FirecrawlResult {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
}

function collectResults(payload: unknown): FirecrawlResult[] {
  const p = payload as { data?: any; web?: any } | undefined;
  // Firecrawl v2: { success, data: { web: [...], news: [...] } }
  // Variantes antigas: { data: [...] } ou { web: [...] }
  const candidates: unknown[] = [
    p?.data?.web,
    p?.data?.news,
    p?.data,
    p?.web,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c as FirecrawlResult[];
  }
  return [];
}


async function extractWithAI(
  city: string,
  period: "semana" | "mes" | "ano",
  results: FirecrawlResult[],
): Promise<CrimeReport> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

  const corpus = results
    .map((r, i) => {
      const md = (r.markdown ?? r.description ?? "").slice(0, 2500);
      return `### Fonte ${i + 1}\nTítulo: ${r.title ?? ""}\nURL: ${r.url ?? ""}\n${md}`;
    })
    .join("\n\n");

  const system =
    "Você é um analista de segurança pública brasileiro. Extraia indicadores de criminalidade a partir dos textos fornecidos (notícias, portais de SSP, G1, R7, etc). Responda SOMENTE chamando a função extrair_indicadores. Todos os textos devem estar em Português do Brasil. Quando os dados forem estimativas a partir das notícias, use números plausíveis e coerentes com as fontes.";

  const user = `Cidade: ${city}\nPeríodo de análise: ${PERIOD_PT[period]}\n\nGere a série temporal exatamente assim: ${SERIE_HINT[period]}.\n\nIncluir no máximo 7 categorias em tiposFrequentes (ordenadas da maior para a menor).\nincluir todas as fontes consultadas com título e URL.\n\n===== TEXTOS COLETADOS =====\n${corpus}`;

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "extrair_indicadores",
          description: "Retorna indicadores estruturados de criminalidade.",
          parameters: {
            type: "object",
            properties: {
              totalOcorrencias: { type: "number" },
              variacao: {
                type: "number",
                description: "Variação percentual versus período anterior. Pode ser negativa.",
              },
              tipoMaisFrequente: { type: "string" },
              tiposFrequentes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    categoria: { type: "string" },
                    total: { type: "number" },
                  },
                  required: ["categoria", "total"],
                  additionalProperties: false,
                },
              },
              serie: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    total: { type: "number" },
                  },
                  required: ["label", "total"],
                  additionalProperties: false,
                },
              },
              fontesConsultadas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    titulo: { type: "string" },
                    url: { type: "string" },
                  },
                  required: ["titulo", "url"],
                  additionalProperties: false,
                },
              },
              resumo: { type: "string" },
            },
            required: [
              "totalOcorrencias",
              "variacao",
              "tipoMaisFrequente",
              "tiposFrequentes",
              "serie",
              "fontesConsultadas",
            ],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "extrair_indicadores" } },
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("Limite de requisições da IA atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage.");
    throw new Error(`AI Gateway falhou [${res.status}]: ${t.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("IA não retornou dados estruturados.");
  const parsed = CrimeReportSchema.parse(JSON.parse(args));
  return parsed;
}

export const fetchCrimeReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const key = `${data.city.toLowerCase()}::${data.period}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return hit.data;
    }

    const periodLabel = PERIOD_PT[data.period];
    const queries = [
      `criminalidade estatísticas ${data.city} ${periodLabel}`,
      `índices de violência ${data.city} Brasil`,
      `segurança pública ${data.city} ocorrências policiais`,
      `${data.city} roubos furtos homicídios estatística`,
    ];

    let results: FirecrawlResult[] = [];
    let lastErr: unknown = null;
    for (const q of queries) {
      try {
        const payload = await firecrawlSearch(q);
        results = collectResults(payload);
        if (results.length > 0) break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (results.length === 0) {
      const detail = lastErr instanceof Error ? ` (${lastErr.message})` : "";
      throw new Error(`Nenhuma fonte encontrada para "${data.city}"${detail}.`);
    }


    const report = await extractWithAI(data.city, data.period, results);
    cache.set(key, { at: Date.now(), data: report });
    return report;
  });
