import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ComingSoon } from "@/components/layout/AppShell";
import { RequireAdmin } from "@/features/auth/RequireAdmin";

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
        <ComingSoon title="Editar pelada" description="Aqui você vai criar e editar data, horário, local e status." />
      </AppShell>
    </RequireAdmin>
  ),
});
