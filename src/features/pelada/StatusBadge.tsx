import type { Database } from "@/integrations/supabase/types";

type PeladaStatus = Database["public"]["Enums"]["pelada_status"];
type MatchStatus = Database["public"]["Enums"]["match_status"];

const LABELS: Record<string, string> = {
  aberta: "Aberta",
  confirmacao: "Confirmação",
  times_definidos: "Times definidos",
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
  agendada: "Agendada",
};

function toneFor(status: string): string {
  if (status === "em_andamento") return "text-success border-success/40";
  if (status === "finalizada") return "text-muted-foreground border-border";
  return "text-primary border-primary/40";
}

export function StatusBadge({ status }: { status: PeladaStatus | MatchStatus | string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-1 text-[11px] uppercase tracking-wide ${toneFor(
        status,
      )}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
