import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { TopBar } from "@/components/layout/TopBar";
import { ErroCarregamento } from "@/components/layout/ErroCarregamento";
import { Skeleton } from "@/components/ui/skeleton";
import { FOCUS_RING } from "@/lib/ui";
import { formatDataPorExtenso, hojeLocalISO } from "@/lib/format";
import { formatPontos } from "@/lib/pontuacao";
import { PE_LABEL, POSICAO_LABEL, posicaoLabel } from "@/features/jogadores/labels";
import { useAuth } from "@/features/auth/AuthProvider";
import { BotaoCompartilhar } from "@/features/compartilhar/BotaoCompartilhar";
import { gerarCardJogador } from "@/features/compartilhar/cards";
import {
  AvisoSuspensao,
  FotoJogador,
  GraficoEvolucao,
  SECTION_LABEL,
  StatTile,
  Variacao,
} from "@/features/desempenho/componentes";
import {
  buscarDesempenhos,
  buscarMinhaSuspensao,
  buscarRanking,
  buscarTemporadas,
  type DesempenhoPelada,
  type LinhaRanking,
  type SuspensaoPropria,
  type Temporada,
} from "@/features/desempenho/dados";

type PlayerRow = Tables<"players">;

const GERAL = "geral";

interface PerfilJogadorScreenProps {
  playerId: string;
  header?: ReactNode;
}

