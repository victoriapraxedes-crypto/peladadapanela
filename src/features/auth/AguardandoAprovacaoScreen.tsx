import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Logo } from "@/components/brand/Logo";
import { AuthLoading } from "@/features/auth/RequireAuth";
import { useAuth } from "@/features/auth/AuthProvider";

export function AguardandoAprovacaoScreen() {
  const { session, profile, loading, signOut, reloadProfile } = useAuth();
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(false);

  const acesso = profile?.acesso;

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (acesso === "aprovado") navigate({ to: "/" });
  }, [loading, session, acesso, navigate]);

  if (loading || !session || acesso === "aprovado") return <AuthLoading />;

  const recusado = acesso === "recusado";
  const titulo = recusado ? "Acesso não liberado." : "Cadastro realizado com sucesso.";
  const texto = recusado
    ? "O administrador não liberou seu acesso. Se você acha que foi engano, fale com quem organiza a pelada."
    : "Seu acesso está aguardando aprovação do administrador. Você receberá acesso assim que for aprovado.";

  const verificar = async () => {
    if (verificando) return;
    setVerificando(true);
    await reloadProfile();
    setVerificando(false);
  };

  return (
    <main className="flex min-h-screen items-center bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <Logo size={72} />
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-foreground">
          {titulo}
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">{texto}</p>

        <div className="mt-8 grid gap-3">
          {!recusado && (
            <button
              type="button"
              onClick={() => void verificar()}
              disabled={verificando}
              className="flex h-[52px] w-full items-center justify-center rounded-xl border border-border bg-transparent text-sm font-medium text-foreground disabled:opacity-50"
            >
              {verificando ? "Verificando..." : "Verificar de novo"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex h-[52px] w-full items-center justify-center rounded-xl border border-border bg-transparent text-sm font-medium text-foreground"
          >
            Sair
          </button>
        </div>
      </div>
    </main>
  );
}
