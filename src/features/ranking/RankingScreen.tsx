import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { TopBar } from "@/components/layout/TopBar";
import { ErroCarregamento } from "@/components/layout/ErroCarregamento";
import { Skeleton } from "@/components/ui/skeleton";
import { FOCUS_RING } from "@/lib/ui";

type StatsRow = Tables<"player_stats">;
type PlayerRow = Pick<Tables<"players">, "id" | "apelido" | "foto_url" | "ativo">;

type Periodo = "temporada" | "geral";
type Metrica = "geral" | "gols" | "assistencias" | "participacoes" | "vitorias" | "mvps";

const METRICAS: { id: Metrica; label: string }[] = [
  { id: "geral", label: "Geral" },
  { id: "gols", label: "Gols" },
  { id: "assistencias", label: "Assistências" },
  { id: "participacoes", label: "Participações" },
  { id: "vitorias", label: "Vitórias" },
  { id: "mvps", label: "MVPs" },
];

// Critério simples e transparente desta versão: ordenação direta por métricas,
// com desempates explícitos. A "Nota da Panela" com pesos entra depois —
// nenhum peso é aplicado agora.
function sortRows(metrica: Metrica, rows: StatsRow[]): StatsRow[] {
  const desc = (f: (r: StatsRow) => number) => (a: StatsRow, b: StatsRow) => f(b) - f(a);
  const n = (v: number | null) => v ?? 0;
  const cmp: Record<Metrica, (a: StatsRow, b: StatsRow) => number> = {
    geral: (a, b) =>
      desc((r) => n(r.participacoes_em_gols))(a, b) ||
      desc((r) => n(r.vitorias))(a, b) ||
      desc((r) => n(r.gols))(a, b) ||
      desc((r) => n(r.assistencias))(a, b),
    gols: (a, b) => desc((r) => n(r.gols))(a, b) || desc((r) => n(r.media_gols_por_jogo))(a, b),
    assistencias: (a, b) =>
      desc((r) => n(r.assistencias))(a, b) || desc((r) => n(r.media_assistencias_por_jogo))(a, b),
    participacoes: (a, b) =>
      desc((r) => n(r.participacoes_em_gols))(a, b) || desc((r) => n(r.gols))(a, b),
    vitorias: (a, b) => desc((r) => n(r.vitorias))(a, b) || desc((r) => n(r.aproveitamento))(a, b),
    mvps: (a, b) =>
      desc((r) => n(r.mvps))(a, b) || desc((r) => n(r.participacoes_em_gols))(a, b),
  };
  return [...rows].sort(cmp[metrica]);
}

const FILTER_PRINCIPAL: Record<Metrica, (r: StatsRow) => number> = {
  geral: (r) => r.jogos ?? 0,
  gols: (r) => r.gols ?? 0,
  assistencias: (r) => r.assistencias ?? 0,
  participacoes: (r) => r.participacoes_em_gols ?? 0,
  vitorias: (r) => r.vitorias ?? 0,
  mvps: (r) => r.mvps ?? 0,
};

const VALOR: Record<Metrica, (r: StatsRow) => number> = {
  geral: (r) => r.participacoes_em_gols ?? 0,
  gols: (r) => r.gols ?? 0,
  assistencias: (r) => r.assistencias ?? 0,
  participacoes: (r) => r.participacoes_em_gols ?? 0,
  vitorias: (r) => r.vitorias ?? 0,
  mvps: (r) => r.mvps ?? 0,
};

const SUBLINHA: Record<Metrica, (r: StatsRow) => string> = {
  geral: (r) => `${r.gols ?? 0} gols · ${r.assistencias ?? 0} assist`,
  gols: (r) => `${r.media_gols_por_jogo ?? 0} por jogo`,
  assistencias: (r) => `${r.media_assistencias_por_jogo ?? 0} por jogo`,
  participacoes: (r) => `${r.gols ?? 0} gols · ${r.assistencias ?? 0} assist`,
  vitorias: (r) => `${r.aproveitamento ?? 0}% de aproveitamento`,
  mvps: (r) => `em ${r.jogos ?? 0} jogos`,
};

