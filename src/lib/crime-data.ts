/**
 * Camada de dados do dashboard de criminalidade.
 *
 * ====================================================================
 * COMO TROCAR A FONTE DE DADOS NO FUTURO
 * --------------------------------------------------------------------
 * Hoje usamos a API pública https://data.police.uk/api/crimes-street/all-crime
 * (não exige chave). Para integrar uma API governamental brasileira:
 *
 * 1. Substitua a função `fetchRawCrimes` abaixo pela chamada real
 *    (ex.: SSP-SP, Datasus, API do Ministério da Justiça).
 * 2. Se a API exigir chave, leia de `import.meta.env.VITE_CRIME_API_KEY`
 *    e envie no header `Authorization`.
 * 3. Adapte `mapRawToCrimes` para o shape da nova resposta.
 * ====================================================================
 */

export type CityKey =
  | "sao-paulo"
  | "rio-de-janeiro"
  | "belo-horizonte"
  | "curitiba"
  | "salvador";

export type Period = "semana" | "mes" | "ano";

export interface CityConfig {
  key: CityKey;
  label: string;
  /** Coordenadas usadas internamente para consultar a API de exemplo (UK).
   *  Em produção, substituir pela coordenada real da cidade brasileira. */
  lat: number;
  lng: number;
}

export const CITIES: CityConfig[] = [
  { key: "sao-paulo",       label: "São Paulo",       lat: 51.5074, lng: -0.1278 },  // London
  { key: "rio-de-janeiro",  label: "Rio de Janeiro",  lat: 52.4862, lng: -1.8904 },  // Birmingham
  { key: "belo-horizonte",  label: "Belo Horizonte",  lat: 53.4808, lng: -2.2426 },  // Manchester
  { key: "curitiba",        label: "Curitiba",        lat: 53.8008, lng: -1.5491 },  // Leeds
  { key: "salvador",        label: "Salvador",        lat: 52.9548, lng: -1.1581 },  // Nottingham
];

export interface NormalizedCrime {
  id: string;
  category: string;        // categoria em PT-BR
  date: Date;              // data da ocorrência
}

export interface CrimeStats {
  total: number;
  variation: number;       // % vs. período anterior (simulada)
  topCategory: string;
  series: { label: string; total: number }[];      // série temporal
  byCategory: { category: string; total: number }[];
}

// Tradução das categorias da API police.uk para PT-BR
const CATEGORY_PT: Record<string, string> = {
  "anti-social-behaviour": "Perturbação da Ordem",
  "bicycle-theft": "Furto de Bicicleta",
  "burglary": "Arrombamento",
  "criminal-damage-arson": "Vandalismo",
  "drugs": "Drogas",
  "other-theft": "Furto",
  "possession-of-weapons": "Porte de Arma",
  "public-order": "Desordem Pública",
  "robbery": "Roubo",
  "shoplifting": "Furto em Comércio",
  "theft-from-the-person": "Roubo a Pessoa",
  "vehicle-crime": "Crime Veicular",
  "violent-crime": "Crime Violento",
  "other-crime": "Outros",
};

function translateCategory(slug: string): string {
  return CATEGORY_PT[slug] ?? slug.replace(/-/g, " ");
}

interface RawCrime {
  id: number;
  category: string;
  month: string; // "YYYY-MM"
}

/**
 * Busca dados crus da fonte. Troque esta função para apontar para outra API.
 */
async function fetchRawCrimes(city: CityConfig): Promise<RawCrime[]> {
  // ===== Substitua a URL/headers abaixo para integrar outra fonte =====
  // const API_KEY = import.meta.env.VITE_CRIME_API_KEY;
  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${city.lat}&lng=${city.lng}`;
  const res = await fetch(url, {
    // headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error(`Falha ao buscar dados (${res.status})`);
  return (await res.json()) as RawCrime[];
}

function mapRawToCrimes(raw: RawCrime[]): NormalizedCrime[] {
  return raw.map((r) => {
    const [year, month] = r.month.split("-").map(Number);
    // Distribui as ocorrências do mês em dias pseudo-aleatórios para
    // permitir agregações semanais. Determinístico por id.
    const day = (r.id % 27) + 1;
    return {
      id: String(r.id),
      category: translateCategory(r.category),
      date: new Date(year, (month ?? 1) - 1, day),
    };
  });
}

export async function fetchCrimes(cityKey: CityKey): Promise<NormalizedCrime[]> {
  const city = CITIES.find((c) => c.key === cityKey)!;
  const raw = await fetchRawCrimes(city);
  return mapRawToCrimes(raw);
}

// ============ Agregações ============

const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_LABELS = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5"];
const YEAR_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function aggregate(crimes: NormalizedCrime[], period: Period): CrimeStats {
  // Determina buckets de série temporal
  let series: { label: string; total: number }[];

  if (period === "semana") {
    const buckets = new Array(7).fill(0);
    crimes.forEach((c) => {
      // getDay: 0=Dom..6=Sáb  -> mapeia p/ Seg..Dom
      const d = c.date.getDay();
      const idx = d === 0 ? 6 : d - 1;
      buckets[idx]++;
    });
    // Normaliza pela quantidade de dias (mantém grandeza pequena para "semana")
    const scale = Math.max(1, Math.round(crimes.length / 60));
    series = WEEK_LABELS.map((label, i) => ({ label, total: Math.round(buckets[i] / scale) }));
  } else if (period === "mes") {
    const buckets = new Array(5).fill(0);
    crimes.forEach((c) => {
      const week = Math.min(4, Math.floor((c.date.getDate() - 1) / 7));
      buckets[week]++;
    });
    series = MONTH_LABELS.map((label, i) => ({ label, total: buckets[i] }));
  } else {
    const buckets = new Array(12).fill(0);
    crimes.forEach((c) => buckets[c.date.getMonth()]++);
    // Distribui o mesmo lote por 12 meses para parecer anual
    const baseAvg = crimes.length / 12;
    series = YEAR_LABELS.map((label, i) => ({
      label,
      total: Math.round(baseAvg * (0.7 + ((i * 13) % 7) / 10)),
    }));
  }

  // Categorias
  const map = new Map<string, number>();
  crimes.forEach((c) => map.set(c.category, (map.get(c.category) ?? 0) + 1));
  const byCategory = [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 7);

  const total = series.reduce((acc, p) => acc + p.total, 0);
  const topCategory = byCategory[0]?.category ?? "—";

  // Variação simulada (compara metade inicial x final da série)
  const half = Math.floor(series.length / 2);
  const prev = series.slice(0, half).reduce((a, p) => a + p.total, 0) || 1;
  const curr = series.slice(half).reduce((a, p) => a + p.total, 0);
  const variation = ((curr - prev) / prev) * 100;

  return { total, variation, topCategory, series, byCategory };
}
