import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ComingSoon } from "@/components/layout/AppShell";

export const Route = createFileRoute("/jogadores")({
  head: () => ({
    meta: [
      { title: "Jogadores — Pelada da Panela" },
      { name: "description", content: "Elenco da pelada e estatísticas de cada jogador." },
      { property: "og:title", content: "Jogadores — Pelada da Panela" },
      { property: "og:description", content: "Elenco da pelada e estatísticas de cada jogador." },
    ],
  }),
  component: () => (
    <AppShell>
      <ComingSoon
        title="Jogadores"
        description="Aqui você vai ver o elenco completo da pelada, com posição e estatísticas de cada um."
      />
    </AppShell>
  ),
});
