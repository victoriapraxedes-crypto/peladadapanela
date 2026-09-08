import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { PerfilJogadorScreen } from "@/features/jogadores/PerfilJogadorScreen";

export const Route = createFileRoute("/jogadores/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Perfil do jogador — Pelada da Panela" },
      { name: "description", content: "Estatísticas, posições no ranking e peladas recentes." },
      { property: "og:title", content: "Perfil do jogador — Pelada da Panela" },
      {
        property: "og:description",
        content: "Estatísticas, posições no ranking e peladas recentes.",
      },
    ],
  }),
  component: PerfilRoute,
});

function PerfilRoute() {
  const { id } = Route.useParams();
  return (
    <RequireAuth>
      <AppShell>
        <PerfilJogadorScreen playerId={id} />
      </AppShell>
    </RequireAuth>
  );
}
