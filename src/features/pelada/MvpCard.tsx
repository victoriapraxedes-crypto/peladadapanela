import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Timer } from "lucide-react";
import { toast } from "sonner";

import { InitialsAvatar } from "@/components/layout/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useAuth } from "@/features/auth/AuthProvider";
import { buscarDesempenhos, type DesempenhoPelada } from "@/features/desempenho/dados";
import { posicaoLabel } from "@/features/jogadores/labels";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatDataPorExtenso } from "@/lib/format";
import { formatPontos } from "@/lib/pontuacao";
import { FOCUS_RING } from "@/lib/ui";
import { cn } from "@/lib/utils";

// A tela /pelada mostra sempre a PRÓXIMA pelada em aberto, então este card não é
// da pelada exibida: ele é da pelada publicada mais recente em que a pessoa
// jogou. A votação abre quando o resultado é publicado e fecha 24h depois.
// Passado esse prazo o card vira o resultado e fica assim para sempre.

type Posicao = Database["public"]["Enums"]["posicao"];

const SECTION_LABEL = "font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary";

interface Participante {
  id: string;
  apelido: string;
  fotoUrl: string | null;
  posicao: Posicao | null;
  /** convidado sem conta não vota, mas pode receber voto */
  votante: boolean;
}

interface Dados {
  peladaId: string;
  data: string;
  fechaEm: number;
  participantes: Participante[];
  totalVotos: number;
  meuVotoEm: string | null;
  vencedores: { playerId: string; votos: number }[];
  desempenhos: DesempenhoPelada[];
}

