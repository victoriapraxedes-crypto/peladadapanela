import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/ui";
import {
  BTN_PRIMARY_64,
  BTN_SECONDARY,
  PlayerGrid,
  SECTION_LABEL,
  type PartidaPlayer,
  type TimeInfo,
} from "./shared";
import type { EventoPartida } from "./tipos";

interface Props {
  evento: EventoPartida | null;
  onOpenChange: (open: boolean) => void;
  times: [TimeInfo, TimeInfo];
}

export function EditarEventoDrawer({ evento, onOpenChange, times }: Props) {
  const [autorId, setAutorId] = useState<string | null>(null);
  const [assistId, setAssistId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  useEffect(() => {
    setAutorId(evento?.playerId ?? null);
    setAssistId(evento?.assistPlayerId ?? null);
  }, [evento]);

  if (!evento) {
    return (
      <Drawer open={false} onOpenChange={onOpenChange}>
        <DrawerContent />
      </Drawer>
    );
  }

  // No gol, o autor pertence ao time em team_id.
  // No gol contra, team_id é o time que recebeu o ponto, então o autor é do time ADVERSÁRIO.
  const timeDoPonto = times.find((t) => t.id === evento.teamId) ?? times[0];
  const timeAdversario = times.find((t) => t.id !== evento.teamId) ?? times[1];
  const timeDoAutor: TimeInfo = evento.tipo === "gol" ? timeDoPonto : timeAdversario;

  const elenco: PartidaPlayer[] = timeDoAutor.jogadores;
  const autor = elenco.find((j) => j.id === autorId) ?? null;
  const assistente = elenco.find((j) => j.id === assistId) ?? null;

  async function salvar() {
    if (!autorId || !evento) return;
    setSalvando(true);
    const { error } = await supabase
      .from("match_events")
      .update({
        player_id: autorId,
        assist_player_id: evento.tipo === "gol" ? assistId : null,
      })
      .eq("id", evento.id);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar o evento. " + error.message);
      return;
    }
    toast.success("Evento atualizado.");
    onOpenChange(false);
  }

  async function excluir() {
    if (!evento) return;
    setSalvando(true);
    const { error } = await supabase.from("match_events").delete().eq("id", evento.id);
    setSalvando(false);
    setConfirmandoExclusao(false);
    if (error) {
      toast.error("Não foi possível excluir o evento. " + error.message);
      return;
    }
    toast.success("Evento excluído.");
    onOpenChange(false);
  }

  return (
    <>
      <Drawer open onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-display text-base font-semibold">
              Editar {evento.tipo === "gol" ? "gol" : "gol contra"}
            </DrawerTitle>
            <p className="text-xs text-muted-foreground">
              Para trocar entre gol e gol contra, apague e cadastre de novo.
            </p>
          </DrawerHeader>

          <div className="max-h-[70vh] overflow-y-auto px-4 pb-8">
            <p className={SECTION_LABEL}>Autor</p>
            <div className="mt-3">
              <PlayerGrid
                jogadores={elenco}
                onSelect={(p) => {
                  setAutorId(p.id);
                  if (assistId === p.id) setAssistId(null);
                }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Selecionado: {autor?.apelido ?? "nenhum"}
            </p>

            {evento.tipo === "gol" && (
              <>
                <p className={`${SECTION_LABEL} mt-6`}>Assistência</p>
                <div className="mt-3">
                  <PlayerGrid
                    jogadores={elenco.filter((j) => j.id !== autorId)}
                    emptyMessage="Nenhum outro jogador escalado neste time."
                    onSelect={(p) => setAssistId(p.id)}
                  />
                </div>
                <button
                  type="button"
                  className={`${BTN_SECONDARY} mt-3`}
                  onClick={() => setAssistId(null)}
                >
                  Sem assistência
                </button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Selecionada: {assistente?.apelido ?? "sem assistência"}
                </p>
              </>
            )}

            <button
              type="button"
              className={`${BTN_PRIMARY_64} mt-6`}
              disabled={salvando || !autorId}
              onClick={() => void salvar()}
            >
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              type="button"
              className={cn(
                "mt-3 flex h-[52px] w-full items-center justify-center rounded-xl border border-destructive/40 bg-transparent text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60",
                FOCUS_RING,
              )}
              disabled={salvando}
              onClick={() => setConfirmandoExclusao(true)}
            >
              Excluir evento
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmandoExclusao} onOpenChange={setConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este evento?</AlertDialogTitle>
            <AlertDialogDescription>
              O placar é recalculado automaticamente depois da exclusão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={salvando}
              onClick={(event) => {
                event.preventDefault();
                void excluir();
              }}
            >
              {salvando ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
