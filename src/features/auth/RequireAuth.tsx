import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/features/auth/AuthProvider";

export function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <span className="animate-pulse">
        <Logo size={64} />
      </span>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, player, profile, loading } = useAuth();
  const navigate = useNavigate();
  const aprovado = profile?.acesso === "aprovado";

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login" });
    } else if (!player) {
      navigate({ to: "/onboarding" });
    } else if (!aprovado) {
      navigate({ to: "/aguardando" });
    }
  }, [loading, session, player, aprovado, navigate]);

  if (loading || !session || !player || !aprovado) return <AuthLoading />;
  return <>{children}</>;
}