function Foto({ p, size }: { p: Participante | undefined; size: number }) {
  if (p?.fotoUrl) {
    return (
      <img
        src={p.fotoUrl}
        alt={p.apelido}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <InitialsAvatar apelido={p?.apelido ?? "??"} size={size} />;
}

function faltam(ate: number, agora: number): string {
  const min = Math.max(0, Math.round((ate - agora) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function StatMvp({ rotulo, valor }: { rotulo: string; valor: string | number }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-2 text-center">
      <p className="num text-lg leading-tight text-foreground">{valor}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{rotulo}</p>
    </div>
  );
}

export function MvpCard() {
  const { player } = useAuth();
  const playerId = player?.id ?? null;

  const [dados, setDados] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [alvo, setAlvo] = useState<Participante | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const montadoRef = useRef(true);

  const carregar = useCallback(async () => {
    if (!playerId) {
      setDados(null);
      setLoading(false);
      return;
    }

    // 1) pelada publicada mais recente em que a pessoa jogou
    const { data: minhas } = await supabase
      .from("pelada_players")
      .select("pelada_id, peladas!inner(id, data, resultado, publicado_em)")
      .eq("player_id", playerId)
      .eq("peladas.resultado", "publicado");

    const alvoPelada = (minhas ?? [])
      .map((r) => r.peladas)
      .filter((p): p is NonNullable<typeof p> => !!p && !!p.publicado_em)
      .sort((a, b) => (a.publicado_em! < b.publicado_em! ? 1 : -1))[0];

    if (!alvoPelada) {
      setDados(null);
      setLoading(false);
      return;
    }

    const [{ data: parts }, { data: votos }, { data: winners }, desempenhos] = await Promise.all([
      supabase
        .from("pelada_players")
        .select("player_id, players(id, apelido, foto_url, profile_id, posicao_principal)")
        .eq("pelada_id", alvoPelada.id),
      supabase
        .from("mvp_votes")
        .select("voter_player_id, voted_player_id")
        .eq("pelada_id", alvoPelada.id),
      supabase.from("mvp_winners").select("player_id, votos").eq("pelada_id", alvoPelada.id),
      buscarDesempenhos({ peladaId: alvoPelada.id }).catch(() => [] as DesempenhoPelada[]),
    ]);

    const participantes: Participante[] = (parts ?? [])
      .filter((r) => r.players)
      .map((r) => ({
        id: r.player_id,
        apelido: r.players!.apelido,
        fotoUrl: r.players!.foto_url,
        posicao: r.players!.posicao_principal,
        votante: r.players!.profile_id !== null,
      }))
      .sort((a, b) => a.apelido.localeCompare(b.apelido, "pt-BR"));

    const meu = (votos ?? []).find((v) => v.voter_player_id === playerId);

    if (!montadoRef.current) return;
    setDados({
      peladaId: alvoPelada.id,
      data: alvoPelada.data,
      fechaEm: new Date(alvoPelada.publicado_em!).getTime() + 24 * 60 * 60 * 1000,
      participantes,
      totalVotos: (votos ?? []).length,
      meuVotoEm: meu?.voted_player_id ?? null,
      vencedores: (winners ?? [])
        .filter((w) => w.player_id)
        .map((w) => ({ playerId: w.player_id as string, votos: Number(w.votos ?? 0) })),
      desempenhos,
    });
    setLoading(false);
  }, [playerId]);

  useEffect(() => {
    montadoRef.current = true;
    setLoading(true);
    void carregar();
    return () => {
      montadoRef.current = false;
    };
  }, [carregar]);

  // relógio de minuto em minuto: atualiza a contagem e revela o resultado na hora
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const encerrada = dados !== null && agora >= dados.fechaEm;

  useEffect(() => {
    // assim que o prazo vira, busca o vencedor
    if (encerrada && dados && dados.vencedores.length === 0) void carregar();
  }, [encerrada, dados, carregar]);

  const votar = async () => {
    if (!alvo || !playerId || !dados || enviando) return;
    setEnviando(true);
    const { error } = await supabase.from("mvp_votes").insert({
      pelada_id: dados.peladaId,
      voter_player_id: playerId,
      voted_player_id: alvo.id,
    });
    if (error) {
      toast.error("Não foi possível registrar seu voto. " + error.message);
    } else {
      toast.success(`Voto em ${alvo.apelido} registrado.`);
      await carregar();
    }
    setEnviando(false);
    setAlvo(null);
  };

  if (loading) {
    return (
      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-3 w-40" />
        <Skeleton className="mt-4 h-[96px] w-full rounded-xl" />
      </section>
    );
  }

  if (!dados) return null;

  const votantes = dados.participantes.filter((p) => p.votante).length;
  const votadoPorMim = dados.participantes.find((p) => p.id === dados.meuVotoEm);
  const vencedores = dados.vencedores
    .map((v) => ({ p: dados.participantes.find((x) => x.id === v.playerId), votos: v.votos }))
    .filter((v): v is { p: Participante; votos: number } => !!v.p);
  const empate = vencedores.length > 1;

  if (encerrada) {
    return (
      <section className="animar-surgir mt-5 overflow-hidden rounded-2xl border border-primary/60 bg-surface">
        <div className="bg-primary/10 px-5 py-3">
          <p className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            <Crown size={14} aria-hidden="true" />
            {empate ? "MVPs da galera" : "MVP da galera"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDataPorExtenso(dados.data)} · votação encerrada
          </p>
        </div>

        {vencedores.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            A votação fechou sem nenhum voto. Fica para a próxima.
          </p>
        ) : (
          <div className="grid gap-4 p-5">
            {vencedores.map(({ p, votos }) => {
              const d = dados.desempenhos.find((x) => x.playerId === p.id);
              return (
                <div key={p.id} className="grid gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <Foto p={p} size={88} />
                      <span
                        className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        aria-hidden="true"
                      >
                        <Crown size={15} />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display text-2xl font-bold leading-tight text-foreground">
                        {p.apelido}
                      </p>
                      <p className="text-xs text-muted-foreground">{posicaoLabel(p.posicao)}</p>
                      <p className="mt-1 text-sm text-primary">
                        <span className="num">{votos}</span> {votos === 1 ? "voto" : "votos"} de{" "}
                        <span className="num">{votantes}</span>
                      </p>
                    </div>
                  </div>

                  {d && (
                    <div className="grid grid-cols-4 gap-2">
                      <StatMvp rotulo="Gols" valor={d.gols} />
                      <StatMvp rotulo="Assist." valor={d.assistencias} />
                      <StatMvp rotulo="Carrinhos" valor={d.carrinhos} />
                      <StatMvp rotulo="Pontos" valor={formatPontos(d.pontos)} />
                    </div>
                  )}

                  <Link
                    to="/jogadores/$id"
                    params={{ id: p.id }}
                    className={cn(
                      "flex min-h-[44px] items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:border-primary/40",
                      FOCUS_RING,
                    )}
                  >
                    Ver perfil de {p.apelido}
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {votadoPorMim && (
          <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            Você votou em {votadoPorMim.apelido}.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
      <p className={SECTION_LABEL}>MVP da galera</p>
      <p className="mt-1 text-xs text-muted-foreground">{formatDataPorExtenso(dados.data)}</p>

      <p className="mt-2 flex items-center gap-2 text-xs text-primary">
        <Timer size={13} aria-hidden="true" />
        Fecha em {faltam(dados.fechaEm, agora)}
      </p>

      {dados.meuVotoEm ? (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <Foto p={votadoPorMim} size={56} />
            <span className="text-sm text-foreground">
              Você votou em {votadoPorMim?.apelido ?? "—"}
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <span className="num">{dados.totalVotos}</span> de{" "}
            <span className="num">{votantes}</span> já votaram. O resultado aparece quando a votação
            fechar.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Quem foi o melhor em campo? O voto é único e não pode ser trocado nem retirado.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {dados.participantes
              .filter((p) => p.id !== playerId)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setAlvo(p)}
                  className={cn(
                    "flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 p-3 text-center transition-colors hover:border-primary/40",
                    FOCUS_RING,
                  )}
                >
                  <Foto p={p} size={56} />
                  <span className="w-full truncate text-sm text-foreground">{p.apelido}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      <AlertDialog open={!!alvo} onOpenChange={(o) => !o && setAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar voto em {alvo?.apelido}?</AlertDialogTitle>
            <AlertDialogDescription>
              É um voto só, e ele não pode ser trocado nem retirado depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={enviando}
              onClick={(e) => {
                e.preventDefault();
                void votar();
              }}
            >
              {enviando ? "Confirmando..." : "Confirmar voto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
