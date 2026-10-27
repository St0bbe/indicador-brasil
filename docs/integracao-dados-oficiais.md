# Integração de dados oficiais — contrato e cobertura

## Fontes verificadas

- Sinesp VDE (Ministério da Justiça): https://dados.mj.gov.br/dataset/sistema-nacional-de-estatisticas-de-seguranca-publica — indicadores por município e UF; frequência mensal na base VDE. Dados podem ser retificados.
- SESP-PR/CAPE: https://www.seguranca.pr.gov.br/CAPE/Estatisticas — relatórios municipais complementares.
- TCE-PR: https://tce.pr.gov.br/noticias/painel-revela-estrutura-e-investimentos-dos-municipios-do-parana-na-seguranca-publica.htm — painel com dados SESP-PR dos 399 municípios, a partir de 2020.

## Contrato mínimo para importação

Cada observação deve conter:

```json
{
  "codigo_ibge": "4106902",
  "municipio": "Curitiba",
  "uf": "PR",
  "ano": 2025,
  "mes": 1,
  "indicador": "homicidio_doloso_vitimas",
  "valor": null,
  "unidade": "vitimas",
  "fonte": "Sinesp VDE",
  "url_fonte": "https://dados.mj.gov.br/dataset/sistema-nacional-de-estatisticas-de-seguranca-publica",
  "data_extracao": null,
  "situacao": "nao_importado"
}
```

O exemplo acima é um **modelo de estrutura**, não um dado real. Valores ausentes devem permanecer nulos, nunca zero.

## Regras de qualidade

1. Validar código IBGE + UF + município para evitar homônimos.
2. Armazenar fonte, URL, competência, data de extração, unidade e definição do indicador.
3. Não misturar homicídio doloso, MVI e CVLI como se fossem a mesma categoria.
4. Não derivar estatísticas semanais de planilhas mensais; semanas exigem registros datados ou fonte semanal.
5. Exibir 2026 como parcial e mostrar o último mês efetivamente disponível.
6. Não reutilizar dados estaduais como se fossem municipais.
7. Impedir somas entre categorias potencialmente sobrepostas.
8. Registrar retificações e nunca substituir ausência por zero.
9. Manter séries anuais como referência explicitamente separada dos filtros mensais e semanais.
10. Só marcar um dado como validado após comparar os totais da importação com a fonte.

## Situação

A pesquisa e os gráficos anuais já existem no painel. A carga nacional municipal/mensal **não foi concluída**: requer baixar, inspecionar e normalizar os arquivos oficiais, validar suas colunas e publicar um dataset versionado. O link de municípios XLSX listado no portal tem atualização indicada de abril de 2023 e não deve ser tratado automaticamente como base atual de 2026.
