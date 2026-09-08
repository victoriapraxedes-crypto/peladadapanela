import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { AdminPeladaScreen } from "@/features/admin/AdminPeladaScreen";

export const Route = createFileRoute("/admin/pelada")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Editar pelada — Pelada da Panela" },
      { name: "description", content: "Criar e editar data, horário, local e status da pelada." },
      { property: "og:title", content: "Editar pelada — Pelada da Panela" },
      { property: "og:description", content: "Criar e editar a pelada." },
    ],
  }),
  component: () => (
    <RequireAdmin>
      <AppShell>
        <AdminPeladaScreen />
      </AppShell>
    </RequireAdmin>
  ),
});
