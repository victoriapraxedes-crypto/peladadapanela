import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CircleDot } from "lucide-react";
import { toast } from "sonner";

import { TopBar } from "@/components/layout/TopBar";
import { ErroCarregamento } from "@/components/layout/ErroCarregamento";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/ui";
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
import { StatusBadge } from "@/features/pelada/StatusBadge";
import { useAuth } from "@/features/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { GolDrawer } from "./GolDrawer";
import { GolContraDrawer } from "./GolContraDrawer";
import { EditarEventoDrawer } from "./EditarEventoDrawer";
import {
  BTN_PRIMARY_64,
  BTN_SECONDARY,
  SECTION_LABEL,
  formatHora,
  type PartidaPlayer,
  type TimeInfo,
} from "./shared";
import type { EventoPartida } from "./tipos";

type MatchStatus = Database["public"]["Enums"]["match_status"];

interface Partida {
  id: string;
  timeA: TimeInfo;
  timeB: TimeInfo;
  placarA: number;
  placarB: number;
  status: MatchStatus;
  inicioEm: string | null;
}

export function PartidaScreen({ id }: { id: string }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [partida, setPartida] = useState<Partida | null>(null);
  const [eventos, setEventos] = useState<EventoPartida[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  const [golAberto, setGolAberto] = useState(false);
  const [golContraAberto, setGolContraAberto] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<EventoPartida | null>(null);
  const [desfazerAberto, setDesfazerAberto] = useState(false);
  const [encerrarAberto, setEncerrarAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    const { data, error } = await supabase
      .from("matches")
      .select(
        "id, placar_a, placar_b, status, inicio_em, team_a_id, team_b_id, team_a:team_a_id(nome), team_b:team_b_id(nome)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setErro(true);
      return;
    }

    if (!data) {
      setPartida(null);
      setEventos([]);
      return;
    }

    const [{ data: elencos }, { data: evs }] = await Promise.all([
      supabase
        .from("team_players")
        .select("team_id, player:player_id(id, nome, apelido, foto_url)")
        .in("team_id", [data.team_a_id, data.team_b_id]),
      supabase
        .from("match_events")
        .select(
          "id, tipo, player_id, team_id, assist_player_id, criado_em, autor:player_id(apelido), assistente:assist_player_id(apelido)",
        )
        .eq("match_id", id)
        .order("criado_em", { ascending: false }),
    ]);

    const porTime = (teamId: string): PartidaPlayer[] =>
      (elencos ?? [])
        .filter((row) => row.team_id === teamId && row.player)
        .map((row) => ({
          id: row.player!.id,
          nome: row.player!.nome,
          apelido: row.player!.apelido,
          fotoUrl: row.player!.foto_url,
        }))
        .sort((a, b) => a.apelido.localeCompare(b.apelido, "pt-BR"));

    setPartida({
      id: data.id,
      timeA: { id: data.team_a_id, nome: data.team_a?.nome ?? "Time A", jogadores: porTime(data.team_a_id) },
      timeB: { id: data.team_b_id, nome: data.team_b?.nome ?? "Time B", jogadores: porTime(data.team_b_id) },
      placarA: data.placar_a,
      placarB: data.placar_b,
      status: data.status,
      inicioEm: data.inicio_em,
    });

    setEventos(
      (evs ?? []).map((e) => ({
        id: e.id,
        tipo: e.tipo,
        playerId: e.player_id,
        teamId: e.team_id,
        assistPlayerId: e.assist_player_id,
        criadoEm: e.criado_em,
        autorApelido: e.autor?.apelido ?? "Jogador",
        assistApelido: e.assistente?.apelido ?? null,
      })),
    );
  }, [id]);

  const carregarRef = useRef(carregar);
  useEffect(() => {
    carregarRef.current = carregar;
  }, [carregar]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      await carregar();
      if (ativo) setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [carregar]);

  // Um único canal por partida: assinatura estável, só depende do id.
  useEffect(() => {
    const channel = supabase
      .channel(`partida-live:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${id}` },
        () => {
          void carregarRef.current?.();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_events", filter: `match_id=eq.${id}` },
        () => {
          void carregarRef.current?.();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <>
        <TopBar />
        <Skeleton className="mt-4 h-6 w-24" />
        <Skeleton className="mt-5 h-[160px] w-full rounded-2xl" />
      </>
    );
  }

  if (!partida) {
    return (
      <>
        <TopBar />
        <section className="mt-2 rounded-2xl border border-border bg-surface p-5">
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground">
            Partida não encontrada.
          </h1>
          <Link to="/pelada" className={`${BTN_SECONDARY} mt-5`}>
            Voltar para a pelada
          </Link>
        </section>
      </>
    );
  }

  const finalizada = partida.status === "finalizada";
  const podeOperar = isAdmin && !finalizada;
  const times: [TimeInfo, TimeInfo] = [partida.timeA, partida.timeB];
  const nomeTime = (teamId: string) =>
    teamId === partida.timeA.id ? partida.timeA.nome : partida.timeB.nome;
  const ultimo = eventos[0] ?? null;

  async function desfazer() {
    if (!ultimo) return;
    setOcupado(true);
    const { error } = await supabase.from("match_events").delete().eq("id", ultimo.id);
    setOcupado(false);
    setDesfazerAberto(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Último evento desfeito.");
    void carregarRef.current?.();
  }

  async function encerrar() {
    setOcupado(true);
    const { error } = await supabase
      .from("matches")
      .update({ status: "finalizada", fim_em: new Date().toISOString() })
      .eq("id", id);
    setOcupado(false);
    setEncerrarAberto(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Partida encerrada.");
    void carregarRef.current?.();
  }

  return (
    <>
      <TopBar />

      <p className="mt-2 text-center">
        <StatusBadge status={partida.status} />
      </p>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <h2 className="truncate text-center font-display text-base font-semibold text-foreground">
            {partida.timeA.nome}
          </h2>
          <p className="num text-6xl leading-none text-foreground">
            {partida.placarA}
            <span className="mx-2 text-muted-foreground">–</span>
            {partida.placarB}
          </p>
          <h2 className="truncate text-center font-display text-base font-semibold text-foreground">
            {partida.timeB.nome}
          </h2>
        </div>

        {partida.inicioEm && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Início às {formatHora(partida.inicioEm)}
          </p>
        )}
      </section>

      {podeOperar && (
        <div className="mt-5 flex flex-col gap-3">
          <button type="button" className={BTN_PRIMARY_64} onClick={() => setGolAberto(true)}>
            <CircleDot className="h-6 w-6" />
            Gol
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={BTN_SECONDARY}
              onClick={() => setGolContraAberto(true)}
            >
              Gol contra
            </button>
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={!ultimo}
              onClick={() => setDesfazerAberto(true)}
            >
              Desfazer último
            </button>
          </div>
        </div>
      )}

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <p className={SECTION_LABEL}>Eventos</p>
        {eventos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum evento ainda.</p>
        ) : (
          <ul className="mt-3">
            {eventos.map((e) => {
              const conteudo = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">
                      ⚽{" "}
                      {e.tipo === "gol" ? e.autorApelido : `Gol contra — ${e.autorApelido}`}
                    </span>
                    {e.tipo === "gol" && e.assistApelido && (
                      <span className="block truncate text-xs text-muted-foreground">
                        Assistência: {e.assistApelido}
                      </span>
                    )}
                    <span className="block truncate text-xs text-muted-foreground">
                      {e.tipo === "gol" ? nomeTime(e.teamId) : `Ponto para ${nomeTime(e.teamId)}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatHora(e.criadoEm)}
                  </span>
                </>
              );
              return (
                <li key={e.id} className="border-b border-border last:border-b-0">
                  {podeOperar ? (
                    <button
                      type="button"
                      onClick={() => setEventoEditando(e)}
                      className="flex min-h-[56px] w-full items-center gap-3 py-3 text-left"
                    >
                      {conteudo}
                    </button>
                  ) : (
                    <div className="flex min-h-[56px] w-full items-center gap-3 py-3">
                      {conteudo}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {podeOperar && (
        <button
          type="button"
          onClick={() => setEncerrarAberto(true)}
          className="mt-5 flex h-[52px] w-full items-center justify-center rounded-xl border border-destructive/40 bg-transparent text-sm font-medium text-destructive"
        >
          Encerrar partida
        </button>
      )}

      {finalizada && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link to="/pelada" className={BTN_SECONDARY}>
            Ver a pelada
          </Link>
          {isAdmin && (
            <Link to="/admin/times" className={BTN_SECONDARY}>
              Montar times
            </Link>
          )}
        </div>
      )}

      {podeOperar && (
        <>
          <GolDrawer
            open={golAberto}
            onOpenChange={setGolAberto}
            matchId={partida.id}
            times={times}
          />
          <GolContraDrawer
            open={golContraAberto}
            onOpenChange={setGolContraAberto}
            matchId={partida.id}
            times={times}
          />
          {eventoEditando && (
            <EditarEventoDrawer
              evento={eventoEditando}
              times={times}
              onOpenChange={(open) => {
                if (!open) setEventoEditando(null);
              }}
            />
          )}

          <AlertDialog open={desfazerAberto} onOpenChange={setDesfazerAberto}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desfazer o último evento?</AlertDialogTitle>
                <AlertDialogDescription>
                  {ultimo
                    ? `${ultimo.tipo === "gol" ? "Gol" : "Gol contra"} de ${ultimo.autorApelido} — ponto para ${nomeTime(ultimo.teamId)} — ${formatHora(ultimo.criadoEm)}`
                    : "Não há evento para desfazer."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={ocupado || !ultimo}
                  onClick={(event) => {
                    event.preventDefault();
                    void desfazer();
                  }}
                >
                  Desfazer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={encerrarAberto} onOpenChange={setEncerrarAberto}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar a partida?</AlertDialogTitle>
                <AlertDialogDescription>
                  Depois de encerrar, não dá para registrar novos gols. O placar e os eventos
                  continuam visíveis.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={ocupado}
                  onClick={(event) => {
                    event.preventDefault();
                    void encerrar();
                  }}
                >
                  Encerrar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
