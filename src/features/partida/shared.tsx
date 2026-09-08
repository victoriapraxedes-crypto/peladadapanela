import { InitialsAvatar } from "@/components/layout/Avatar";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/ui";

export interface PartidaPlayer {
  id: string;
  nome: string;
  apelido: string;
  fotoUrl: string | null;
}

export interface TimeInfo {
  id: string;
  nome: string;
  jogadores: PartidaPlayer[];
}

export const BTN_PRIMARY_64 =
  "flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-lg font-bold uppercase text-primary-foreground transition-colors hover:bg-primary-dim disabled:opacity-60 " +
  FOCUS_RING;

export const BTN_SECONDARY =
  "flex h-[52px] w-full items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 disabled:opacity-60 " +
  FOCUS_RING;

export const BTN_BIG_SECONDARY =
  "flex h-16 w-full items-center justify-center rounded-xl border border-border bg-surface-2 px-4 text-center font-display text-base font-semibold text-foreground transition-colors hover:border-primary/40 disabled:opacity-60 " +
  FOCUS_RING;

export const SECTION_LABEL =
  "font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary";

export function formatHora(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function PlayerGrid({
  jogadores,
  onSelect,
  emptyMessage = "Nenhum jogador escalado neste time.",
}: {
  jogadores: PartidaPlayer[];
  onSelect: (player: PartidaPlayer) => void;
  emptyMessage?: string;
}) {
  if (jogadores.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {jogadores.map((j) => (
        <button
          key={j.id}
          type="button"
          onClick={() => onSelect(j)}
          className={cn(
            "flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface-2 p-3 text-center transition-colors hover:border-primary/40",
            FOCUS_RING,
          )}
        >
          {j.fotoUrl ? (
            <img
              src={j.fotoUrl}
              alt={j.apelido}
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <InitialsAvatar apelido={j.apelido} size={56} />
          )}
          <span className="w-full truncate text-sm font-medium text-foreground">{j.apelido}</span>
          <span className="w-full truncate text-[11px] text-muted-foreground">{j.nome}</span>
        </button>
      ))}
    </div>
  );
}
