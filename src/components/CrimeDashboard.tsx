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
  Download,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { fetchCrimeReport } from "@/lib/crime-data.functions";
import oficiais from "@/data/indicadores-oficiais-2026.json";
import patrimonioUf from "@/data/patrimonio-uf-2025.json";
import crimesUf from "@/data/crimes-uf-2025.json";
import historicoMvi from "@/data/mvi-brasil-serie-2012-2025.json";
import municipiosParana from "@/data/municipios-parana-2025.json";

type Period = "semana" | "mes" | "ano";

const PERIOD_LABEL: Record<Period, string> = {
  semana: "esta semana",
  mes: "este mês",
  ano: "este ano",
};

function nf(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

const CAPITAL_UF: Record<string, string> = {
  "São Paulo": "São Paulo", "Rio de Janeiro": "Rio de Janeiro", "Brasília": "Distrito Federal",
  "Salvador": "Bahia", "Fortaleza": "Ceará", "Belo Horizonte": "Minas Gerais",
  "Manaus": "Amazonas", "Curitiba": "Paraná", "Recife": "Pernambuco",
  "Porto Alegre": "Rio Grande do Sul", "Goiânia": "Goiás", "Belém": "Pará",
  "São Luís": "Maranhão", "Maceió": "Alagoas", "Natal": "Rio Grande do Norte",
  "Teresina": "Piauí", "João Pessoa": "Paraíba", "Aracaju": "Sergipe",
  "Cuiabá": "Mato Grosso", "Campo Grande": "Mato Grosso do Sul",
  "Florianópolis": "Santa Catarina", "Vitória": "Espírito Santo",
  "Porto Velho": "Rondônia", "Rio Branco": "Acre", "Boa Vista": "Roraima",
  "Palmas": "Tocantins", "Macapá": "Amapá",
};

const COLORS = ["#0F172A", "#E11D48", "#10B981", "#F59E0B", "#6366F1", "#EC4899", "#8B5CF6"];

export function CrimeDashboard() {
  const [city, setCity] = useState("São Paulo");
  const [municipioPR, setMunicipioPR] = useState("");
  const [municipiosPR, setMunicipiosPR] = useState<string[]>([]);
  const [erroMunicipiosPR, setErroMunicipiosPR] = useState(false);
  const [ufOficial, setUfOficial] = useState("São Paulo");
  const [buscaUf, setBuscaUf] = useState("");
  const [mesPesquisa, setMesPesquisa] = useState("todos");
  const [semanaPesquisa, setSemanaPesquisa] = useState("1");
  const [anoGrafico, setAnoGrafico] = useState<"2024" | "2025" | "2026">("2025");
  const [period, setPeriod] = useState<Period>("mes");
  const [consultarCidade, setConsultarCidade] = useState(false);
  const [cidadeConsultada, setCidadeConsultada] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const selecionarCidade = (nome: string) => {
    setCity(nome);
    setMunicipioPR(municipiosPR.includes(nome) || Object.prototype.hasOwnProperty.call(municipiosParana.dados, nome) ? nome : "");
    setConsultarCidade(false);
    setCidadeConsultada("");
    const estado = CAPITAL_UF[nome];
    if (estado) { setUfOficial(estado); setBuscaUf(""); }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/41/municipios?orderBy=nome", { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error("IBGE indisponível"); return res.json(); })
      .then((lista: { nome: string }[]) => setMunicipiosPR(lista.map(item => item.nome)))
      .catch(() => { if (!controller.signal.aborted) setErroMunicipiosPR(true); });
    return () => controller.abort();
  }, []);

  const callFn = useServerFn(fetchCrimeReport);
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["crime-report", cidadeConsultada, period],
    enabled: consultarCidade && cidadeConsultada.length >= 2,
    queryFn: () => callFn({ data: { city: cidadeConsultada, period } }),
    staleTime: 60 * 60 * 1000,
    retry: 0,
  });

  const handleRefresh = async () => {
    if (isFetching) return;
    if (!consultarCidade || !cidadeConsultada) return;
    await callFn({ data: { city: cidadeConsultada, period, forceRefresh: true } });
    refetch();
  };

  const exportarPDF = () => {
    // A impressão do navegador preserva o conteúdo e permite salvar em PDF,
    // sem enviar dados da pesquisa para serviços externos.
    window.print();
  };

  const variationUp = (data?.variacao ?? 0) >= 0;
  const loading = consultarCidade && (isLoading || isFetching);

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"><a href="/fontes-oficiais" className="inline-flex rounded-md border px-4 py-2 text-sm font-semibold hover:bg-accent">Consultar dados oficiais do Atlas e Anuário por estado →</a></div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex print:hidden flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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

        </header>

        <section className="mb-6 rounded-2xl border border-blue-100 print:hidden bg-gradient-to-br from-white to-blue-50 p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Pesquisar por estado, cidade e período</h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">Uma pesquisa única para os indicadores oficiais disponíveis.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-semibold">Estado
              <select value={ufOficial} onChange={e => {setUfOficial(e.target.value);setMunicipioPR("");setCity("");setConsultarCidade(false);}} className="mt-2 h-11 w-full rounded-xl border bg-white px-3">
                {Object.keys(oficiais.dados).sort((a,b)=>a.localeCompare(b,"pt-BR")).map(nome=><option key={nome} value={nome}>{nome}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Cidade (opcional)
              {ufOficial === "Paraná" ? <select value={municipioPR} onChange={e=>{setMunicipioPR(e.target.value);setCity(e.target.value);setConsultarCidade(false);}} className="mt-2 h-11 w-full rounded-xl border bg-white px-3">
                <option value="">Todas / dados estaduais</option>
                {(municipiosPR.length ? municipiosPR : Object.keys(municipiosParana.dados)).sort((a,b)=>a.localeCompare(b,"pt-BR")).map(nome=><option key={nome} value={nome}>{nome}</option>)}
              </select> : <input value={city} onChange={e=>{setCity(e.target.value);setConsultarCidade(false);}} placeholder="Digite a cidade" className="mt-2 h-11 w-full rounded-xl border bg-white px-3" />}
            </label>
            <label className="text-sm font-semibold">Ano
              <select value={anoGrafico} onChange={e=>setAnoGrafico(e.target.value as "2024"|"2025"|"2026")} className="mt-2 h-11 w-full rounded-xl border bg-white px-3">
                <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026 (parcial)</option>
              </select>
            </label>
            <label className="text-sm font-semibold">Período
              <select value={period} onChange={e=>setPeriod(e.target.value as Period)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3">
                <option value="ano">Ano</option><option value="mes">Mês</option><option value="semana">Semana</option>
              </select>
            </label>
            {period !== "ano" && <label className="text-sm font-semibold">Mês
              <select value={mesPesquisa} onChange={e=>setMesPesquisa(e.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3">
                <option value="todos">Selecione o mês</option>
                {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map((nome,i)=><option key={nome} value={String(i+1)}>{nome}</option>)}
              </select>
            </label>}
            {period === "semana" && <label className="text-sm font-semibold">Semana do mês
              <select value={semanaPesquisa} onChange={e=>setSemanaPesquisa(e.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3">
                {[1,2,3,4,5].map(n=><option key={n} value={String(n)}>Semana {n}</option>)}
              </select>
            </label>}
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Local: <strong>{city || ufOficial}</strong> · {anoGrafico} · {period === "ano" ? "ano inteiro" : period === "mes" ? "mês" : "semana"}</p>
          {period !== "ano" && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Ainda não há séries mensais ou semanais importadas e validadas. Os totais anuais abaixo são apenas referência e não correspondem ao período selecionado.</p>}
        </section>


        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm print:hidden">
          <p className="text-sm text-slate-600">Exporte os indicadores e gráficos exibidos, com o local, o período e as fontes.</p>
          <button type="button" onClick={exportarPDF} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700">
            <Download className="h-4 w-4" /> Baixar relatório em PDF
          </button>
        </div>
        <div className="hidden print:block">
          <h2 className="text-xl font-bold">Indicador Brasil — Relatório de Segurança Pública</h2>
          <p className="text-sm">Local: {city || ufOficial} · Estado: {ufOficial} · Ano: {anoGrafico} · Período: {period === "ano" ? "anual" : period === "mes" ? "mensal" : "semanal"}{period !== "ano" && mesPesquisa !== "todos" ? " · Mês: " + mesPesquisa : ""}{period === "semana" ? " · Semana: " + semanaPesquisa : ""}</p>
          <p className="text-xs">Gerado em: {new Date().toLocaleDateString("pt-BR")}. Dados somente para períodos com cobertura documentada.</p>
        </div>
        {/* Aviso de transparência */}
        <Card className="mb-6 border-navy/20 bg-navy/5">
          <CardContent className="flex items-start gap-3 py-3 text-xs text-navy">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Os indicadores dependem de <strong>dados oficiais documentados</strong>, com prioridade para Atlas da Violência e Anuário Brasileiro de Segurança Pública. Notícias são apenas contexto. A disponibilidade varia conforme a cidade e o período; não são gerados números fictícios.
            </span>
          </CardContent>
        </Card>

        <Card className="mb-6 border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Pesquisa municipal — Paraná</CardTitle>
            <p className="text-sm text-muted-foreground">Selecione qualquer município do Paraná. As estatísticas são exibidas somente quando os registros oficiais já foram importados e conferidos.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {erroMunicipiosPR && <p className="text-xs text-amber-700">Não foi possível carregar a lista completa do IBGE; exibindo os municípios já cadastrados.</p>}
            {municipioPR && anoGrafico === "2025" && period === "ano" && Object.prototype.hasOwnProperty.call(municipiosParana.dados, municipioPR) ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{municipioPR} · Paraná</h3>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">2025 · dados municipais</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {municipiosParana.categorias.map((nome, i) => <div key={nome} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">{nome}</p>
                    <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-900">{nf((municipiosParana.dados as Record<string, number[]>)[municipioPR][i])}</p>
                    <p className="mt-1 text-xs text-slate-500">Vítimas · jan–dez 2025</p>
                  </div>)}
                </div>
                <div className="h-64 w-full rounded-2xl border border-emerald-100 bg-white p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }} data={municipiosParana.categorias.map((nome, i) => ({ categoria: ["Homicídios", "Latrocínios", "Lesão seguida de morte", "Feminicídios"][i], total: (municipiosParana.dados as Record<string, number[]>)[municipioPR][i] }))}>
                      <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 4" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="categoria" width={118} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={value => [nf(Number(value)), "Vítimas"]} />
                      <Bar dataKey="total" fill="#059669" radius={[0, 6, 6, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-600">{municipiosParana.aviso}</p>
                <a href={municipiosParana.url} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-semibold text-emerald-800 underline underline-offset-4">Ver relatório oficial da SESP-PR · Tabela 01</a>
              </div>
            ) : municipioPR ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2"><p className="text-sm font-semibold text-amber-900">Ainda não há indicadores municipais validados para {municipioPR} no ano e período selecionados.</p><p className="text-sm text-amber-800">A cidade está disponível na pesquisa, mas não exibimos números de outro município ou do estado como se fossem locais. Consulte os relatórios da SESP-PR enquanto a importação é ampliada.</p><a className="text-sm font-semibold text-amber-900 underline" href="https://www.seguranca.pr.gov.br/CAPE/Estatisticas" target="_blank" rel="noopener noreferrer">Consultar estatísticas oficiais da SESP-PR</a></div> : <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Escolha um município. A lista completa é carregada do IBGE; indicadores serão exibidos para os municípios já validados.</p>}
          </CardContent>
        </Card>

        <Card className="mb-6 border-border/70">
          <CardHeader><CardTitle>Dados oficiais disponíveis — Brasil e estados</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Consulta independente da pesquisa municipal. MVI do Anuário Brasileiro de Segurança Pública 2026; dados referentes a 2024 e 2025. Os números abaixo são do ESTADO selecionado, nunca da cidade.</p>
            {period === "ano" ? <>
            <section className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">Indicadores de 2026 (dados parciais)</h3>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">Ano em andamento · dados parciais</span>
              </div>
              {ufOficial === "São Paulo" && anoGrafico === "2026" ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-slate-600">Estado de São Paulo · janeiro a agosto de 2026 · dados divulgados pela SSP-SP</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white bg-white/90 p-4">
                      <p className="text-xs font-semibold text-slate-500">Vítimas de homicídio doloso (jan–ago)</p>
                      <p className="mt-1 text-3xl font-extrabold tabular-nums text-indigo-900">1.549</p>
                    </div>
                    <div className="rounded-xl border border-white bg-white/90 p-4">
                      <p className="text-xs font-semibold text-slate-500">Ocorrências de homicídio doloso (jan–ago)</p>
                      <p className="mt-1 text-3xl font-extrabold tabular-nums text-sky-800">1.491</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">Homicídio doloso não é o mesmo indicador que Mortes Violentas Intencionais (MVI). Estes valores são parciais, não representam o ano completo nem apenas a cidade de São Paulo.</p>
                  <a className="inline-flex text-sm font-semibold text-indigo-700 underline underline-offset-4" href="https://www.geo.ssp.sp.gov.br/estatistica/dados-mensais" target="_blank" rel="noopener noreferrer">Consultar publicação oficial da SSP-SP</a>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-slate-600">Ainda não importamos um conjunto validado de indicadores parciais de 2026 para {ufOficial}. Os dados de 2024 e 2025 abaixo permanecem disponíveis.</p>
                  <a className="inline-flex text-sm font-semibold text-indigo-700 underline underline-offset-4" href="https://dados.mj.gov.br/dataset/sistema-nacional-de-estatisticas-de-seguranca-publica" target="_blank" rel="noopener noreferrer">Consultar a base oficial Sinesp por estado e município</a>
                </div>
              )}
            </section>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
              <p className="font-bold text-slate-900">O que são Mortes Violentas Intencionais (MVI)?</p>
              <p className="mt-1">É o total de vítimas de mortes provocadas intencionalmente, incluindo homicídio doloso, latrocínio (roubo seguido de morte), lesão corporal seguida de morte e mortes decorrentes de intervenções policiais. Não é apenas a contagem de homicídios.</p>
              <p className="mt-2 text-xs">A taxa por 100 mil habitantes permite comparar localidades de tamanhos diferentes. Os números abaixo se referem ao estado selecionado; os anos de 2024 e 2025 são históricos e não devem ser interpretados como resultados de 2026.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { titulo: "Mortes violentas intencionais — 2024", valor: nf((oficiais.dados as Record<string, number[]>)[ufOficial][0]), estilo: "border-slate-200 bg-gradient-to-br from-slate-50 to-white text-slate-900" },
                { titulo: "Mortes violentas intencionais — 2025", valor: nf((oficiais.dados as Record<string, number[]>)[ufOficial][1]), estilo: "border-rose-200 bg-gradient-to-br from-rose-50 to-white text-rose-800" },
                { titulo: "Mortes violentas por 100 mil habitantes — 2025", valor: (oficiais.dados as Record<string, number[]>)[ufOficial][3].toLocaleString("pt-BR"), estilo: "border-blue-200 bg-gradient-to-br from-blue-50 to-white text-blue-900" },
              ].map(item => (
                <div key={item.titulo} className={`rounded-2xl border p-5 shadow-sm ${item.estilo}`}>
                  <p className="text-xs font-semibold tracking-wide opacity-75">{item.titulo}</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums">{item.valor}</p>
                  <p className="mt-1 text-xs opacity-70">Abrangência: {ufOficial}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="min-w-0 rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/50 p-4 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Mortes violentas intencionais (MVI)</h3>
                    <p className="mt-1 text-xs text-slate-500">{ufOficial} · vítimas · ano selecionado: {anoGrafico}</p>
                  </div>
                  {(() => {
                    const v = (oficiais.dados as Record<string, number[]>)[ufOficial];
                    const variacao = v[0] > 0 ? ((v[1] - v[0]) / v[0]) * 100 : null;
                    return <span className={`rounded-full px-3 py-1 text-xs font-bold ${variacao === null ? "bg-slate-100 text-slate-600" : variacao <= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                      {variacao === null ? "Sem comparação" : `${variacao > 0 ? "+" : ""}${variacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. 2024`}
                    </span>;
                  })()}
                </div>
                {anoGrafico === "2026" ? <div className="mt-5 flex h-64 items-center justify-center rounded-xl bg-white p-5 text-center text-sm text-slate-600">Ainda não há dados de mortes violentas intencionais (MVI) de 2026 com a mesma definição e abrangência nesta base. Consulte a seção de indicadores parciais de 2026.</div> : <div className="mt-5 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart margin={{ top: 22, right: 10, left: 0, bottom: 0 }} barCategoryGap="42%" data={[{ ano: anoGrafico, total: (oficiais.dados as Record<string, number[]>)[ufOficial][anoGrafico === "2024" ? 0 : 1] }]}>
                      <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 4" />
                      <XAxis dataKey="ano" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={nf} width={60} />
                      <Tooltip formatter={(value) => [nf(Number(value)), "Vítimas"]} cursor={{ fill: "#fff1f2" }} />
                      <Bar dataKey="total" fill="#e11d48" radius={[8, 8, 0, 0]} maxBarSize={92} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>}
                <p className="mt-2 text-xs text-slate-500">Fonte: Anuário Brasileiro de Segurança Pública 2026 · Tabela 02</p>
              </section>
              <section className="min-w-0 rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/40 p-4 shadow-sm sm:p-6">
                <h3 className="text-base font-bold text-slate-900">Roubos e furtos</h3>
                <p className="mt-1 text-xs text-slate-500">{ufOficial} · ocorrências de veículos e celulares · {anoGrafico}</p>
                {anoGrafico !== "2025" ? <div className="mt-5 flex h-64 items-center justify-center rounded-xl bg-white p-5 text-center text-sm text-slate-600">Os dados patrimoniais de {anoGrafico} ainda não foram importados. Selecione 2025 para visualizar roubos e furtos com fonte verificada.</div> : <div className="mt-5 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" margin={{ top: 5, right: 12, left: 8, bottom: 0 }} data={patrimonioUf.campos.map((campo, i) => ({ categoria: campo.replaceAll("_", " "), total: (patrimonioUf.dados as Record<string, number[]>)[ufOficial]?.[i] ?? 0 }))}>
                      <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 4" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={nf} />
                      <YAxis type="category" dataKey="categoria" width={108} axisLine={false} tickLine={false} tick={{ fill: "#475569", fontSize: 11 }} />
                      <Tooltip formatter={(value) => [nf(Number(value)), "Registros"]} cursor={{ fill: "#eff6ff" }} />
                      <Bar dataKey="total" fill="#2563eb" radius={[0, 7, 7, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>}
                <p className="mt-2 text-xs text-slate-500">Fonte: Anuário Brasileiro de Segurança Pública 2026 · Tabelas 11 e 12</p>
              </section>
            </div>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="text-base font-bold text-slate-900">Categorias criminais — {ufOficial} · {anoGrafico}</h3>
              <p className="mt-1 text-xs text-slate-500">2025 · quantidades absolutas; categorias podem se sobrepor e não devem ser somadas.</p>
              {anoGrafico !== "2025" ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Categorias detalhadas de {anoGrafico} ainda não importadas. Selecione 2025.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {crimesUf.categorias.map((cat, i) => {
                  const valor = (crimesUf.dados as Record<string, (number | null)[]>)[ufOficial]?.[i];
                  return <div key={cat.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="text-xs font-medium capitalize text-slate-500">{cat.id.replaceAll("_", " ")}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{valor == null ? "Não informado" : nf(valor)}</p>
                    <p className="mt-1 text-xs text-slate-400">Anuário 2026 · Tabela {cat.tabela}</p>
                  </div>;
                })}
              </div>}
            </section>
            {ufOficial === "Brasil" && <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-base font-semibold">Série histórica nacional de MVI (2012–2025)</h3>
              <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicoMvi.serie}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="ano" /><YAxis tickFormatter={nf} width={65} /><Tooltip formatter={(value) => nf(Number(value))} /><Line type="monotone" dataKey="total" name="Vítimas" stroke="#334155" strokeWidth={2} dot={false} /></LineChart>
              </ResponsiveContainer></div>
            </div>}
            </> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Nenhum gráfico mensal ou semanal verificado foi importado para este local e período. Selecione “Ano” para consultar os dados anuais disponíveis.</div>}
            <p className="text-xs text-muted-foreground">Fonte: Anuário Brasileiro de Segurança Pública 2026, tabelas 02, 11, 12, 17, 21, 24, 29 e 31. Dados estaduais/nacionais, não municipais. A pesquisa municipal abaixo depende de fontes próprias.</p>
            <a href="/fontes-oficiais" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Ver todas as categorias oficiais</a>
          </CardContent>
        </Card>

        <Card className="mb-6 border-border/70">
          <CardContent className="space-y-3 py-4">
            <p className="text-sm font-semibold">Consulta municipal experimental</p>
            <p className="text-sm text-muted-foreground">Os dados oficiais por estado já aparecem acima, sem depender de serviços externos. Para tentar pesquisar estatísticas específicas de {city}, use o botão abaixo. Algumas cidades e períodos não possuem dados públicos compatíveis, e a consulta pode falhar.</p>
            <button type="button" onClick={() => { setCidadeConsultada(city); setConsultarCidade(true); }} disabled={loading} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Pesquisar dados municipais de {city}</button>
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

        {consultarCidade && isError && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="rounded-full bg-danger/10 p-4 mb-4">
              <ShieldAlert className="h-10 w-10 text-danger" />
            </div>
            <h2 className="text-2xl font-bold text-navy mb-2">Sem dados disponíveis</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Não foi possível validar um relatório municipal completo para <strong>{cidadeConsultada}</strong> no período selecionado.
              Isso pode ocorrer por ausência de estatísticas municipais oficiais, falha no serviço de busca ou indisponibilidade da IA. Não usamos dados estaduais como se fossem municipais. Consulte os indicadores oficiais por estado acima enquanto a integração municipal não está disponível.
            </p>
            <button 
              onClick={() => refetch()} 
              className="inline-flex items-center justify-center rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy/90 transition-colors"
            >
              Tentar novamente
            </button>
            <a href="/fontes-oficiais" className="mt-4 inline-flex rounded-md border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-accent">Consultar dados oficiais por estado</a>
          </div>
        )}

        {consultarCidade && !isError && data?.isMocked && (
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
        {consultarCidade && !isError && (
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
