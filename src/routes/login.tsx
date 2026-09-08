import { createFileRoute } from "@tanstack/react-router";
import { LoginScreen } from "@/features/auth/LoginScreen";

export const Route = createFileRoute("/login")({
  staticData: { sitemap: true },
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s['next'] === "string" ? s['next'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Pelada da Panela" },
      { name: "description", content: "Acesse a pelada dos amigos, organizada de verdade." },
      { property: "og:title", content: "Entrar — Pelada da Panela" },
      { property: "og:description", content: "Acesse a pelada dos amigos, organizada de verdade." },
    ],
  }),
  component: LoginScreen,
});
