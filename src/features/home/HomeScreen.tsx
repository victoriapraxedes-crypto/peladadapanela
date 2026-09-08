import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, Users, History } from "lucide-react";
import { toast } from "sonner";

import { TopBar } from "@/components/layout/TopBar";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { formatDataPorExtenso } from "@/lib/mock";

interface PlayerInfo {
  id: string;
  apelido: string;
  fotoUrl: string | null;
}

interface StatRow {
  playerId: string;
  jogos: number;
  vitorias: number;
  gols: number;
  assistencias: number;
  participacoesEmGols: number;
}

interface DadosHome {
  stats: StatRow[];
  players: Map<string, PlayerInfo>;
  mvp: { playerId: string; data: string } | null;
}

function Foto({ p, size }: { p: PlayerInfo | undefined; size: number }) {
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

function useDadosHome() {
  const [dados, setDados] = useState<DadosHome | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("ativa", true)
        .limit(1)
        .maybeSingle();

      const [{ data: statRows }, { data: playerRows }, { data: winnerRows }, { data: peladaRows }] =
        await Promise.all([
        season
          ? supabase
              .from("player_stats")
              .select("player_id, jogos, vitorias, gols, assistencias, participacoes_em_gols")
              .eq("season_id", season.id)
          : Promise.resolve({ data: [] as never[] }),
        supabase.from("players").select("id, apelido, foto_url"),
        supabase.from("mvp_winners").select("player_id, pelada_id"),
        supabase
          .from("peladas")
          .select("id, data")
          .eq("status", "finalizada")
          .order("data", { ascending: false }),
      ]);

      if (!ativo) return;

      const players = new Map<string, PlayerInfo>();
      for (const p of playerRows ?? []) {
        players.set(p.id, { id: p.id, apelido: p.apelido, fotoUrl: p.foto_url });
      }

      const stats: StatRow[] = (statRows ?? [])
        .filter((s) => s.player_id)
        .map((s) => ({
          playerId: s.player_id as string,
          jogos: s.jogos ?? 0,
          vitorias: s.vitorias ?? 0,
          gols: s.gols ?? 0,
          assistencias: s.assistencias ?? 0,
          participacoesEmGols: s.participacoes_em_gols ?? 0,
        }));

      // peladas já vêm da mais recente para a mais antiga; pega a primeira que tem vencedor
      const peladaComMvp = (peladaRows ?? []).find((pl) =>
        (winnerRows ?? []).some((w) => w.pelada_id === pl.id && w.player_id),
      );
      const vencedor = peladaComMvp
        ? (winnerRows ?? []).find((w) => w.pelada_id === peladaComMvp.id && w.player_id)
        : undefined;

      setDados({
        stats,
        players,
        mvp:
          peladaComMvp && vencedor
            ? { playerId: vencedor.player_id as string, data: peladaComMvp.data }
            : null,
      });
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return dados;
}

interface PeladaAtual {
  id: string;
  data: string;
  horario: string;
  local: string;
}

interface Confirmado {
  playerId: string;
  apelido: string;
}

function CardFrame({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-border bg-surface p-5">{children}</section>;
}

function NextPeladaCard() {
  const { player } = useAuth();
  const [pelada, setPelada] = useState<PeladaAtual | null>(null);
  const [confirmados, setConfirmados] = useState<Confirmado[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const hojeISO = new Date().toISOString().slice(0, 10);

  const fetchConfirmados = useCallback(async (peladaId: string) => {
    const { data } = await supabase
      .from("pelada_players")
      .select("player_id, players(id, apelido)")
      .eq("pelada_id", peladaId);

    setConfirmados(
      (data ?? []).map((row) => ({
        playerId: row.player_id,
        apelido: row.players?.apelido ?? "??",
      })),
    );
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("peladas")
        .select("id, data, horario, local, seasons(nome)")
        .gte("data", hojeISO)
        .neq("status", "finalizada")
        .order("data", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!ativo) return;
      if (!data) {
        setPelada(null);
        setConfirmados([]);
        setLoading(false);
        return;
      }
      setPelada({ id: data.id, data: data.data, horario: data.horario, local: data.local });
      await fetchConfirmados(data.id);
      if (ativo) setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [hojeISO, fetchConfirmados]);

  useEffect(() => {
    if (!pelada) return;
    const channel = supabase
      .channel(`pelada_players:${pelada.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pelada_players",
          filter: `pelada_id=eq.${pelada.id}`,
        },
        () => {
          void fetchConfirmados(pelada.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pelada, fetchConfirmados]);

  if (loading) {
    return (
      <CardFrame>
        <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary">
          Próxima pelada
        </p>
        <Skeleton className="mt-3 h-7 w-3/4" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-5 h-10 w-32" />
        <Skeleton className="mt-3 h-8 w-40" />
        <Skeleton className="mt-5 h-[52px] w-full rounded-xl" />
      </CardFrame>
    );
  }

  if (!pelada) {
    return (
      <CardFrame>
        <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary">
          Próxima pelada
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground">
          Nenhuma pelada marcada
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Assim que a próxima for aberta ela aparece aqui.
        </p>
      </CardFrame>
    );
  }

  const total = confirmados.length;
  const visiveis = confirmados.slice(0, 6);
  const restantes = total - visiveis.length;
  const confirmado = !!player && confirmados.some((c) => c.playerId === player.id);

  const handleToggle = async () => {
    if (!player || enviando) return;
    setEnviando(true);
    const anterior = confirmados;

    if (confirmado) {
      setConfirmados((c) => c.filter((x) => x.playerId !== player.id));
      const { error } = await supabase
        .from("pelada_players")
        .delete()
        .eq("pelada_id", pelada.id)
        .eq("player_id", player.id);
      if (error) {
        setConfirmados(anterior);
        toast.error(error.message);
      }
    } else {
      setConfirmados((c) => [...c, { playerId: player.id, apelido: player.apelido }]);
      const { error } = await supabase
        .from("pelada_players")
        .insert({ pelada_id: pelada.id, player_id: player.id });
      if (error) {
        setConfirmados(anterior);
        toast.error(error.message);
      }
    }

    await fetchConfirmados(pelada.id);
    setEnviando(false);
  };

  return (
    <CardFrame>
      <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary">
        Próxima pelada
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground">
        {formatDataPorExtenso(pelada.data)}
      </h2>
      <p className="mt-1 truncate text-sm text-muted-foreground">
        {pelada.horario} · {pelada.local}
      </p>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="num text-4xl text-foreground">{total}</span>
        <span className="text-sm text-muted-foreground">confirmados</span>
      </div>

      {total === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Ninguém confirmou ainda. Seja o primeiro.</p>
      ) : (
        <div className="mt-3 flex items-center">
          {visiveis.map((c, i) => (
            <span
              key={c.playerId}
              className="rounded-full ring-2 ring-surface"
              style={{ marginLeft: i === 0 ? 0 : -8 }}
            >
              <InitialsAvatar apelido={c.apelido} size={32} />
            </span>
          ))}
          {restantes > 0 && (
            <span
              className="inline-flex h-8 items-center justify-center rounded-full bg-surface-2 px-2 text-xs font-semibold text-muted-foreground ring-2 ring-surface"
              style={{ marginLeft: -8 }}
            >
              +{restantes}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={enviando}
        className={
          confirmado
            ? "mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-primary bg-transparent font-display text-sm font-semibold uppercase tracking-[-0.01em] text-foreground disabled:opacity-60"
            : "mt-5 flex h-[52px] w-full items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim disabled:opacity-60"
        }
      >
        {confirmado && <Check size={18} className="text-success" />}
        {confirmado ? "Presença confirmada" : "Confirmar presença"}
      </button>
    </CardFrame>
  );
}

function Destaques({ dados }: { dados: DadosHome | null }) {
  if (!dados) {
    return (
      <section className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[132px] rounded-2xl" />
        <Skeleton className="h-[132px] rounded-2xl" />
      </section>
    );
  }

  const comGols = dados.stats.filter((s) => s.gols > 0);
  const artilheiro = [...comGols].sort((a, b) => {
    if (b.gols !== a.gols) return b.gols - a.gols;
    const pa = dados.players.get(a.playerId)?.apelido ?? "";
    const pb = dados.players.get(b.playerId)?.apelido ?? "";
    return pa.localeCompare(pb, "pt-BR");
  })[0];
  const artPlayer = artilheiro ? dados.players.get(artilheiro.playerId) : undefined;
  const mvpPlayer = dados.mvp ? dados.players.get(dados.mvp.playerId) : undefined;
  const mvpData = dados.mvp?.data.split("-");

  return (
    <section className="grid grid-cols-2 gap-3">
      <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Artilheiro
        </p>
        {artilheiro ? (
          <>
            <div className="mt-3 flex min-w-0 items-center gap-2">
              <Foto p={artPlayer} size={32} />
              <span className="truncate text-sm font-medium text-foreground">
                {artPlayer?.apelido}
              </span>
            </div>
            <p className="mt-3">
              <span className="num text-2xl text-foreground">{artilheiro.gols}</span>{" "}
              <span className="text-xs text-muted-foreground">gols</span>
            </p>
          </>
        ) : (
          <p className="mt-3 flex min-h-[76px] items-center text-xs text-muted-foreground">
            A artilharia aparece depois dos primeiros gols.
          </p>
        )}
      </div>

      <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          MVP recente
        </p>
        {dados.mvp ? (
          <>
            <div className="mt-3 flex min-w-0 items-center gap-2">
              <Foto p={mvpPlayer} size={32} />
              <span className="truncate text-sm font-medium text-foreground">
                {mvpPlayer?.apelido}
              </span>
            </div>
            <p className="mt-3 truncate text-xs text-muted-foreground">
              Pelada de {mvpData?.[2]}/{mvpData?.[1]}
            </p>
          </>
        ) : (
          <p className="mt-3 flex min-h-[76px] items-center text-xs text-muted-foreground">
            O primeiro MVP ainda está por vir.
          </p>
        )}
      </div>
    </section>
  );
}

function RankingResumido({ dados }: { dados: DadosHome | null }) {
  if (!dados) {
    return <Skeleton className="h-[280px] w-full rounded-2xl" />;
  }

  // Mesmo critério do ranking geral da /ranking.
  const top = dados.stats
    .filter((s) => s.jogos > 0)
    .sort(
      (a, b) =>
        b.participacoesEmGols - a.participacoesEmGols ||
        b.vitorias - a.vitorias ||
        b.gols - a.gols ||
        b.assistencias - a.assistencias,
    )
    .slice(0, 5);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <h3 className="truncate font-display text-base font-semibold text-foreground">
          Ranking geral
        </h3>
        <Link to="/ranking" className="text-xs text-muted-foreground hover:text-foreground">
          Ver tudo
        </Link>
      </div>

      {top.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          O ranking começa depois da primeira pelada.
        </p>
      ) : (
        <ul className="mt-3">
          {top.map((s, i) => {
            const p = dados.players.get(s.playerId);
            return (
              <li key={s.playerId} className="border-b border-border last:border-b-0">
                <Link
                  to="/jogadores/$id"
                  params={{ id: s.playerId }}
                  className="grid grid-cols-[1.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 py-3"
                >
                  <span
                    className={
                      i === 0 ? "num text-base text-primary" : "num text-base text-muted-foreground"
                    }
                  >
                    {i + 1}
                  </span>
                  <Foto p={p} size={32} />
                  <span className="truncate text-sm text-foreground">{p?.apelido}</span>
                  <span className="num text-sm text-foreground">{s.participacoesEmGols}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function AcessoRapido() {
  const itemClass =
    "grid min-h-[56px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground hover:border-primary/40";
  return (
    <section className="grid gap-3">
      <Link to="/jogadores" className={itemClass}>
        <Users size={18} className="text-muted-foreground" />
        <span className="truncate text-left">Jogadores</span>
        <ChevronRight size={18} className="text-muted-foreground" />
      </Link>
      <Link to="/historico" className={itemClass}>
        <History size={18} className="text-muted-foreground" />
        <span className="truncate text-left">Histórico</span>
        <ChevronRight size={18} className="text-muted-foreground" />
      </Link>
    </section>
  );
}

export function HomeScreen() {
  const dados = useDadosHome();
  return (
    <>
      <TopBar />
      <div className="grid gap-6">
        <NextPeladaCard />
        <Destaques dados={dados} />
        <RankingResumido dados={dados} />
        <AcessoRapido />
      </div>
    </>
  );
}
