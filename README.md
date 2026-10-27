# Indicadores Criminais

Atue como um Desenvolvedor Full-Stack Sênior especializado em Dashboards de Dados.

Objetivo: Criar um "Dashboard de Indicadores de Criminalidade" moderno e interativo usando React, Tailwind CSS, Lucide React (ícones), Shadcn/UI (componentes) e Recharts (gráficos).

REGRA CRUCIAL DE IDIOMA: Toda a interface do usuário (títulos, botões, legendas, nomes de cidades e tooltips) DEVE estar em Português do Brasil (PT-BR).

Funcionalidades Principais:

Seleção de Localidade: Um seletor (Select ou Combobox) elegante para escolher entre pelo menos 5 cidades (ex: São Paulo, Rio de Janeiro, Belo Horizonte, Curitiba e Salvador).

Filtros Temporais: Botões de alternância (Tabs ou Toggle Group) para filtrar a visualização por: Semana, Mês e Ano.

Consumo de Dados Reais (Simulação Funcional):

Configure uma estrutura de busca de dados (fetch) preparada para APIs.

Como exemplo funcional imediato, use a API pública https://data.police.uk/api/crimes-street/all-crime mapeando as coordenadas das cidades selecionadas para locais reais que retornem dados (por exemplo, mapeie internamente "São Paulo" para uma coordenada de Londres para que o gráfico não fique vazio, mas exiba "São Paulo" na tela para o usuário).

Visualização Gráfica:

Gráfico de Linha Principal: Evolução dos crimes ao longo do tempo (Semanal/Mensal/Anual).

Gráfico de Barras Lateral: Comparativo por tipo de ocorrência (ex: Roubo, Furto, Vandalismo).

Cartões de Resumo (KPIs): Total de ocorrências no período, Tipo de crime mais frequente e Variação percentual em relação ao período anterior.

Design e Estética:

Estilo "Dashboard Executivo" com fundo levemente acinzentado e cartões brancos com bordas suaves.

Use uma paleta de cores profissional: Tons de Azul Marinho, Ardósia e acentos em Vermelho/Laranja para alertas de criminalidade.

Responsividade total para dispositivos móveis e desktop.

Adicione estados de "Carregando" (Skeleton screens) enquanto os dados são processados.

Instruções Adicionais: O código deve ser limpo, modular e incluir comentários explicando onde posso inserir uma chave de API ou trocar a URL da fonte de dados governamental no futuro.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://indicador-brasil.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4c186fa6-4e75-49d0-8de3-04efb57a40f9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
