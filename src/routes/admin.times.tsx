import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { AdminTimesScreen } from "@/features/admin/AdminTimesScreen";

export const Route = createFileRoute("/admin/times")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Montar times — Pelada da Panela" },
      {
        name: "description",
        content: "Distribuir os confirmados nos times e começar as partidas.",
      },
      { property: "og:title", content: "Montar times — Pelada da Panela" },
      { property: "og:description", content: "Distribuir os confirmados nos times." },
    ],
  }),
  component: () => (
    <RequireAdmin>
      <AppShell>
        <AdminTimesScreen />
      </AppShell>
    </RequireAdmin>
  ),
});
