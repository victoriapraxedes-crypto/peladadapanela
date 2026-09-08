import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { useAuth } from "@/features/auth/AuthProvider";

export function TopBar() {
  const { player, profile, signOut } = useAuth();
  const apelido = player?.apelido ?? "Você";
  const avatarUrl = profile?.avatar_url;

  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4">
      <Logo size={32} />
      <div className="flex min-w-0 items-center gap-2">
        {profile?.role === "admin" && (
          <Link
            to="/admin"
            aria-label="Painel admin"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-primary"
          >
            <Shield size={18} />
          </Link>
        )}
        <span className="truncate text-sm font-medium text-muted-foreground">{apelido}</span>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={apelido}
            width={36}
            height={36}
            referrerPolicy="no-referrer"
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <InitialsAvatar apelido={apelido} size={36} />
        )}
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-xs text-muted-foreground hover:text-foreground"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
