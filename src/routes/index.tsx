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
          "Dashboard executivo de indicadores de criminalidade por cidade, com filtros por semana, mês e ano.",
      },
    ],
  }),
});
