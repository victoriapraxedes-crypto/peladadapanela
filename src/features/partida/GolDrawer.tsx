import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/ui";
import {
  BTN_BIG_SECONDARY,
  BTN_PRIMARY_64,
  BTN_SECONDARY,
  PlayerGrid,
  type PartidaPlayer,
  type TimeInfo,
} from "./shared";

type Passo = "time" | "autor" | "temAssist" | "assistente" | "confirmar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  times: [TimeInfo, TimeInfo];
}

const TITULOS: Record<Passo, string> = {
  time: "Qual time marcou?",
  autor: "Quem fez o gol?",
  temAssist: "Teve assistência?",
  assistente: "Quem deu a assistência?",
  confirmar: "Confirmar gol",
};

export function GolDrawer({ open, onOpenChange, matchId, times }: Props) {
  const [passo, setPasso] = useState<Passo>("time");
  const [time, setTime] = useState<TimeInfo | null>(null);
  const [autor, setAutor] = useState<PartidaPlayer | null>(null);
  const [assistente, setAssistente] = useState<PartidaPlayer | null>(null);
  const [enviando, setEnviando] = useState(false);

  function reset() {
    setPasso("time");
    setTime(null);
    setAutor(null);
    setAssistente(null);
    setEnviando(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function voltar() {
    if (passo === "autor") setPasso("time");
    else if (passo === "temAssist") setPasso("autor");
    else if (passo === "assistente") setPasso("temAssist");
    else if (passo === "confirmar") setPasso(assistente ? "assistente" : "temAssist");
  }

  async function confirmar() {
    if (!time || !autor) return;
    setEnviando(true);
    const { error } = await supabase.from("match_events").insert({
      match_id: matchId,
      tipo: "gol",
      player_id: autor.id,
      assist_player_id: assistente?.id ?? null,
      team_id: time.id,
    });
    setEnviando(false);
    if (error) {
      toast.error("Não foi possível registrar o gol. " + error.message);
      return;
    }
    toast.success("Gol registrado.");
    handleOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="flex flex-row items-center gap-2 text-left">
          {passo !== "time" && (
            <button
              type="button"
              onClick={voltar}
              aria-label="Voltar"
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 transition-colors hover:border-primary/40",
                FOCUS_RING,
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <DrawerTitle className="font-display text-base font-semibold">
            {TITULOS[passo]}
          </DrawerTitle>
        </DrawerHeader>

        <div className="max-h-[70vh] overflow-y-auto px-4 pb-8">
          {passo === "time" && (
            <div className="flex flex-col gap-3">
              {times.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={BTN_BIG_SECONDARY}
                  onClick={() => {
                    setTime(t);
                    setPasso("autor");
                  }}
                >
                  <span className="truncate">{t.nome}</span>
                </button>
              ))}
            </div>
          )}

          {passo === "autor" && time && (
            <>
              <PlayerGrid
                jogadores={time.jogadores}
                onSelect={(p) => {
                  setAutor(p);
                  setPasso("temAssist");
                }}
              />
              {time.jogadores.length === 0 && (
                <button
                  type="button"
                  className={`${BTN_SECONDARY} mt-3`}
                  onClick={() => handleOpenChange(false)}
                >
                  Fechar
                </button>
              )}
            </>
          )}

          {passo === "temAssist" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={BTN_BIG_SECONDARY}
                onClick={() => setPasso("assistente")}
              >
                Sim
              </button>
              <button
                type="button"
                className={BTN_BIG_SECONDARY}
                onClick={() => {
                  setAssistente(null);
                  setPasso("confirmar");
                }}
              >
                Não
              </button>
            </div>
          )}

          {passo === "assistente" && time && (
            <>
              <PlayerGrid
                jogadores={time.jogadores.filter((j) => j.id !== autor?.id)}
                emptyMessage="Nenhum outro jogador escalado neste time."
                onSelect={(p) => {
                  setAssistente(p);
                  setPasso("confirmar");
                }}
              />
              <button
                type="button"
                className={`${BTN_SECONDARY} mt-3`}
                onClick={() => {
                  setAssistente(null);
                  setPasso("confirmar");
                }}
              >
                Sem assistência
              </button>
            </>
          )}

          {passo === "confirmar" && time && autor && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-border bg-surface p-5">
                <p className="font-display text-xl font-bold text-foreground">
                  Gol de {autor.apelido}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {assistente ? `Assistência: ${assistente.apelido}` : "Sem assistência"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{time.nome}</p>
              </div>
              <button
                type="button"
                className={BTN_PRIMARY_64}
                disabled={enviando}
                onClick={() => void confirmar()}
              >
                {enviando ? "Confirmando..." : "Confirmar gol"}
              </button>
              <button type="button" className={BTN_SECONDARY} onClick={voltar} disabled={enviando}>
                Voltar
              </button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
