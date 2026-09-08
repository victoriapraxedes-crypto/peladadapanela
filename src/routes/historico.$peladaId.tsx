import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { PeladaHistoricoScreen } from "@/features/historico/PeladaHistoricoScreen";

export const Route = createFileRoute("/historico/$peladaId")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pelada no histórico — Pelada da Panela" },
      { name: "description", content: "Resumo da noite, presentes, times e partidas da pelada." },
      { property: "og:title", content: "Pelada no histórico — Pelada da Panela" },
      {
        property: "og:description",
        content: "Resumo da noite, presentes, times e partidas da pelada.",
      },
    ],
  }),
  component: HistoricoDetalheRoute,
});

function HistoricoDetalheRoute() {
  const { peladaId } = Route.useParams();
  return (
    <RequireAuth>
      <AppShell>
        <PeladaHistoricoScreen peladaId={peladaId} />
      </AppShell>
    </RequireAuth>
  );
}
