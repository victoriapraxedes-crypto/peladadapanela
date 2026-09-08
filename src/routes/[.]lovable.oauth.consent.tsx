import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("authorization_id ausente");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/login", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const oauth = supabase.auth as unknown as {
      oauth: {
        getAuthorizationDetails: (
          id: string,
        ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
      };
    };
    const { data, error } = await oauth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
      <p className="text-sm text-muted-foreground">
        Não foi possível carregar este pedido de conexão: {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

type AuthorizationDetails = {
  client?: { name?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};

function Consent() {
  const details = Route.useLoaderData() as AuthorizationDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const nome = details?.client?.name ?? "o aplicativo";

  async function decidir(aprovar: boolean) {
    setBusy(true);
    setErro(null);
    const oauth = supabase.auth as unknown as {
      oauth: {
        approveAuthorization: (
          id: string,
        ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
        denyAuthorization: (
          id: string,
        ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
      };
    };
    const { data, error } = aprovar
      ? await oauth.oauth.approveAuthorization(authorization_id)
      : await oauth.oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setErro(error.message);
      return;
    }
    const destino = data?.redirect_url ?? data?.redirect_to;
    if (!destino) {
      setBusy(false);
      setErro("O servidor de autorização não devolveu um endereço de retorno.");
      return;
    }
    window.location.href = destino;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo size={72} />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
          Conectar {nome} à sua conta
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {nome} vai poder ver peladas, jogadores e ranking e confirmar sua presença, agindo como você.
        </p>
        {erro && (
          <p role="alert" className="mt-4 text-xs text-destructive">
            {erro}
          </p>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => decidir(true)}
            className="flex h-[52px] w-full items-center justify-center rounded-xl bg-primary font-display font-semibold text-primary-foreground hover:bg-primary-dim disabled:opacity-60"
          >
            {busy ? "Conectando..." : "Permitir"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decidir(false)}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-border text-sm text-muted-foreground disabled:opacity-60"
          >
            Recusar
          </button>
        </div>
      </div>
    </main>
  );
}
