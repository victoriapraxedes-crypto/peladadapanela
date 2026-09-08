import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { TopBar } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/features/pelada/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MatchStatus = Database["public"]["Enums"]["match_status"];

interface Partida {
  id: string;
  timeA: string;
  timeB: string;
  placarA: number;
  placarB: number;
  status: MatchStatus;
  inicioEm: string | null;
}

const BTN_SECONDARY =
  "flex h-[52px] items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-medium text-foreground";

function formatHora(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function PartidaScreen({ id }: { id: string }) {
  const [partida, setPartida] = useState<Partida | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("matches")
      .select(
        "id, placar_a, placar_b, status, inicio_em, team_a:team_a_id(nome), team_b:team_b_id(nome)",
      )
      .eq("id", id)
      .maybeSingle();

    if (!data) {
      setPartida(null);
      return;
    }
    setPartida({
      id: data.id,
      timeA: data.team_a?.nome ?? "Time A",
      timeB: data.team_b?.nome ?? "Time B",
      placarA: data.placar_a,
      placarB: data.placar_b,
      status: data.status,
      inicioEm: data.inicio_em,
    });
  }, [id]);

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

  useEffect(() => {
    const channel = supabase
      .channel(`partida:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${id}` },
        () => {
          void carregar();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, carregar]);

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
          <Link to="/pelada" className={`${BTN_SECONDARY} mt-5 w-full`}>
            Voltar para a pelada
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <TopBar />

      <p className="mt-2 text-center">
        <StatusBadge status={partida.status} />
      </p>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <h2 className="text-center font-display text-base font-semibold text-foreground">
            {partida.timeA}
          </h2>
          <p className="num text-6xl leading-none text-foreground">
            {partida.placarA}
            <span className="mx-2 text-muted-foreground">–</span>
            {partida.placarB}
          </p>
          <h2 className="text-center font-display text-base font-semibold text-foreground">
            {partida.timeB}
          </h2>
        </div>

        {partida.inicioEm && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Início às {formatHora(partida.inicioEm)}
          </p>
        )}
      </section>

      <div className="mt-5 rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
        Os botões de gol entram na próxima etapa.
      </div>

      <Link to="/pelada" className={`${BTN_SECONDARY} mt-5 w-full`}>
        Voltar para a pelada
      </Link>
    </>
  );
}
