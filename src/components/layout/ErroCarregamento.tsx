import { RotateCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/ui";

/**
 * Estado de erro único para todas as telas de leitura. Um botão que refaz a
 * busca, para que uma falha de rede não deixe a tela silenciosamente vazia.
 */
export function ErroCarregamento({
  onRetry,
  className,
}: {
  onRetry: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className={cn(
        "flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-4 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
        FOCUS_RING,
        className,
      )}
    >
      <RotateCw size={16} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0">Não foi possível carregar. Toque para tentar de novo.</span>
    </button>
  );
}
