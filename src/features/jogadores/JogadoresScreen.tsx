import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { TopBar } from "@/components/layout/TopBar";
import { ErroCarregamento } from "@/components/layout/ErroCarregamento";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { POSICAO_LABEL } from "@/features/jogadores/labels";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/ui";

type PlayerRow = Pick<
  Tables<"players">,
  "id" | "nome" | "apelido" | "foto_url" | "posicao_principal"
>;
type StatsRow = Tables<"player_stats">;

function normalizar(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function JogadoresScreen() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [stats, setStats] = useState<StatsRow[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    async function load() {
      setLoading(true);
      setErro(false);
      // No máximo 3 requisições; o cruzamento é feito em memória.
      const playersRes = await supabase
        .from("players")
        .select("id, nome, apelido, foto_url, posicao_principal")
        .eq("ativo", true);
      const seasonRes = await supabase.from("seasons").select("id").eq("ativa", true).maybeSingle();
      const statsRes = seasonRes.data
        ? await supabase.from("player_stats").select("*").eq("season_id", seasonRes.data.id)
        : null;
      if (!ativo) return;
      if (playersRes.error || seasonRes.error || statsRes?.error) {
        setErro(true);
        setLoading(false);
        return;
      }
      setPlayers(playersRes.data ?? []);
      setStats(statsRes?.data ?? []);
      setLoading(false);
    }
    void load();
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const lista = useMemo(() => {
    const byId = new Map(stats.filter((s) => s.player_id).map((s) => [s.player_id!, s]));
    const termo = normalizar(busca.trim());
    return [...players]
      .filter(
        (p) =>
          termo === "" ||
          normalizar(p.nome).includes(termo) ||
          normalizar(p.apelido).includes(termo),
      )
      .sort((a, b) => a.apelido.localeCompare(b.apelido, "pt-BR"))
      .map((p) => ({ player: p, stats: byId.get(p.id) ?? null }));
  }, [players, stats, busca]);

  return (
    <div className="flex flex-col gap-5">
      <TopBar />

      <div>
        <h1 className="font-display text-2xl font-bold">Jogadores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="num">{players.length}</span> jogadores ativos
        </p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou apelido"
          aria-label="Buscar por nome ou apelido"
          className={cn(
            "h-[52px] w-full rounded-xl border border-border bg-surface-2 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50",
            FOCUS_RING,
          )}
        />
      </div>

      {erro ? (
        <ErroCarregamento onRetry={() => setTentativa((t) => t + 1)} />
      ) : (
      <div className="rounded-2xl border border-border bg-surface">
        {loading ? (
          <div className="flex flex-col gap-4 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex h-[44px] items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-10">
            <p className="text-center text-sm text-muted-foreground">
              Nenhum jogador cadastrado ainda.
            </p>
            {isAdmin ? (
              <Link
                to="/admin/jogadores"
                className={cn(
                  "inline-flex min-h-[44px] items-center rounded-xl border border-border px-4 text-sm text-foreground transition-colors hover:border-primary/40",
                  FOCUS_RING,
                )}
              >
                Cadastrar jogadores
              </Link>
            ) : null}
          </div>
        ) : lista.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            Ninguém encontrado com esse nome.
          </p>
        ) : (
          <ul>
            {lista.map(({ player, stats: s }) => (
              <li key={player.id}>
                <Link
                  to="/jogadores/$id"
                  params={{ id: player.id }}
                  className={cn(
                    "flex min-h-[56px] items-center gap-3 border-b border-border px-4 py-2 transition-colors last:border-b-0 hover:bg-surface-2 sm:px-5",
                    FOCUS_RING,
                  )}
                >
                  {player.foto_url ? (
                    <img
                      src={player.foto_url}
                      alt={player.apelido}
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar apelido={player.apelido} size={44} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{player.apelido}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {POSICAO_LABEL[player.posicao_principal]}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2 sm:gap-4">
                    {(
                      [
                        ["Jogos", s?.jogos ?? 0],
                        ["Gols", s?.gols ?? 0],
                        ["Assist", s?.assistencias ?? 0],
                      ] as const
                    ).map(([label, valor]) => (
                      <div key={label} className="flex w-9 flex-col items-center sm:w-10">
                        <span className="num text-base text-foreground">{valor}</span>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
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
