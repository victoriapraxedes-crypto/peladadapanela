import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { AdminPanel } from "@/features/admin/AdminPanel";

export const Route = createFileRoute("/admin/")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel admin — Pelada da Panela" },
      {
        name: "description",
        content: "Painel de administração da pelada: próxima data, jogadores e times.",
      },
      { property: "og:title", content: "Painel admin — Pelada da Panela" },
      { property: "og:description", content: "Painel de administração da pelada." },
    ],
  }),
  component: () => (
    <RequireAdmin>
      <AppShell>
        <AdminPanel />
      </AppShell>
    </RequireAdmin>
  ),
});