const VAZIO: Record<Metrica, string> = {
  geral: "O ranking começa depois da primeira pelada.",
  gols: "A artilharia aparece depois dos primeiros gols.",
  assistencias: "Nenhuma assistência registrada ainda.",
  participacoes: "Ainda não há participações em gols.",
  vitorias: "Nenhuma partida decidida ainda.",
  mvps: "O primeiro MVP ainda está por vir.",
};

export function RankingScreen() {
  const [periodo, setPeriodo] = useState<Periodo>("temporada");
  const [metrica, setMetrica] = useState<Metrica>("geral");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [stats, setStats] = useState<StatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    async function load() {
      setLoading(true);
      setErro(false);
      // Máximo 3 requisições; o cruzamento é feito em memória.
      const playersRes = await supabase
        .from("players")
        .select("id, apelido, foto_url, ativo")
        .eq("ativo", true);

      let statsRes;
      if (periodo === "temporada") {
        const seasonRes = await supabase.from("seasons").select("id").eq("ativa", true).maybeSingle();
        if (seasonRes.error || playersRes.error) {
          if (ativo) {
            setErro(true);
            setLoading(false);
          }
          return;
        }
        if (!seasonRes.data) {
          if (ativo) {
            setPlayers(playersRes.data ?? []);
            setStats([]);
            setLoading(false);
          }
          return;
        }
        statsRes = await supabase.from("player_stats").select("*").eq("season_id", seasonRes.data.id);
      } else {
        statsRes = await supabase.from("player_stats_alltime").select("*");
      }
      if (!ativo) return;
      if (playersRes.error || statsRes.error) {
        setErro(true);
        setLoading(false);
        return;
      }
      setPlayers(playersRes.data ?? []);
      setStats((statsRes.data as StatsRow[] | null) ?? []);
      setLoading(false);
    }
    void load();
    return () => {
      ativo = false;
    };
  }, [periodo, tentativa]);

  const lista = useMemo(() => {
    const byId = new Map(players.map((p) => [p.id, p]));
    const rows = stats
      .filter((s) => s.player_id && byId.has(s.player_id))
      .filter((s) => FILTER_PRINCIPAL[metrica](s) > 0);
    return sortRows(metrica, rows).map((s) => ({ stats: s, player: byId.get(s.player_id!)! }));
  }, [stats, players, metrica]);

  return (
    <div className="flex flex-col gap-5">
      <TopBar />
      <h1 className="font-display text-2xl font-bold">Ranking</h1>

      {/* Período */}
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
              FOCUS_RING,
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Métrica */}
      <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {METRICAS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetrica(m.id)}
              className={cn(
                "min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors",
                metrica === m.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:border-primary/40",
                FOCUS_RING,
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {erro ? (
        <ErroCarregamento onRetry={() => setTentativa((t) => t + 1)} />
      ) : (
      <div className="rounded-2xl border border-border bg-surface">
        {loading ? (
          <div className="flex flex-col gap-4 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex h-10 items-center gap-3">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
                <Skeleton className="h-6 w-8" />
              </div>
            ))}
          </div>
        ) : lista.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">{VAZIO[metrica]}</p>
        ) : (
          <ul>
            {lista.map(({ stats: s, player }, i) => (
              <li key={s.player_id}>
                <Link
                  to="/jogadores/$id"
                  params={{ id: s.player_id! }}
                  className={cn(
                    "grid min-h-[56px] grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-5 py-2 transition-colors last:border-b-0 hover:bg-surface-2",
                    FOCUS_RING,
                  )}
                >
                  <span
                    className={cn(
                      "num w-6 text-center text-base",
                      i === 0 ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  {player.foto_url ? (
                    <img
                      src={player.foto_url}
                      alt={player.apelido}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar apelido={player.apelido} size={40} />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{player.apelido}</p>
                    <p className="truncate text-xs text-muted-foreground">{SUBLINHA[metrica](s)}</p>
                  </div>
                  <span className="num shrink-0 text-2xl text-foreground">{VALOR[metrica](s)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}
    </div>
  );
}
