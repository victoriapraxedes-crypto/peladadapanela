import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { HomeScreen } from "@/features/home/HomeScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pelada da Panela — Início" },
      {
        name: "description",
        content:
          "Próxima pelada, confirmados, artilheiro e ranking da turma em um só lugar.",
      },
      { property: "og:title", content: "Pelada da Panela — Início" },
      {
        property: "og:description",
        content: "Próxima pelada, confirmados, artilheiro e ranking da turma.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <HomeScreen />
    </AppShell>
  );
}
