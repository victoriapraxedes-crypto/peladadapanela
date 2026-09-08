import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { PartidaScreen } from "@/features/partida/PartidaScreen";

export const Route = createFileRoute("/partida/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Partida ao vivo — Pelada da Panela" },
      { name: "description", content: "Acompanhe o placar da partida em tempo real." },
      { property: "og:title", content: "Partida ao vivo — Pelada da Panela" },
      { property: "og:description", content: "Acompanhe o placar da partida em tempo real." },
    ],
  }),
  component: PartidaRoute,
});

function PartidaRoute() {
  const { id } = Route.useParams();
  return (
    <RequireAuth>
      <AppShell>
        <PartidaScreen id={id} />
      </AppShell>
    </RequireAuth>
  );
}
