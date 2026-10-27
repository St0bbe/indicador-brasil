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
  forceRefresh: z.boolean().optional(),
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
  isMocked: z.boolean().optional(),
  anoReferencia: z.number().int().optional(),
  abrangencia: z.string().optional(),
  metodologia: z.string().optional(),
  updatedAt: z.number().optional(),
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

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = initialDelay * Math.pow(2, i);
      console.warn(`Tentativa ${i + 1} falhou, tentando novamente em ${delay}ms...`, err);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

async function firecrawlSearch(query: string, options?: { tbs?: string; scrape?: boolean; limit?: number }) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY não configurada");

  return retryWithBackoff(async () => {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: options?.limit ?? 6,
        lang: "pt",
        country: "br",
        ...(options?.tbs ? { tbs: options.tbs } : {}),
        ...(options?.scrape === false ? {} : { scrapeOptions: { formats: ["markdown"] } }),
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      // Se for erro de quota ou rate limit, o backoff ajuda
      throw new Error(`Firecrawl search falhou [${res.status}]: ${t.slice(0, 300)}`);
    }
    const json = await res.json();
    const results = collectResults(json);
    if (results.length === 0) {
      throw new Error("Firecrawl retornou resultados vazios.");
    }
    return json;
  });
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

function uniqueResults(results: FirecrawlResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = result.url ?? result.title ?? result.description;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fallbackSources(city: string): FirecrawlResult[] {
  const cityLower = city.toLowerCase();
  const isSaoPaulo = cityLower.includes("são paulo") || cityLower.includes("sao paulo");

  return [
    ...(isSaoPaulo
      ? [
          {
            title: "Estatísticas criminais - Secretaria da Segurança Pública de São Paulo",
            url: "https://www.ssp.sp.gov.br/estatistica",
            description: "Portal público oficial com séries e indicadores criminais do Estado de São Paulo.",
            markdown:
              "Fonte oficial da SSP-SP para estatísticas criminais, incluindo homicídios, roubos, furtos, latrocínios e outros indicadores por período.",
          },
          {
            title: "Agência SP - índices criminais em São Paulo",
            url: "https://www.agenciasp.sp.gov.br/?s=%C3%ADndices+criminais",
            description: "Notícias oficiais recentes sobre índices de criminalidade no Estado de São Paulo.",
            markdown:
              "Notícias públicas do Governo de São Paulo sobre queda ou alta em roubos, homicídios, latrocínios, furtos e produtividade policial.",
          },
        ]
      : []),
    {
      title: `Busca pública sobre criminalidade em ${city} - G1`,
      url: `https://g1.globo.com/busca/?q=${encodeURIComponent(`criminalidade ${city}`)}`,
      description: `Busca em notícias recentes sobre criminalidade, roubos, furtos e homicídios em ${city}.`,
      markdown: `Índice de notícias públicas brasileiras usado como fonte complementar para estimar ocorrências recentes em ${city}.`,
    },
    {
      title: `Busca pública sobre segurança pública em ${city} - Google News`,
      url: `https://news.google.com/search?q=${encodeURIComponent(`criminalidade segurança pública ${city}`)}&hl=pt-BR&gl=BR&ceid=BR%3Apt-419`,
      description: `Agregador de notícias recentes sobre segurança pública e criminalidade em ${city}.`,
      markdown: `Resultados recentes de notícias públicas sobre segurança pública, violência urbana e ocorrências policiais em ${city}.`,
    },
  ];
}


function generateMockData(city: string, period: "semana" | "mes" | "ano"): CrimeReport {
  const isSemana = period === "semana";
  const isMes = period === "mes";
  
  const baseTotal = isSemana ? 150 : isMes ? 600 : 7200;
  const variation = (Math.random() * 20 - 10); // -10% a +10%

  const labels = isSemana 
    ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    : isMes
    ? ["Sem 1", "Sem 2", "Sem 3", "Sem 4"]
    : ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const serie = labels.map(label => ({
    label,
    total: Math.round((baseTotal / labels.length) * (0.8 + Math.random() * 0.4))
  }));

  const totalOcorrencias = serie.reduce((acc, curr) => acc + curr.total, 0);

  return {
    totalOcorrencias,
    variacao: variation,
    tipoMaisFrequente: "Roubo/Furto",
    tiposFrequentes: [
      { categoria: "Roubo/Furto", total: Math.round(totalOcorrencias * 0.6) },
      { categoria: "Ameaça", total: Math.round(totalOcorrencias * 0.2) },
      { categoria: "Lesão Corporal", total: Math.round(totalOcorrencias * 0.1) },
      { categoria: "Outros", total: Math.round(totalOcorrencias * 0.1) },
    ],
    serie,
    fontesConsultadas: [],
    resumo: `Dados simulados para ${city} devido à indisponibilidade de fontes em tempo real. Os números refletem padrões históricos médios para cidades brasileiras de porte similar.`,
    isMocked: true,
  };
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

  const currentYear = new Date().getFullYear();
  const system =
    `Você é um analista de segurança pública brasileiro. Fontes primárias prioritárias: Atlas da Violência (Ipea/FBSP) e Anuário Brasileiro de Segurança Pública (FBSP). Secretarias estaduais e bases governamentais oficiais podem complementar séries locais. Notícias servem SOMENTE como contexto, nunca como base para criar contagens, taxas ou variações. Não invente, estime, extrapole, distribua ou interpolе números. Não converta estatísticas estaduais em municipais. Use apenas valores explicitamente publicados e verificados nos textos coletados, com mesmo município/UF, período e indicador. Não confunda ano de publicação com ano de referência. Se não houver dados suficientes para calcular TODOS os indicadores solicitados com evidência documental, NÃO chame a função: responda com uma mensagem informando indisponibilidade. Responda em Português do Brasil.`;

  const user = `ATENÇÃO: apenas estatísticas explicitamente documentadas nas fontes oficiais; notícias são complementares. Não fabrique séries semanais/mensais a partir de totais anuais. Se não houver série oficial do período, não gere relatório. Cidade: ${city}\nPeríodo de análise solicitado: ${PERIOD_PT[period]}\nAno de referência: ${currentYear}\n\nGere a série temporal exatamente assim: ${SERIE_HINT[period]}.\n\nIncluir no máximo 7 categorias em tiposFrequentes (ordenadas da maior para a menor).\nincluir todas as fontes consultadas com título e URL.\n\n===== TEXTOS COLETADOS =====\n${corpus}`;

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
    if (!data.forceRefresh && hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return hit.data;
    }

    const periodLabel = PERIOD_PT[data.period];
    const currentYear = new Date().getFullYear();
    
    // Define o filtro de tempo (tbs) baseado no período
    // qdr:w (semana), qdr:m (mês), qdr:y (ano)
    const timeFilter = data.period === "semana" ? "qdr:w" : data.period === "mes" ? "qdr:m" : "qdr:y";

    const queries = [
      { query: `site:ipea.gov.br atlas da violência ${data.city} homicídios série histórica`, scrape: true },
      { query: `site:forumseguranca.org.br anuário brasileiro segurança pública ${data.city} indicadores ${currentYear}`, scrape: true },
      { query: `Atlas da Violência Ipea FBSP ${data.city} dados oficiais`, scrape: true },
      { query: `Anuário Brasileiro de Segurança Pública FBSP ${data.city} dados oficiais`, scrape: true },
      { query: `criminalidade estatísticas ${data.city} ${periodLabel} ${currentYear}`, tbs: timeFilter, scrape: true },
      { query: `índices criminais ${data.city} ${currentYear} notícias recentes`, tbs: "qdr:m", scrape: true },
      { query: `segurança pública ${data.city} ocorrências policiais hoje`, tbs: "qdr:w", scrape: true },
      { query: `site:ssp.sp.gov.br estatística criminalidade ${data.city} ${currentYear}`, scrape: true },
      { query: `site:agenciasp.sp.gov.br índices criminais ${data.city} ${currentYear}`, scrape: true },
      { query: `site:g1.globo.com criminalidade ${data.city} ${currentYear}`, scrape: false, limit: 8 },
      { query: `site:r7.com criminalidade ${data.city} ${currentYear}`, scrape: false, limit: 8 },
      { query: `crime statistics ${data.city} Brazil ${currentYear}`, scrape: false, limit: 10 },
    ];

    let results: FirecrawlResult[] = [];
    let lastErr: unknown = null;
    for (const q of queries) {
      try {
        const payload = await firecrawlSearch(q.query, q);
        results = uniqueResults([...results, ...collectResults(payload)]);
        // Continue pesquisando para reunir fontes primárias e contexto complementar.
      } catch (e) {
        lastErr = e;
      }
    }

    if (results.length === 0) {
      throw new Error("Não foram encontradas fontes documentais para o período solicitado.");
    }
    const official = results.filter(r => {
      try { const host = new URL(r.url ?? "").hostname.toLowerCase(); return host === "ipea.gov.br" || host.endsWith(".ipea.gov.br") || host === "forumseguranca.org.br" || host.endsWith(".forumseguranca.org.br") || host.endsWith(".gov.br"); } catch { return false; }
    });
    if (official.length === 0) throw new Error("Nenhuma fonte oficial encontrada para fundamentar os índices.");
    // Fontes oficiais primeiro; notícias apenas para contexto do relatório.
    results = [...official, ...results.filter(r => !official.includes(r))];

    try {
      const report = await extractWithAI(data.city, data.period, results);
      if (!report.fontesConsultadas.some(f => { try { const h = new URL(f.url).hostname.toLowerCase(); return h === "ipea.gov.br" || h.endsWith(".ipea.gov.br") || h === "forumseguranca.org.br" || h.endsWith(".forumseguranca.org.br") || h.endsWith(".gov.br"); } catch { return false; } })) throw new Error("Relatório sem referência oficial.");
      if (report.isMocked || report.totalOcorrencias < 0 || report.serie.some(p => p.total < 0) || report.tiposFrequentes.some(p => p.total < 0)) throw new Error("Relatório inválido ou simulado.");
      report.updatedAt = Date.now();
      cache.set(key, { at: Date.now(), data: report });
      return report;
    } catch (e) {
      console.error("Falha na extração documental de índices criminais:", e);
      throw new Error("Não foi possível validar indicadores criminais nas fontes oficiais para o período solicitado.");
    }
  });
