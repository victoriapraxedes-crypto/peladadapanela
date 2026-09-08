import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { AdminAcessosScreen } from "@/features/admin/AdminAcessosScreen";

export const Route = createFileRoute("/admin/acessos")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Solicitações de acesso — Pelada da Panela" },
      { name: "description", content: "Aprovar ou recusar quem pediu para entrar na pelada." },
      { property: "og:title", content: "Solicitações de acesso — Pelada da Panela" },
      { property: "og:description", content: "Aprovar ou recusar quem pediu para entrar." },
    ],
  }),
  component: () => (
    <RequireAdmin>
      <AppShell>
        <AdminAcessosScreen />
      </AppShell>
    </RequireAdmin>
  ),
});
