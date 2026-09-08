import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { TopBar } from "@/components/layout/TopBar";
import { ErroCarregamento } from "@/components/layout/ErroCarregamento";
import { Skeleton } from "@/components/ui/skeleton";
import { FOCUS_RING } from "@/lib/ui";
import { formatDataPorExtenso } from "@/lib/mock";
import { PE_LABEL, POSICAO_LABEL } from "@/features/jogadores/labels";

type PlayerRow = Tables<"players">;
type StatsRow = Tables<"player_stats">;
type PeladaRow = Pick<Tables<"peladas">, "id" | "data" | "local" | "status">;

type Periodo = "temporada" | "geral";

const n = (v: number | null | undefined) => v ?? 0;

// Mesmos critérios de ordenação e elegibilidade usados no /ranking.
function posicaoNoRanking(
  rows: StatsRow[],
  playerId: string,
  elegivel: (r: StatsRow) => boolean,
  cmp: (a: StatsRow, b: StatsRow) => number,
): number | null {
  const elegiveis = rows.filter(elegivel);
  if (!elegiveis.some((r) => r.player_id === playerId)) return null;
  const idx = [...elegiveis].sort(cmp).findIndex((r) => r.player_id === playerId);
  return idx < 0 ? null : idx + 1;
}

interface PerfilJogadorScreenProps {
  playerId: string;
  header?: ReactNode;
}

