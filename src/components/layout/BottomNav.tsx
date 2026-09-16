import { Link } from "@tanstack/react-router";
import { Home, CalendarDays, Trophy, User } from "lucide-react";

const items = [
  { to: "/", label: "Início", icon: Home },
  { to: "/pelada", label: "Pelada", icon: CalendarDays },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur">
      <div
        className="mx-auto flex w-full max-w-md items-stretch justify-between px-2 md:max-w-2xl lg:max-w-4xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-muted-foreground data-[status=active]:text-primary"
          >
            <Icon size={20} strokeWidth={2} />
            <span className="text-[11px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
