// Este guard é apenas conveniência de interface: ele esconde telas que um
// jogador comum não deveria ver. A barreira REAL de segurança é a RLS do
// banco de dados, que continua valendo mesmo se alguém burlar esta camada.
import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { AuthLoading } from "@/features/auth/RequireAuth";
import { useAuth } from "@/features/auth/AuthProvider";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, player, profile, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login" });
    } else if (!player) {
      navigate({ to: "/onboarding" });
    } else if (!isAdmin) {
      navigate({ to: "/" });
    }
  }, [loading, session, player, isAdmin, navigate]);

  if (loading || !session || !player || !isAdmin) return <AuthLoading />;
  return <>{children}</>;
}
