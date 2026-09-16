import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { AdminSumulaScreen } from "@/features/admin/AdminSumulaScreen";

export const Route = createFileRoute("/admin/sumula")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Súmula — Pelada da Panela" },
      {
        name: "description",
        content: "Lançar gols, assistências e carrinhos de cada jogador e publicar o resultado.",
      },
      { property: "og:title", content: "Súmula — Pelada da Panela" },
      { property: "og:description", content: "Lançar e publicar o resultado da pelada." },
    ],
  }),
  component: () => (
    <RequireAdmin>
      <AppShell>
        <AdminSumulaScreen />
      </AppShell>
    </RequireAdmin>
  ),
});
