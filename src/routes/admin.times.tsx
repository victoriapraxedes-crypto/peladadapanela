import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ComingSoon } from "@/components/layout/AppShell";
import { RequireAdmin } from "@/features/auth/RequireAdmin";

export const Route = createFileRoute("/admin/times")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Montar times — Pelada da Panela" },
      { name: "description", content: "Distribuir os confirmados nos times e começar as partidas." },
      { property: "og:title", content: "Montar times — Pelada da Panela" },
      { property: "og:description", content: "Distribuir os confirmados nos times." },
    ],
  }),
  component: () => (
    <RequireAdmin>
      <AppShell>
        <ComingSoon title="Montar times" description="Aqui você vai distribuir os confirmados e iniciar as partidas." />
      </AppShell>
    </RequireAdmin>
  ),
});
