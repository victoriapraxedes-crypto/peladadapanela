import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ComingSoon } from "@/components/layout/AppShell";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Pelada da Panela" },
      { name: "description", content: "Seus números, posição preferida e histórico na pelada." },
      { property: "og:title", content: "Perfil — Pelada da Panela" },
      {
        property: "og:description",
        content: "Seus números, posição preferida e histórico na pelada.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <ComingSoon
        title="Perfil"
        description="Aqui ficam seus números da temporada, posição preferida e o elenco de jogadores."
      />
    </AppShell>
  ),
});
