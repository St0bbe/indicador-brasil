import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import oficiais from "@/data/indicadores-oficiais-2026.json";

export const Route = createFileRoute("/fontes-oficiais")({
  component: FontesOficiais,
});

type Linha = [number, number, number, number, number];
const dados = oficiais.dados as Record<string, Linha>;
const nf = (v: number, digits = 0) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);

function FontesOficiais() {
  const [uf, setUf] = useState("Brasil");
  const [busca, setBusca] = useState("");
  const valores = dados[uf];
  const variacao = ((valores[1] / valores[0]) - 1) * 100;
  const opcoes = Object.keys(dados).filter(nome =>
    nome.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))
  );
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <a href="/" className="text-sm underline">Voltar ao painel</a>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Indicadores oficiais de violência</h1>
        <p className="text-muted-foreground">Dados transcritos das publicações de 2026. Abrangência: Brasil e unidades da federação. Não representam estatísticas municipais nem ocorrências semanais ou mensais.</p>
      </header>
      <div className="space-y-2">
        <label htmlFor="busca-uf" className="block font-medium">Pesquisar estado ou Brasil</label>
        <input id="busca-uf" className="w-full rounded-md border bg-background p-3" placeholder="Filtrar unidades da federação" value={busca} onChange={e => setBusca(e.target.value)} />
        <select aria-label="Selecionar unidade da federação" className="w-full rounded-md border bg-background p-3" value={uf} onChange={e => setUf(e.target.value)}>
          {!opcoes.includes(uf) && <option value={uf}>{uf}</option>}
          {opcoes.map(nome => <option key={nome} value={nome}>{nome}</option>)}
        </select>
      </div>
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border p-4"><h2 className="text-sm text-muted-foreground">MVI em 2025</h2><p className="text-3xl font-bold">{nf(valores[1])}</p><p className="text-sm">vítimas, números absolutos</p></article>
        <article className="rounded-lg border p-4"><h2 className="text-sm text-muted-foreground">Taxa MVI em 2025</h2><p className="text-3xl font-bold">{nf(valores[3],1)}</p><p className="text-sm">por 100 mil habitantes</p></article>
        <article className="rounded-lg border p-4"><h2 className="text-sm text-muted-foreground">Variação MVI 2024–2025</h2><p className="text-3xl font-bold">{nf(variacao,1)}%</p><p className="text-sm">calculada a partir dos números absolutos</p></article>
      </section>
      <section className="rounded-lg border p-5">
        <h2 className="mb-4 text-xl font-semibold">Comparação entre publicações</h2>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Indicador</th><th className="p-2">2024</th><th className="p-2">2025</th><th className="p-2">Fonte</th></tr></thead><tbody>
          <tr className="border-b"><td className="p-2">Mortes Violentas Intencionais (MVI), total</td><td className="p-2">{nf(valores[0])}</td><td className="p-2">{nf(valores[1])}</td><td className="p-2">Anuário, tabela 02</td></tr>
          <tr className="border-b"><td className="p-2">MVI por 100 mil habitantes</td><td className="p-2">{nf(valores[2],1)}</td><td className="p-2">{nf(valores[3],1)}</td><td className="p-2">Anuário, tabela 02</td></tr>
          <tr><td className="p-2">Homicídios registrados por 100 mil habitantes</td><td className="p-2">{nf(valores[4],1)}</td><td className="p-2">Não disponível nesta edição</td><td className="p-2">Atlas, tabela 2.1</td></tr>
        </tbody></table></div>
      </section>
      <section className="space-y-2 text-sm text-muted-foreground">
        <p><strong>Metodologia:</strong> MVI são indicadores policiais compilados pelo FBSP; homicídios registrados do Atlas são baseados no SIM/MS. Não devem ser somados nem comparados como se fossem o mesmo indicador. Os anos indicam o período dos dados, não o ano de publicação.</p>
        <p><strong>Fontes:</strong> <a className="underline" href="https://publicacoes.forumseguranca.org.br/handle/fbsp/305" target="_blank" rel="noreferrer">Anuário Brasileiro de Segurança Pública 2026 (tabela 02, pp. 29–30)</a> e <a className="underline" href="https://www.ipea.gov.br/atlasviolencia/" target="_blank" rel="noreferrer">Atlas da Violência 2026 (tabela 2.1, p. 16)</a>.</p>
        <p>Notícias e pesquisas web permanecem no painel principal como informação complementar; não alteram estes valores oficiais.</p>
      </section>
    </main>
  );
}
