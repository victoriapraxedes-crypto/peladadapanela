import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ComingSoon } from "@/components/layout/AppShell";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking — Pelada da Panela" },
      { name: "description", content: "Classificação da temporada, artilharia e assistências." },
      { property: "og:title", content: "Ranking — Pelada da Panela" },
      {
        property: "og:description",
        content: "Classificação da temporada, artilharia e assistências.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <ComingSoon
        title="Ranking"
        description="Aqui vai entrar a classificação completa da temporada, com gols, assistências e aproveitamento."
      />
    </AppShell>
  ),
});
