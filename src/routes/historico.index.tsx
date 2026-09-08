import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { HistoricoScreen } from "@/features/historico/HistoricoScreen";

export const Route = createFileRoute("/historico/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Histórico — Pelada da Panela" },
      { name: "description", content: "Histórico de peladas, placares e MVPs das temporadas." },
      { property: "og:title", content: "Histórico — Pelada da Panela" },
      {
        property: "og:description",
        content: "Histórico de peladas, placares e MVPs das temporadas.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <HistoricoScreen />
      </AppShell>
    </RequireAuth>
  ),
});
