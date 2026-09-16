import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { AdminTimesScreen } from "@/features/admin/AdminTimesScreen";

export const Route = createFileRoute("/admin/times")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sortear times — Pelada da Panela" },
      {
        name: "description",
        content: "Sortear os escalados em times para organizar a pelada.",
      },
      { property: "og:title", content: "Sortear times — Pelada da Panela" },
      { property: "og:description", content: "Sortear os escalados em times." },
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