export function PerfilJogadorScreen({ playerId, header }: PerfilJogadorScreenProps) {
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [peladas, setPeladas] = useState<PeladaRow[]>([]);
  const [stats, setStats] = useState<StatsRow[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("temporada");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    async function load() {
      setLoading(true);
      setErro(false);
      // 3 requisições: jogador, temporada ativa e peladas (join único).
      const playerRes = await supabase.from("players").select("*").eq("id", playerId).maybeSingle();
      const seasonRes = await supabase.from("seasons").select("id").eq("ativa", true).maybeSingle();
      const peladasRes = await supabase
        .from("pelada_players")
        .select("peladas!inner(id, data, local, status)")
        .eq("player_id", playerId)
        .eq("peladas.status", "finalizada")
        .order("data", { referencedTable: "peladas", ascending: false })
        .limit(5);
      if (!ativo) return;
      setPlayer(playerRes.data ?? null);
      setSeasonId(seasonRes.data?.id ?? null);
      const linhas = (peladasRes.data ?? []) as unknown as { peladas: PeladaRow }[];
      setPeladas(
        linhas
          .map((l) => l.peladas)
          .filter(Boolean)
          .sort((a, b) => b.data.localeCompare(a.data))
          .slice(0, 5),
      );
      setLoading(false);
    }
    void load();
    return () => {
      ativo = false;
    };
  }, [playerId]);

  useEffect(() => {
    let ativo = true;
    async function loadStats() {
      // 1 requisição: a view inteira do período, cruzada em memória.
      if (periodo === "temporada") {
        if (!seasonId) {
          if (ativo) setStats([]);
          return;
        }
        const res = await supabase.from("player_stats").select("*").eq("season_id", seasonId);
        if (ativo) setStats(res.data ?? []);
      } else {
        const res = await supabase.from("player_stats_alltime").select("*");
        if (ativo) setStats((res.data as StatsRow[] | null) ?? []);
      }
    }
    void loadStats();
    return () => {
      ativo = false;
    };
  }, [periodo, seasonId]);

  const minhas = useMemo(
    () => stats.find((s) => s.player_id === playerId) ?? null,
    [stats, playerId],
  );

  const posicoes = useMemo(() => {
    const desc = (f: (r: StatsRow) => number) => (a: StatsRow, b: StatsRow) => f(b) - f(a);
    return {
      geral: posicaoNoRanking(
        stats,
        playerId,
        (r) => n(r.jogos) > 0,
        (a, b) =>
          desc((r) => n(r.participacoes_em_gols))(a, b) ||
          desc((r) => n(r.vitorias))(a, b) ||
          desc((r) => n(r.gols))(a, b) ||
          desc((r) => n(r.assistencias))(a, b),
      ),
      gols: posicaoNoRanking(
        stats,
        playerId,
        (r) => n(r.gols) > 0,
        (a, b) => desc((r) => n(r.gols))(a, b) || desc((r) => n(r.media_gols_por_jogo))(a, b),
      ),
      assistencias: posicaoNoRanking(
        stats,
        playerId,
        (r) => n(r.assistencias) > 0,
        (a, b) =>
          desc((r) => n(r.assistencias))(a, b) ||
          desc((r) => n(r.media_assistencias_por_jogo))(a, b),
      ),
    };
  }, [stats, playerId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <TopBar />
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex flex-col gap-5">
        <TopBar />
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-10">
          <p className="text-sm text-muted-foreground">Jogador não encontrado.</p>
          <Link
            to="/jogadores"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-border px-4 text-sm text-foreground"
          >
            Ver jogadores
          </Link>
        </div>
      </div>
    );
  }

  const pilulas: { texto: string; suave?: boolean }[] = [
    { texto: POSICAO_LABEL[player.posicao_principal] },
    { texto: PE_LABEL[player.pe_dominante] },
    ...(player.numero_preferido ? [{ texto: `#${player.numero_preferido}` }] : []),
    ...player.posicoes_secundarias.map((p) => ({ texto: POSICAO_LABEL[p], suave: true })),
  ];

  const detalhes: [string, string][] = [
    ["Vitórias", String(n(minhas?.vitorias))],
    ["Empates", String(n(minhas?.empates))],
    ["Derrotas", String(n(minhas?.derrotas))],
    ["Aproveitamento", `${n(minhas?.aproveitamento)}%`],
    ["Participações em gols", String(n(minhas?.participacoes_em_gols))],
    ["Gols contra", String(n(minhas?.gols_contra))],
    ["Média de gols por jogo", String(n(minhas?.media_gols_por_jogo))],
    ["Média de assistências por jogo", String(n(minhas?.media_assistencias_por_jogo))],
    ["MVPs", String(n(minhas?.mvps))],
  ];

  return (
    <div className="flex flex-col gap-5">
      <TopBar />

      {/* Identidade */}
      <div className="flex flex-col items-center gap-2">
        {player.foto_url ? (
          <img
            src={player.foto_url}
            alt={player.apelido}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <InitialsAvatar apelido={player.apelido} size={96} />
        )}
        <h1 className="text-center font-display text-2xl font-bold">{player.apelido}</h1>
        <p className="text-center text-sm text-muted-foreground">{player.nome}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {pilulas.map((p) => (
            <span
              key={p.texto}
              className={cn(
                "rounded-full border border-border px-3 py-1 text-xs",
                p.suave ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {p.texto}
            </span>
          ))}
        </div>
      </div>

      {header}

      {/* Destaque */}
      <div className="grid grid-cols-3 rounded-2xl border border-border bg-surface p-5">
        {(
          [
            ["Jogos", n(minhas?.jogos)],
            ["Gols", n(minhas?.gols)],
            ["Assistências", n(minhas?.assistencias)],
          ] as const
        ).map(([label, valor]) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span className="num text-3xl text-foreground">{valor}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Estatísticas */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["temporada", "Temporada"],
              ["geral", "Geral"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriodo(id)}
              className={cn(
                "flex min-h-[44px] items-center justify-center rounded-xl border text-sm font-medium transition-colors",
                periodo === id
                  ? "border-primary bg-surface-2 text-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:border-primary/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          {detalhes.map(([label, valor]) => (
            <div key={label} className="flex flex-col">
              <span className="num text-lg text-foreground">{valor}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Posições no ranking */}
      <div className="rounded-2xl border border-border bg-surface px-5">
        {(
          [
            ["Ranking geral", posicoes.geral],
            ["Artilharia", posicoes.gols],
            ["Assistências", posicoes.assistencias],
          ] as const
        ).map(([label, pos]) => (
          <div
            key={label}
            className="flex min-h-[56px] items-center justify-between border-b border-border last:border-b-0"
          >
            <span className="text-sm text-foreground">{label}</span>
            <span className="num text-lg text-primary">{pos ? `${pos}º` : "—"}</span>
          </div>
        ))}
      </div>

      {/* Peladas recentes */}
      <div className="rounded-2xl border border-border bg-surface">
        <h2 className="px-5 pt-5 font-display text-base font-semibold">Peladas recentes</h2>
        {peladas.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Nenhuma pelada registrada ainda.</p>
        ) : (
          <ul className="px-5">
            {peladas.map((p) => (
              <li key={p.id} className="border-b border-border py-3 last:border-b-0">
                <p className="text-sm text-foreground">{formatDataPorExtenso(p.data)}</p>
                <p className="text-xs text-muted-foreground">{p.local}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
