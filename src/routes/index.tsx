import { createFileRoute } from "@tanstack/react-router";
import { CrimeDashboard } from "@/components/CrimeDashboard";

export const Route = createFileRoute("/")({
  component: CrimeDashboard,
  head: () => ({
    meta: [
      { title: "Indicadores de Criminalidade | Painel de Segurança Pública" },
      {
        name: "description",
        content:
          "Painel de indicadores oficiais de criminalidade por estado e município, com filtros por ano e mês.",
      },
    ],
  }),
});
