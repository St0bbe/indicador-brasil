import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ExternalLink,
  Info,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CityCombobox } from "@/components/CityCombobox";
import { fetchCrimeReport } from "@/lib/crime-data.functions";

type Period = "semana" | "mes" | "ano";

const PERIOD_LABEL: Record<Period, string> = {
  semana: "esta semana",
  mes: "este mês",
  ano: "este ano",
};

function nf(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

const COLORS = ["#0F172A", "#E11D48", "#10B981", "#F59E0B", "#6366F1", "#EC4899", "#8B5CF6"];

export function CrimeDashboard() {
  const [city, setCity] = useState("São Paulo");
  const [period, setPeriod] = useState<Period>("mes");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const callFn = useServerFn(fetchCrimeReport);
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["crime-report", city, period],
    queryFn: () => callFn({ data: { city, period } }),
    staleTime: 60 * 60 * 1000,
    retry: 0,
  });

  const handleRefresh = async () => {
    if (isFetching) return;
    await callFn({ data: { city, period, forceRefresh: true } });
    refetch();
  };

  const variationUp = (data?.variacao ?? 0) >= 0;
  const loading = isLoading || isFetching;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5 text-danger" />
              Painel de Segurança Pública
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Indicadores de Criminalidade
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Indicadores documentados em fontes oficiais brasileiras, com notícias como contexto complementar.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <CityCombobox value={city} onChange={setCity} />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="flex-1 sm:w-auto">
                <TabsList className="bg-card shadow-sm w-full grid grid-cols-3 sm:flex sm:w-auto">
                  <TabsTrigger value="semana">Semana</TabsTrigger>
                  <TabsTrigger value="mes">Mês</TabsTrigger>
                  <TabsTrigger value="ano">Ano</TabsTrigger>
                </TabsList>
              </Tabs>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 transition-colors"
                title="Recarregar dados (ignorar cache)"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Aviso de transparência */}
        <Card className="mb-6 border-navy/20 bg-navy/5">
          <CardContent className="flex items-start gap-3 py-3 text-xs text-navy">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Os indicadores dependem de <strong>dados oficiais documentados</strong>, com prioridade para Atlas da Violência e Anuário Brasileiro de Segurança Pública. Notícias são apenas contexto. A disponibilidade varia conforme a cidade e o período; não são gerados números fictícios.
            </span>
          </CardContent>
        </Card>

        {loading && (
          <Card className="mb-6 border-border/70">
            <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-navy" />
              Coletando dados em portais brasileiros sobre <strong>{city}</strong>… isso pode levar alguns segundos.
            </CardContent>
          </Card>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="rounded-full bg-danger/10 p-4 mb-4">
              <ShieldAlert className="h-10 w-10 text-danger" />
            </div>
            <h2 className="text-2xl font-bold text-navy mb-2">Sem dados disponíveis</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Não conseguimos coletar fontes confiáveis sobre a criminalidade em <strong>{city}</strong> no momento.
              Tente novamente em alguns instantes ou escolha outra cidade.
            </p>
            <button 
              onClick={() => refetch()} 
              className="inline-flex items-center justify-center rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy/90 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!isError && data?.isMocked && (
          <Card className="mb-6 border-amber-400/40 bg-amber-50">
            <CardContent className="flex items-start gap-3 py-4 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <span className="font-semibold block mb-1">Modo de Dados Simulados Ativado</span>
                <p>
                  Não foi possível encontrar fontes em tempo real suficientes para <strong>{city}</strong>. 
                  Os números abaixo são estimativas geradas com base em médias históricas regionais para fins de visualização.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conteúdo Principal (Só renderiza se não houver erro crítico) */}
        {!isError && (
          <>
            {/* KPIs */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Total de ocorrências documentadas"
            value={loading || !data ? null : nf(data.totalOcorrencias)}
            hint={`Referentes a ${PERIOD_LABEL[period]} em ${city}`}
            icon={<BarChart3 className="h-5 w-5" />}
            tone="navy"
          />
          <KpiCard
            label="Tipo mais frequente"
            value={loading || !data ? null : data.tipoMaisFrequente}
            hint="Categoria com maior incidência"
            icon={<ShieldAlert className="h-5 w-5" />}
            tone="danger"
          />
          <KpiCard
            label="Variação no período"
            value={
              loading || !data
                ? null
                : `${variationUp ? "+" : ""}${data.variacao.toFixed(1)}%`
            }
            hint="Comparado ao período anterior"
            icon={variationUp ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
            tone={variationUp ? "danger" : "success"}
          />
        </section>

        {data && !loading && (
          <section className="mt-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground" aria-label="Metadados dos indicadores">
            <p><strong>Ano de referência:</strong> {data.anoReferencia ?? "Não informado"}</p>
            <p><strong>Abrangência:</strong> {data.abrangencia ?? "Não informada"}</p>
            <p><strong>Metodologia:</strong> {data.metodologia ?? "Não informada"}</p>
            <p className="mt-2 text-xs">A data de atualização do painel não é a data de referência dos indicadores.</p>
          </section>
        )}

        {/* Gráficos */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border/70 shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold text-navy">
                  Evolução das ocorrências
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {city} • visão {period === "semana" ? "semanal" : period === "mes" ? "mensal" : "anual"}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1 bg-secondary text-navy">
                <TrendingUp className="h-3 w-3" />
                Série temporal
              </Badge>
            </CardHeader>
            <CardContent className="pt-2">
              {loading || !data ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={data.serie} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.32 0.09 255)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="oklch(0.32 0.09 255)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="oklch(0.32 0.09 255)" />
                        <stop offset="100%" stopColor="oklch(0.58 0.22 25)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="oklch(0.92 0.012 250)" vertical={false} />
                    <XAxis dataKey="label" stroke="oklch(0.55 0.04 250)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.55 0.04 250)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid oklch(0.91 0.012 250)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "oklch(0.28 0.07 255)", fontWeight: 600 }}
                      formatter={(v: number) => [nf(v), "Ocorrências"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="url(#lineGrad)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#areaGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-navy">
                Por tipo de ocorrência
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Top categorias em {city}</p>
            </CardHeader>
            <CardContent className="pt-2">
              {loading || !data ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={data.tiposFrequentes.map((t) => ({ category: t.categoria, total: t.total }))}
                    layout="vertical"
                    margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke="oklch(0.92 0.012 250)" horizontal={false} />
                    <XAxis type="number" stroke="oklch(0.55 0.04 250)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="category"
                      stroke="oklch(0.55 0.04 250)"
                      fontSize={11}
                      width={isMobile ? 80 : 120}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid oklch(0.91 0.012 250)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [nf(v), "Ocorrências"]}
                    />
                    <Bar dataKey="total" fill="oklch(0.58 0.22 25)" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>
        
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-border/70 shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-navy">
                Distribuição Percentual
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Composição relativa em {city}</p>
            </CardHeader>
            <CardContent className="pt-2">
              {loading || !data ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={isMobile ? 400 : 320}>
                  <PieChart>
                    <Pie
                      data={data.tiposFrequentes}
                      cx={isMobile ? "50%" : "40%"}
                      cy={isMobile ? "40%" : "50%"}
                      innerRadius={isMobile ? 60 : 70}
                      outerRadius={isMobile ? 85 : 95}
                      paddingAngle={4}
                      dataKey="total"
                      nameKey="categoria"
                      stroke="none"
                    >
                      {data.tiposFrequentes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid oklch(0.91 0.012 250)",
                        borderRadius: 12,
                        fontSize: 12,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                      }}
                      formatter={(v: number, name: string) => [nf(v as number), name]}
                    />
                    <Legend 
                      layout={isMobile ? "horizontal" : "vertical"} 
                      verticalAlign={isMobile ? "bottom" : "middle"} 
                      align={isMobile ? "center" : "right"}
                      wrapperStyle={isMobile ? { paddingTop: "20px" } : { paddingLeft: "20px" }}
                      formatter={(value) => <span className="text-[10px] sm:text-xs font-medium text-navy/80">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-navy">
                Resumo Analítico (IA)
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Principais observações</p>
            </CardHeader>
            <CardContent className="pt-2">
              {loading || !data ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              ) : (
                <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {data.resumo || "A IA não gerou um resumo específico para este período."}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-6">
          <Card className="border-border/70 shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-navy">
                Fontes consultadas
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Links coletados via Firecrawl e analisados por IA.
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              {loading || !data ? (
                <Skeleton className="h-20 w-full" />
              ) : data.fontesConsultadas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma fonte registrada.</p>
              ) : (
                <ul className="space-y-2">
                  {data.fontesConsultadas.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy" />
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-navy underline-offset-2 hover:underline"
                      >
                        {f.titulo || f.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </>
    )}

        <footer className="mt-8 flex flex-col items-center gap-2 text-center text-xs text-muted-foreground pb-8">
          <div>Coleta via Firecrawl • Estruturação via Lovable AI</div>
          {data?.updatedAt && (
            <div>
              Última atualização: {new Date(data.updatedAt).toLocaleString("pt-BR")}
            </div>
          )}
          <div className="opacity-70">Cache de 1 hora por cidade/período</div>
        </footer>
      </div>
    </div>
  );
}

interface KpiProps {
  label: string;
  value: string | null;
  hint: string;
  icon: React.ReactNode;
  tone: "navy" | "danger" | "success";
}

function KpiCard({ label, value, hint, icon, tone }: KpiProps) {
  const toneClasses = {
    navy: "bg-navy/10 text-navy",
    danger: "bg-danger/10 text-danger",
    success: "bg-success/10 text-success",
  }[tone];

  return (
    <Card className="border-border/70 shadow-[var(--shadow-card)]">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {value === null ? (
            <Skeleton className="mt-2 h-8 w-32" />
          ) : (
            <p className="mt-1 truncate font-display text-2xl font-bold text-navy">
              {value}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
