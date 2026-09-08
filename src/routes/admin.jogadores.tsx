import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ComingSoon } from "@/components/layout/AppShell";
import { RequireAdmin } from "@/features/auth/RequireAdmin";

export const Route = createFileRoute("/admin/jogadores")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gerenciar jogadores — Pelada da Panela" },
      { name: "description", content: "Cadastrar, ativar e desativar jogadores da pelada." },
      { property: "og:title", content: "Gerenciar jogadores — Pelada da Panela" },
      { property: "og:description", content: "Cadastrar, ativar e desativar jogadores." },
    ],
  }),
  component: () => (
    <RequireAdmin>
      <AppShell>
        <ComingSoon title="Gerenciar jogadores" description="Aqui você vai cadastrar, ativar e desativar jogadores." />
      </AppShell>
    </RequireAdmin>
  ),
});
