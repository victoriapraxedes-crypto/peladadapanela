import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { RankingScreen } from "@/features/ranking/RankingScreen";

export const Route = createFileRoute("/ranking")({
  staticData: { sitemap: false },
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
    <RequireAuth>
      <AppShell>
        <RankingScreen />
      </AppShell>
    </RequireAuth>
  ),
});
