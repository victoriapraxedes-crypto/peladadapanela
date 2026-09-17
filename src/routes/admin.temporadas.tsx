import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { AdminTemporadasScreen } from "@/features/admin/AdminTemporadasScreen";

export const Route = createFileRoute("/admin/temporadas")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Temporadas — Pelada da Panela" },
      { name: "description", content: "Abrir e encerrar temporadas da pelada." },
      { property: "og:title", content: "Temporadas — Pelada da Panela" },
      { property: "og:description", content: "Abrir e encerrar temporadas." },
    ],
  }),
  component: () => (
    <RequireAdmin>
      <AppShell>
        <AdminTemporadasScreen />
      </AppShell>
    </RequireAdmin>
  ),
});