export function PerfilJogadorScreen({ playerId, header }: PerfilJogadorScreenProps) {
  const { player: eu } = useAuth();
  const ehEu = eu?.id === playerId;
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [escopo, setEscopo] = useState<string>(GERAL);
  const [todas, setTodas] = useState<DesempenhoPelada[]>([]);
  const [locais, setLocais] = useState<Map<string, string>>(new Map());
  const [ranking, setRanking] = useState<LinhaRanking[]>([]);
  const [mvps, setMvps] = useState(0);
  const [suspensao, setSuspensao] = useState<SuspensaoPropria | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      setErro(false);
      try {
        const [playerRes, ts, desempenhos, mvpRes, susp] = await Promise.all([
          supabase.from("players").select("*").eq("id", playerId).maybeSingle(),
          buscarTemporadas(),
          buscarDesempenhos({ playerId }),
          supabase.from("mvp_winners").select("pelada_id").eq("player_id", playerId),
          ehEu ? buscarMinhaSuspensao(playerId, hojeLocalISO()) : Promise.resolve(null),
        ]);
        if (playerRes.error) throw playerRes.error;
        const ids = desempenhos.map((d) => d.peladaId);
        const peladasRes = ids.length
          ? await supabase.from("peladas").select("id, local").in("id", ids)
          : { data: [] as { id: string; local: string }[] };
        if (!ativo) return;
        setPlayer(playerRes.data ?? null);
        setTemporadas(ts);
        setTodas(desempenhos);
        setLocais(new Map((peladasRes.data ?? []).map((p) => [p.id, p.local])));
        setMvps((mvpRes.data ?? []).length);
        setSuspensao(susp);
        setEscopo(ts.find((t) => t.ativa)?.id ?? GERAL);
      } catch {
        if (ativo) setErro(true);
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [playerId, ehEu, tentativa]);

  useEffect(() => {
    let ativo = true;
    buscarRanking(escopo === GERAL ? null : escopo)
      .then((r) => {
        if (ativo) setRanking(r);
      })
      .catch(() => {
        if (ativo) setRanking([]);
      });
    return () => {
      ativo = false;
    };
  }, [escopo]);

  const doPeriodo = useMemo(
    () => (escopo === GERAL ? todas : todas.filter((d) => d.seasonId === escopo)),
    [todas, escopo],
  );
  const total = useMemo(
    () =>
      doPeriodo.reduce(
        (acc, d) => ({
          pontos: acc.pontos + d.pontos,
          gols: acc.gols + d.gols,
          assistencias: acc.assistencias + d.assistencias,
          carrinhos: acc.carrinhos + d.carrinhos,
        }),
        { pontos: 0, gols: 0, assistencias: 0, carrinhos: 0 },
      ),
    [doPeriodo],
  );
  const linha = ranking.find((r) => r.playerId === playerId) ?? null;
  const melhor = doPeriodo.length ? Math.max(...doPeriodo.map((d) => d.pontos)) : null;
  const nomePeriodo =
    escopo === GERAL ? "Histórico geral" : (temporadas.find((t) => t.id === escopo)?.nome ?? "");

  if (erro) {
    return (
      <div className="flex flex-col gap-5">
        <TopBar />
        <ErroCarregamento onRetry={() => setTentativa((t) => t + 1)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <TopBar />
        <Skeleton className="h-40 w-full rounded-2xl" />
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
            className={cn(
              "inline-flex min-h-[44px] items-center rounded-xl border border-border px-4 text-sm text-foreground transition-colors hover:border-primary/40",
              FOCUS_RING,
            )}
          >
            Ver jogadores
          </Link>
        </div>
      </div>
    );
  }

  const pilulas: { texto: string; suave?: boolean }[] = [
    ...(player.profile_id ? [] : [{ texto: "Convidado" }]),
    { texto: posicaoLabel(player.posicao_principal) },
    { texto: PE_LABEL[player.pe_dominante] },
    ...(player.numero_preferido ? [{ texto: `#${player.numero_preferido}` }] : []),
    ...player.posicoes_secundarias.map((p) => ({ texto: POSICAO_LABEL[p], suave: true })),
  ];

  const recentes = [...doPeriodo].reverse();

  return (
    <div className="flex flex-col gap-5">
      <TopBar />

      {suspensao && <AvisoSuspensao suspensao={suspensao} />}

      <section className="animar-surgir overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="h-20 bg-gradient-to-br from-azul via-surface-2 to-primary/60" />
        <div className="-mt-12 flex flex-col items-center gap-2 px-5 pb-5">
          <FotoJogador
            apelido={player.apelido}
            fotoUrl={player.foto_url}
            size={96}
            className="rounded-full ring-4 ring-primary"
          />
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
      </section>

      {header}

      <nav aria-label="Período" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {[...temporadas.map((t) => ({ id: t.id, nome: t.nome })), { id: GERAL, nome: "Geral" }].map(
          (t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={escopo === t.id}
              onClick={() => setEscopo(t.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                escopo === t.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40",
                FOCUS_RING,
              )}
            >
              {t.nome}
            </button>
          ),
        )}
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <p className={SECTION_LABEL}>{nomePeriodo}</p>
            <p className="flex items-center gap-1 text-sm text-foreground">
              <span className="num text-2xl text-primary">{linha ? `${linha.posicao}º` : "–"}</span>
              {linha && <Variacao valor={linha.variacao} />}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTile
              rotulo="Pontos"
              valor={formatPontos(total.pontos)}
              destaque
              negativo={total.pontos < 0}
            />
            <StatTile rotulo="Jogos" valor={doPeriodo.length} />
            <StatTile rotulo="Gols" valor={total.gols} />
            <StatTile rotulo="Assistências" valor={total.assistencias} />
            <StatTile rotulo="Carrinhos" valor={total.carrinhos} negativo={total.carrinhos > 0} />
            <StatTile rotulo="MVPs da galera" valor={mvps} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <p>
              Média por pelada:{" "}
              <span className="num text-sm text-foreground">
                {doPeriodo.length ? (total.pontos / doPeriodo.length).toFixed(1) : "0"}
              </span>
            </p>
            <p className="text-right">
              Melhor pelada:{" "}
              <span className="num text-sm text-foreground">
                {melhor === null ? "–" : formatPontos(melhor)}
              </span>
            </p>
          </div>
          {doPeriodo.length > 0 && (
            <BotaoCompartilhar
              className="mt-4 w-full"
              rotulo={ehEu ? "Compartilhar meu card" : "Compartilhar card"}
              nomeArquivo={`pelada-${player.apelido.toLowerCase()}.png`}
              titulo={`${player.apelido} na Pelada da Panela`}
              texto={`${player.apelido}: ${total.pontos} pontos (${nomePeriodo})`}
              gerar={() =>
                gerarCardJogador({
                  apelido: player.apelido,
                  periodo: nomePeriodo,
                  posicao: linha?.posicao ?? null,
                  pontos: total.pontos,
                  jogos: doPeriodo.length,
                  gols: total.gols,
                  assistencias: total.assistencias,
                  carrinhos: total.carrinhos,
                  evolucao: doPeriodo.map((d) => d.pontos),
                  fotoUrl: player.foto_url,
                })
              }
            />
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <p className={SECTION_LABEL}>Evolução por pelada</p>
          <div className="mt-3">
            <GraficoEvolucao pontos={doPeriodo.slice(-16)} altura={120} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-surface">
        <h2 className="px-5 pt-5 font-display text-base font-semibold">Pelada a pelada</h2>
        {recentes.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            Nenhum resultado publicado neste período.
          </p>
        ) : (
          <ul className="px-5 pb-2">
            {recentes.map((d) => (
              <li key={d.peladaId} className="border-b border-border last:border-b-0">
                <Link
                  to="/historico/$peladaId"
                  params={{ peladaId: d.peladaId }}
                  className={cn(
                    "grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3",
                    FOCUS_RING,
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">
                      {formatDataPorExtenso(d.data)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {locais.get(d.peladaId) ?? ""}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {d.gols}G · {d.assistencias}A
                    {d.carrinhos > 0 && <span className="text-destructive"> · {d.carrinhos}C</span>}
                  </span>
                  <span
                    className={cn(
                      "num w-12 text-right text-lg",
                      d.pontos < 0 ? "text-destructive" : "text-primary",
                    )}
                  >
                    {formatPontos(d.pontos)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
