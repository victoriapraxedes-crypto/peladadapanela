import { useState } from "react";
import { Link } from "@tanstack/react-router";

import { useAuth } from "@/features/auth/AuthProvider";
import { PerfilJogadorScreen } from "@/features/jogadores/PerfilJogadorScreen";
import { TopBar } from "@/components/layout/TopBar";
import { EditarPerfilDrawer } from "@/features/perfil/EditarPerfilDrawer";

export function MeuPerfilScreen() {
  const { player, profile, signOut } = useAuth();
  const [editando, setEditando] = useState(false);
  const [versao, setVersao] = useState(0);

  if (!player) {
    return (
      <div>
        <TopBar />
        <div className="grid gap-4 px-5 py-10">
          <p className="text-sm text-muted-foreground">
            Você ainda não tem um cadastro de jogador.
          </p>
          <Link
            to="/onboarding"
            className="flex h-[52px] w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground"
          >
            Completar cadastro
          </Link>
        </div>
      </div>
    );
  }

  const header = (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="flex h-[52px] w-full items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim"
      >
        Editar perfil
      </button>

      {profile?.role === "admin" && (
        <Link
          to="/admin"
          className="flex h-[52px] w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground"
        >
          Painel admin
        </Link>
      )}

      <button
        type="button"
        onClick={() => void signOut()}
        className="flex h-[52px] w-full items-center justify-center rounded-xl border border-border bg-transparent text-sm font-medium text-muted-foreground"
      >
        Sair
      </button>
    </div>
  );

  return (
    <>
      <PerfilJogadorScreen key={`${player.id}-${versao}`} playerId={player.id} header={header} />
      <EditarPerfilDrawer
        open={editando}
        onOpenChange={setEditando}
        player={player}
        onSaved={() => setVersao((v) => v + 1)}
      />
    </>
  );
}
