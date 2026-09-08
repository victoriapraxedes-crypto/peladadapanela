import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { JogadoresScreen } from "@/features/jogadores/JogadoresScreen";

export const Route = createFileRoute("/jogadores/")({
  head: () => ({
    meta: [
      { title: "Jogadores — Pelada da Panela" },
      { name: "description", content: "Elenco da pelada e estatísticas de cada jogador." },
      { property: "og:title", content: "Jogadores — Pelada da Panela" },
      { property: "og:description", content: "Elenco da pelada e estatísticas de cada jogador." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <JogadoresScreen />
      </AppShell>
    </RequireAuth>
  ),
});
