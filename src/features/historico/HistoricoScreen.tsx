import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { TopBar } from "@/components/layout/TopBar";
import { ErroCarregamento } from "@/components/layout/ErroCarregamento";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buscarDesempenhos,
  buscarJogadores,
  calcularDestaques,
  nomesDe,
} from "@/features/desempenho/dados";
import { supabase } from "@/integrations/supabase/client";
import { formatDataPorExtenso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/ui";

interface ItemHistorico {
  id: string;
  data: string;
  local: string;
  publicado: boolean;
  jogadores: number;
  gols: number;
  artilheiro: string | null;
  mvps: string[];
}

export function HistoricoScreen() {
  const [itens, setItens] = useState<ItemHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      setErro(false);
      try {
        const [peladasRes, desempenhos, jogadores, mvpsRes] = await Promise.all([
          supabase
            .from("peladas")
            .select("id, data, local, resultado")
            .eq("status", "finalizada")
            .order("data", { ascending: false }),
          buscarDesempenhos({}),
          buscarJogadores(),
          supabase.from("mvp_winners").select("pelada_id, player_id"),
        ]);
        if (peladasRes.error) throw peladasRes.error;
        if (!ativo) return;

        const porPelada = new Map<string, typeof desempenhos>();
        for (const d of desempenhos) {
          porPelada.set(d.peladaId, [...(porPelada.get(d.peladaId) ?? []), d]);
        }
        const mvps = new Map<string, string[]>();
        for (const m of mvpsRes.data ?? []) {
          if (!m.pelada_id || !m.player_id) continue;
          const apelido = jogadores.get(m.player_id)?.apelido;
          if (apelido) mvps.set(m.pelada_id, [...(mvps.get(m.pelada_id) ?? []), apelido]);
        }

        setItens(
          (peladasRes.data ?? []).map((p) => {
            const linhas = porPelada.get(p.id) ?? [];
            const art = calcularDestaques(linhas).find((d) => d.titulo === "Artilheiro");
            return {
              id: p.id,
              data: p.data,
              local: p.local,
              publicado: p.resultado === "publicado",
              jogadores: linhas.length,
              gols: linhas.reduce((s, l) => s + l.gols, 0),
              artilheiro: art ? `${nomesDe(art.playerIds, jogadores)} (${art.valor})` : null,
              mvps: mvps.get(p.id) ?? [],
            };
          }),
        );
      } catch {
        if (ativo) setErro(true);
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  return (
    <>
      <TopBar />

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground md:text-3xl">
          Histórico
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Todas as peladas encerradas.</p>
      </header>

      {erro ? (
        <div className="mt-5">
          <ErroCarregamento onRetry={() => setTentativa((t) => t + 1)} />
        </div>
      ) : loading ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[136px] rounded-2xl" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <div className="mt-8">
          <p className="text-sm text-foreground">Nenhuma pelada encerrada ainda.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Uma pelada entra no histórico quando o resultado é publicado na súmula.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {itens.map((item) => (
            <Link
              key={item.id}
              to="/historico/$peladaId"
              params={{ peladaId: item.id }}
              className={cn(
                "animar-surgir block rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/60",
                FOCUS_RING,
              )}
            >
              <p className="font-display text-base font-semibold text-foreground">
                {formatDataPorExtenso(item.data)}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{item.local}</p>

              {item.publicado ? (
                <div className="mt-4 flex items-end gap-6">
                  <span className="grid">
                    <span className="num text-xl text-foreground">{item.jogadores}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      jogadores
                    </span>
                  </span>
                  <span className="grid">
                    <span className="num text-xl text-primary">{item.gols}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      gols
                    </span>
                  </span>
                  {item.artilheiro && (
                    <span className="grid min-w-0">
                      <span className="truncate text-sm font-medium text-foreground">
                        {item.artilheiro}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        artilheiro
                      </span>
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">Encerrada sem resultado.</p>
              )}

              {item.mvps.length > 0 && (
                <span className="mt-4 inline-block rounded-full border border-azul/60 px-3 py-1 text-xs text-azul">
                  MVP da galera: {item.mvps.join(" e ")}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
