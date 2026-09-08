import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ComingSoon } from "@/components/layout/AppShell";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Pelada da Panela" },
      { name: "description", content: "Histórico de peladas, placares e MVPs das temporadas." },
      { property: "og:title", content: "Histórico — Pelada da Panela" },
      { property: "og:description", content: "Histórico de peladas, placares e MVPs das temporadas." },
    ],
  }),
  component: () => (
    <AppShell>
      <ComingSoon
        title="Histórico"
        description="Aqui você vai rever todas as peladas passadas, com placares e MVPs de cada semana."
      />
    </AppShell>
  ),
});
