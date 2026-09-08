import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/ui";

interface Props {
  onRetry: () => void;
  className?: string;
}

export function ErroCarregamento({ onRetry, className }: Props) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-5", className)}>
      <p className="text-center text-sm text-foreground">Não foi possível carregar.</p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          "mt-4 flex h-[52px] w-full items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40",
          FOCUS_RING,
        )}
      >
        Tentar de novo
      </button>
    </div>
  );
}
