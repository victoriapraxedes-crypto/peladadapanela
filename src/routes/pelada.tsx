import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { PeladaScreen } from "@/features/pelada/PeladaScreen";

export const Route = createFileRoute("/pelada")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pelada — Pelada da Panela" },
      { name: "description", content: "Detalhes da próxima pelada, confirmados, times e partidas." },
      { property: "og:title", content: "Pelada — Pelada da Panela" },
      { property: "og:description", content: "Detalhes da próxima pelada, confirmados, times e partidas." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <PeladaScreen />
      </AppShell>
    </RequireAuth>
  ),
});
