import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ComingSoon } from "@/components/layout/AppShell";

export const Route = createFileRoute("/pelada")({
  head: () => ({
    meta: [
      { title: "Pelada — Pelada da Panela" },
      { name: "description", content: "Detalhes da próxima pelada, times e partidas." },
      { property: "og:title", content: "Pelada — Pelada da Panela" },
      { property: "og:description", content: "Detalhes da próxima pelada, times e partidas." },
    ],
  }),
  component: () => (
    <AppShell>
      <ComingSoon
        title="Pelada"
        description="Aqui você vai ver a lista de presença, os times sorteados e o placar ao vivo."
      />
    </AppShell>
  ),
});
