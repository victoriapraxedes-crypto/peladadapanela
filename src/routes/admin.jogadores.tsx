import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { AdminJogadoresScreen } from "@/features/admin/AdminJogadoresScreen";

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
        <AdminJogadoresScreen />
      </AppShell>
    </RequireAdmin>
  ),
});
