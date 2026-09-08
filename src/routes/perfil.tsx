import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { MeuPerfilScreen } from "@/features/perfil/MeuPerfilScreen";

export const Route = createFileRoute("/perfil")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Perfil — Pelada da Panela" },
      { name: "description", content: "Seus números, posição preferida e histórico na pelada." },
      { property: "og:title", content: "Perfil — Pelada da Panela" },
      {
        property: "og:description",
        content: "Seus números, posição preferida e histórico na pelada.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <MeuPerfilScreen />
      </AppShell>
    </RequireAuth>
  ),
});
