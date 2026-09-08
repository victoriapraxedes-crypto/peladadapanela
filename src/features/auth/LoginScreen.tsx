import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/features/auth/AuthProvider";

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.9 36.6 44 31 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

export function LoginScreen() {
  const navigate = useNavigate();
  const { session, loading, signInWithGoogle } = useAuth();
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  const handleGoogle = async () => {
    setEntrando(true);
    setErro(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setErro(error);
      setEntrando(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
        <Logo size={96} />

        <h1 className="mt-6 text-center font-display text-3xl font-bold uppercase leading-tight tracking-[-0.02em] text-foreground">
          Pelada da <span className="text-primary">Panela</span>
        </h1>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          A pelada dos amigos, organizada de verdade.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={entrando}
          className="mt-10 flex h-[52px] w-full items-center justify-center gap-3 rounded-xl bg-primary px-4 font-display font-semibold text-primary-foreground hover:bg-primary-dim active:bg-primary-dim disabled:opacity-60"
        >
          <GoogleIcon />
          {entrando ? "Entrando..." : "Entrar com Google"}
        </button>

        {erro && <p className="mt-3 w-full text-xs text-destructive">{erro}</p>}

        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Disponível em breve"
          className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          Entrar com e-mail
          <span className="text-xs text-foreground/40">em breve</span>
        </button>
      </div>

      <footer
        className="pb-6 text-xs text-muted-foreground"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        Temporada 2026
      </footer>
    </main>
  );
}
