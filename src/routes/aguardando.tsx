import { createFileRoute } from "@tanstack/react-router";
import { AguardandoAprovacaoScreen } from "@/features/auth/AguardandoAprovacaoScreen";

export const Route = createFileRoute("/aguardando")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aguardando aprovação — Pelada da Panela" },
      { name: "description", content: "Seu cadastro aguarda a aprovação do administrador." },
      { property: "og:title", content: "Aguardando aprovação — Pelada da Panela" },
      {
        property: "og:description",
        content: "Seu cadastro aguarda a aprovação do administrador.",
      },
    ],
  }),
  component: AguardandoAprovacaoScreen,
});
