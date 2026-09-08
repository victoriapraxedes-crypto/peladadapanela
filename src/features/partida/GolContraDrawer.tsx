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

type Passo = "time" | "jogador" | "confirmar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  times: [TimeInfo, TimeInfo];
}

const TITULOS: Record<Passo, string> = {
  time: "De qual time é o jogador?",
  jogador: "Qual jogador?",
  confirmar: "Confirmar gol contra",
};

export function GolContraDrawer({ open, onOpenChange, matchId, times }: Props) {
  const [passo, setPasso] = useState<Passo>("time");
  const [time, setTime] = useState<TimeInfo | null>(null);
  const [jogador, setJogador] = useState<PartidaPlayer | null>(null);
  const [enviando, setEnviando] = useState(false);

  // O ponto do gol contra vai SEMPRE para o time adversário ao do jogador.
  // Se o jogador é do time A, team_id do evento é o time B, e vice-versa.
  const adversario = time ? (times.find((t) => t.id !== time.id) ?? null) : null;

  function reset() {
    setPasso("time");
    setTime(null);
    setJogador(null);
    setEnviando(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function voltar() {
    if (passo === "jogador") setPasso("time");
    else if (passo === "confirmar") setPasso("jogador");
  }

  async function confirmar() {
    if (!jogador || !adversario) return;
    setEnviando(true);
    const { error } = await supabase.from("match_events").insert({
      match_id: matchId,
      tipo: "gol_contra",
      player_id: jogador.id,
      assist_player_id: null,
      // team_id = time que MARCOU o ponto = adversário do jogador.
      team_id: adversario.id,
    });
    setEnviando(false);
    if (error) {
      toast.error("Não foi possível registrar o gol contra. " + error.message);
      return;
    }
    toast.success("Gol contra registrado.");
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
                    setPasso("jogador");
                  }}
                >
                  <span className="truncate">{t.nome}</span>
                </button>
              ))}
            </div>
          )}

          {passo === "jogador" && time && (
            <>
              <PlayerGrid
                jogadores={time.jogadores}
                onSelect={(p) => {
                  setJogador(p);
                  setPasso("confirmar");
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

          {passo === "confirmar" && jogador && adversario && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-border bg-surface p-5">
                <p className="font-display text-xl font-bold text-foreground">
                  Gol contra de {jogador.apelido}. Ponto para{" "}
                  <span className="text-primary">{adversario.nome}</span>.
                </p>
              </div>
              <button
                type="button"
                className={BTN_PRIMARY_64}
                disabled={enviando}
                onClick={() => void confirmar()}
              >
                {enviando ? "Confirmando..." : "Confirmar gol contra"}
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
