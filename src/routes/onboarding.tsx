import { createFileRoute } from "@tanstack/react-router";
import { OnboardingScreen } from "@/features/auth/OnboardingScreen";

export const Route = createFileRoute("/onboarding")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Completar perfil — Pelada da Panela" },
      { name: "description", content: "Complete seus dados de jogador para entrar na pelada." },
      { property: "og:title", content: "Completar perfil — Pelada da Panela" },
      {
        property: "og:description",
        content: "Complete seus dados de jogador para entrar na pelada.",
      },
    ],
  }),
  component: OnboardingScreen,
});
