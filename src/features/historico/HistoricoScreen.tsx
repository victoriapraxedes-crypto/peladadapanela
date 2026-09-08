import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { TopBar } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDataPorExtenso } from "@/lib/mock";

interface ItemHistorico {
  id: string;
  data: string;
  local: string;
  partidas: number;
  gols: number;
  mvps: string[];
}

export function HistoricoScreen() {
  const [itens, setItens] = useState<ItemHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    async function load() {
      setLoading(true);

      // 1) peladas finalizadas
      const { data: peladas } = await supabase
        .from("peladas")
        .select("id, data, local")
        .eq("status", "finalizada")
        .order("data", { ascending: false });

      if (!ativo) return;
      const lista = peladas ?? [];
      if (lista.length === 0) {
        setItens([]);
        setLoading(false);
        return;
      }
      const peladaIds = lista.map((p) => p.id);

      // 2) partidas dessas peladas
      const { data: matches } = await supabase
        .from("matches")
        .select("id, pelada_id")
        .in("pelada_id", peladaIds);
      const partidas = matches ?? [];
      const matchIds = partidas.map((m) => m.id);

      // 3) eventos dessas partidas
      const eventosRes = matchIds.length
        ? await supabase.from("match_events").select("match_id").in("match_id", matchIds)
        : { data: [] as { match_id: string }[] };

      // 4) MVPs
      const { data: mvps } = await supabase
        .from("mvp_winners")
        .select("pelada_id, player_id")
        .in("pelada_id", peladaIds);

      // 5) apelidos dos MVPs
      const mvpPlayerIds = Array.from(
        new Set((mvps ?? []).map((m) => m.player_id).filter((v): v is string => !!v)),
      );
      const playersRes = mvpPlayerIds.length
        ? await supabase.from("players").select("id, apelido").in("id", mvpPlayerIds)
        : { data: [] as { id: string; apelido: string }[] };

      if (!ativo) return;

      const apelidoPorId = new Map((playersRes.data ?? []).map((p) => [p.id, p.apelido]));
      const peladaPorMatch = new Map(partidas.map((m) => [m.id, m.pelada_id]));

      const partidasPorPelada = new Map<string, number>();
      partidas.forEach((m) => {
        partidasPorPelada.set(m.pelada_id, (partidasPorPelada.get(m.pelada_id) ?? 0) + 1);
      });

      const golsPorPelada = new Map<string, number>();
      (eventosRes.data ?? []).forEach((e) => {
        const pid = peladaPorMatch.get(e.match_id);
        if (!pid) return;
        golsPorPelada.set(pid, (golsPorPelada.get(pid) ?? 0) + 1);
      });

      const mvpsPorPelada = new Map<string, string[]>();
      (mvps ?? []).forEach((m) => {
        if (!m.pelada_id || !m.player_id) return;
        const apelido = apelidoPorId.get(m.player_id);
        if (!apelido) return;
        mvpsPorPelada.set(m.pelada_id, [...(mvpsPorPelada.get(m.pelada_id) ?? []), apelido]);
      });

      setItens(
        lista.map((p) => ({
          id: p.id,
          data: p.data,
          local: p.local,
          partidas: partidasPorPelada.get(p.id) ?? 0,
          gols: golsPorPelada.get(p.id) ?? 0,
          mvps: mvpsPorPelada.get(p.id) ?? [],
        })),
      );
      setLoading(false);
    }
    void load();
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <>
      <TopBar />

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground">
          Histórico
        </h1>
      </header>

      {loading ? (
        <div className="mt-5 grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[136px] rounded-2xl" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <div className="mt-8">
          <p className="text-sm text-foreground">Nenhuma pelada finalizada ainda.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Uma pelada entra no histórico quando o admin muda o status dela para finalizada.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {itens.map((item) => (
            <Link
              key={item.id}
              to="/historico/$peladaId"
              params={{ peladaId: item.id }}
              className="block rounded-2xl border border-border bg-surface p-5"
            >
              <p className="font-display text-base font-semibold text-foreground">
                {formatDataPorExtenso(item.data)}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{item.local}</p>

              <div className="mt-4 flex items-end gap-6">
                <span className="grid">
                  <span className="num text-base text-foreground">{item.partidas}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    partidas
                  </span>
                </span>
                <span className="grid">
                  <span className="num text-base text-foreground">{item.gols}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    gols
                  </span>
                </span>
              </div>

              {item.mvps.length > 0 && (
                <span className="mt-4 inline-block rounded-full border border-primary/40 px-3 py-1 text-xs text-primary">
                  MVP: {item.mvps.join(" e ")}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
