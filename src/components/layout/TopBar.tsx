import { Logo } from "@/components/brand/Logo";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { currentUser, getPlayer } from "@/lib/mock";

export function TopBar() {
  const player = getPlayer(currentUser.playerId);
  const apelido = player?.apelido ?? "Você";

  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4">
      <Logo size={32} />
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-muted-foreground">{apelido}</span>
        <InitialsAvatar apelido={apelido} size={36} />
      </div>
    </header>
  );
}
