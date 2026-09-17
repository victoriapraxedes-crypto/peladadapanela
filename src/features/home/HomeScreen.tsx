import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, History, Trophy, Users } from "lucide-react";

import { TopBar } from "@/components/layout/TopBar";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { ErroCarregamento } from "@/components/layout/ErroCarregamento";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { BotaoCompartilhar } from "@/features/compartilhar/BotaoCompartilhar";
import { gerarCardJogador, gerarCardPelada } from "@/features/compartilhar/cards";
import {
  AvisoSuspensao,
  FotoJogador,
  GraficoEvolucao,
  RegraPontuacao,
  SECTION_LABEL,
  StatTile,
  Variacao,
} from "@/features/desempenho/componentes";
import {
  buscarDesempenhos,
  buscarJogadores,
  buscarMinhaSuspensao,
  buscarRanking,
  buscarTemporadas,
  buscarUltimaPeladaPublicada,
  calcularDestaques,
  nomesDe,
  type DesempenhoPelada,
  type JogadorBasico,
  type LinhaRanking,
  type SuspensaoPropria,
  type Temporada,
  type UltimaPelada,
} from "@/features/desempenho/dados";
import { buscarPeladasAbertas, escolherPeladaAtual } from "@/features/pelada/peladaAtual";
import { supabase } from "@/integrations/supabase/client";
import { formatDataPorExtenso, hojeLocalISO } from "@/lib/format";
import { formatPontos } from "@/lib/pontuacao";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/ui";

interface DadosPainel {
  temporada: Temporada | null;
  ranking: LinhaRanking[];
  jogadores: Map<string, JogadorBasico>;
  minhas: DesempenhoPelada[];
  ultima: UltimaPelada | null;
  daUltima: DesempenhoPelada[];
  mvp: { playerId: string; data: string } | null;
  suspensao: SuspensaoPropria | null;
}

function usePainel(playerId: string | null) {
  const [dados, setDados] = useState<DadosPainel | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setErro(false);
      try {
        const [temporadas, jogadores, ultima, suspensao] = await Promise.all([
          buscarTemporadas(),
          buscarJogadores(),
          buscarUltimaPeladaPublicada(),
          playerId ? buscarMinhaSuspensao(playerId, hojeLocalISO()) : Promise.resolve(null),
        ]);
        const temporada = temporadas.find((t) => t.ativa) ?? temporadas[0] ?? null;
        const [ranking, minhas, daUltima, winnersRes, finalizadasRes] = await Promise.all([
          temporada ? buscarRanking(temporada.id) : Promise.resolve([]),
          playerId && temporada
            ? buscarDesempenhos({ playerId, seasonId: temporada.id })
            : Promise.resolve([]),
          ultima ? buscarDesempenhos({ peladaId: ultima.id }) : Promise.resolve([]),
          supabase.from("mvp_winners").select("player_id, pelada_id"),
          supabase
            .from("peladas")
            .select("id, data")
            .eq("status", "finalizada")
            .order("data", { ascending: false }),
        ]);
        if (!ativo) return;
        // MVP da pelada finalizada mais recente que já tem vencedor (empate: o primeiro).
        const winners = winnersRes.data ?? [];
        const comMvp = (finalizadasRes.data ?? []).find((p) =>
          winners.some((w) => w.pelada_id === p.id && w.player_id),
        );
        const vencedor = comMvp
          ? winners.find((w) => w.pelada_id === comMvp.id && w.player_id)
          : undefined;
        setDados({
          temporada,
          ranking,
          jogadores,
          minhas,
          ultima,
          daUltima,
          suspensao,
          mvp:
            comMvp && vencedor?.player_id
              ? { playerId: vencedor.player_id, data: comMvp.data }
              : null,
        });
      } catch {
        if (ativo) setErro(true);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [playerId, tentativa]);

  return { dados, erro, recarregar: () => setTentativa((t) => t + 1) };
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
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const hojeISO = hojeLocalISO();

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
      setErro(false);
      const { data: abertas, error } = await buscarPeladasAbertas();

      if (!ativo) return;
      const data = escolherPeladaAtual(abertas ?? [], hojeISO);
      if (error) {
        setErro(true);
        setPelada(null);
        setConfirmados([]);
        setLoading(false);
        return;
      }
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
  }, [hojeISO, fetchConfirmados, tentativa]);

  const fetchConfirmadosRef = useRef(fetchConfirmados);
  useEffect(() => {
    fetchConfirmadosRef.current = fetchConfirmados;
  }, [fetchConfirmados]);

  // Um único canal por pelada: a assinatura só depende do id.
  const peladaId = pelada?.id ?? null;
  useEffect(() => {
    if (!peladaId) return;
    const channel = supabase
      .channel(`pelada_players:${peladaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pelada_players",
          filter: `pelada_id=eq.${peladaId}`,
        },
        () => {
          void fetchConfirmadosRef.current(peladaId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [peladaId]);

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

  if (erro) {
    return <ErroCarregamento onRetry={() => setTentativa((t) => t + 1)} />;
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
  const escalado = !!player && confirmados.some((c) => c.playerId === player.id);
  const passada = pelada.data < hojeISO;

  return (
    <CardFrame>
      <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary">
        {passada ? "Pelada em aberto" : "Próxima pelada"}
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground">
        {formatDataPorExtenso(pelada.data)}
      </h2>
      <p className="mt-1 truncate text-sm text-muted-foreground">
        {pelada.horario} · {pelada.local}
      </p>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="num text-4xl text-foreground">{total}</span>
        <span className="text-sm text-muted-foreground">
          {total === 1 ? "escalado" : "escalados"}
        </span>
      </div>

      {total === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          A escalação é montada pelos admins e aparece aqui.
        </p>
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

      {escalado && (
        <p className="mt-4 flex items-center gap-2 text-sm text-foreground">
          <Check size={18} className="text-success" />
          Você está na escalação.
        </p>
      )}

      <Link
        to="/pelada"
        className={cn(
          "mt-5 flex h-[52px] w-full items-center justify-center rounded-xl border border-border bg-surface-2 font-display text-sm font-semibold uppercase tracking-[-0.01em] text-foreground transition-colors hover:border-primary/40",
          FOCUS_RING,
        )}
      >
        Ver escalação e times
      </Link>
    </CardFrame>
  );
}

function MeuDesempenho({ dados, playerId }: { dados: DadosPainel; playerId: string }) {
  const eu = dados.jogadores.get(playerId);
  const linha = dados.ranking.find((r) => r.playerId === playerId) ?? null;
  const total = dados.minhas.reduce(
    (acc, d) => ({
      pontos: acc.pontos + d.pontos,
      gols: acc.gols + d.gols,
      assistencias: acc.assistencias + d.assistencias,
      carrinhos: acc.carrinhos + d.carrinhos,
    }),
    { pontos: 0, gols: 0, assistencias: 0, carrinhos: 0 },
  );
  const nomeTemporada = dados.temporada?.nome ?? "Temporada";

  return (
    <section className="animar-surgir overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="h-1.5 bg-gradient-to-r from-primary via-primary to-azul" />
      <div className="p-5">
        <div className="flex items-center gap-3">
          <FotoJogador apelido={eu?.apelido ?? "Você"} fotoUrl={eu?.fotoUrl} size={48} />
          <div className="min-w-0 flex-1">
            <p className={SECTION_LABEL}>Seu desempenho</p>
            <p className="truncate font-display text-xl font-bold text-foreground">
              {eu?.apelido ?? "Você"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{nomeTemporada}</p>
          </div>
          <div className="text-right">
            <p className="num text-4xl text-primary">{linha ? `${linha.posicao}º` : "–"}</p>
            <p className="flex items-center justify-end gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              no ranking {linha && <Variacao valor={linha.variacao} />}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-1">
            <StatTile
              rotulo="Pontos"
              valor={formatPontos(total.pontos)}
              destaque
              negativo={total.pontos < 0}
            />
          </div>
          <StatTile rotulo="Jogos" valor={dados.minhas.length} />
          <StatTile rotulo="Gols" valor={total.gols} />
          <StatTile rotulo="Assist." valor={total.assistencias} />
          <StatTile rotulo="Carrinhos" valor={total.carrinhos} negativo={total.carrinhos > 0} />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Pontos por pelada</p>
          <GraficoEvolucao pontos={dados.minhas.slice(-12)} />
        </div>

        {dados.minhas.length > 0 && (
          <BotaoCompartilhar
            className="mt-4 w-full"
            rotulo="Compartilhar meu card"
            nomeArquivo={`pelada-${(eu?.apelido ?? "jogador").toLowerCase()}.png`}
            titulo="Meu desempenho na Pelada da Panela"
            texto={`${eu?.apelido ?? "Eu"}: ${total.pontos} pontos na ${nomeTemporada}`}
            gerar={() =>
              gerarCardJogador({
                apelido: eu?.apelido ?? "Jogador",
                periodo: nomeTemporada,
                posicao: linha?.posicao ?? null,
                pontos: total.pontos,
                jogos: dados.minhas.length,
                gols: total.gols,
                assistencias: total.assistencias,
                carrinhos: total.carrinhos,
                evolucao: dados.minhas.map((d) => d.pontos),
                fotoUrl: eu?.fotoUrl ?? null,
              })
            }
          />
        )}
      </div>
    </section>
  );
}

function UltimaPeladaCard({ dados }: { dados: DadosPainel }) {
  const { ultima, daUltima, jogadores } = dados;
  const destaques = useMemo(() => calcularDestaques(daUltima), [daUltima]);
  if (!ultima) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5">
        <p className={SECTION_LABEL}>Última pelada</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Os destaques aparecem quando o primeiro resultado for publicado.
        </p>
      </section>
    );
  }
  const top = [...daUltima]
    .sort((a, b) => b.pontos - a.pontos || b.gols - a.gols || b.assistencias - a.assistencias)
    .slice(0, 6);
  const dataExtenso = formatDataPorExtenso(ultima.data);

  return (
    <section className="animar-surgir rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className={SECTION_LABEL}>Última pelada</p>
        <Link
          to="/historico/$peladaId"
          params={{ peladaId: ultima.id }}
          className={cn("rounded text-xs text-muted-foreground hover:text-foreground", FOCUS_RING)}
        >
          Ver tudo
        </Link>
      </div>
      <p className="mt-1 truncate text-sm text-foreground">
        {dataExtenso} · {ultima.local}
      </p>

      <ul className="mt-4 grid gap-2">
        {destaques.map((d) => {
          const primeiro = jogadores.get(d.playerIds[0] ?? "");
          return (
            <li
              key={d.titulo}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface-2 p-3"
            >
              {d.playerIds.length === 1 ? (
                <FotoJogador apelido={primeiro?.apelido ?? "?"} fotoUrl={primeiro?.fotoUrl} />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-azul/20 text-xs font-bold text-azul">
                  {d.playerIds.length}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  {d.titulo}
                  {d.playerIds.length > 1 && " (empate)"}
                </p>
                <p className="truncate text-sm font-medium text-foreground">
                  {nomesDe(d.playerIds, jogadores)}
                </p>
              </div>
              <p className={cn("num text-xl", d.valor < 0 ? "text-destructive" : "text-primary")}>
                {d.titulo === "Maior pontuação" ? formatPontos(d.valor) : d.valor}
              </p>
            </li>
          );
        })}
      </ul>

      <BotaoCompartilhar
        className="mt-4 w-full"
        rotulo="Compartilhar resultado"
        nomeArquivo={`pelada-${ultima.data}.png`}
        titulo="Resultado da Pelada da Panela"
        texto={`Resultado da pelada de ${dataExtenso}`}
        gerar={() =>
          gerarCardPelada({
            dataExtenso,
            local: ultima.local,
            destaques: destaques.map((d) => ({
              titulo: d.titulo,
              nomes: nomesDe(d.playerIds, jogadores),
              valor: d.titulo === "Maior pontuação" ? formatPontos(d.valor) : String(d.valor),
            })),
            top: top.map((l) => ({
              apelido: jogadores.get(l.playerId)?.apelido ?? "Jogador",
              pontos: l.pontos,
              gols: l.gols,
              assistencias: l.assistencias,
              carrinhos: l.carrinhos,
            })),
          })
        }
      />
    </section>
  );
}

function MvpRecente({ dados }: { dados: DadosPainel }) {
  if (!dados.mvp) return null;
  const p = dados.jogadores.get(dados.mvp.playerId);
  const [, m, d] = dados.mvp.data.split("-");
  return (
    <section className="flex items-center gap-3 rounded-2xl border border-azul/50 bg-surface p-4">
      <Trophy size={20} className="shrink-0 text-azul" />
      <FotoJogador apelido={p?.apelido ?? "?"} fotoUrl={p?.fotoUrl} size={32} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          MVP da galera · {d}/{m}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{p?.apelido}</p>
      </div>
    </section>
  );
}

function RankingResumido({ dados, playerId }: { dados: DadosPainel; playerId: string | null }) {
  const top = dados.ranking.slice(0, 5);
  return (
    <section className="animar-surgir rounded-2xl border border-border bg-surface p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <h3 className="truncate font-display text-base font-semibold text-foreground">
          Ranking {dados.temporada ? `· ${dados.temporada.nome}` : ""}
        </h3>
        <Link
          to="/ranking"
          className={cn(
            "rounded text-xs text-muted-foreground transition-colors hover:text-foreground",
            FOCUS_RING,
          )}
        >
          Ver tudo
        </Link>
      </div>

      {top.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          O ranking começa depois da primeira pelada publicada.
        </p>
      ) : (
        <ul className="mt-3">
          {top.map((s) => {
            const p = dados.jogadores.get(s.playerId);
            const eu = s.playerId === playerId;
            return (
              <li key={s.playerId} className="border-b border-border last:border-b-0">
                <Link
                  to="/jogadores/$id"
                  params={{ id: s.playerId }}
                  className={cn(
                    "grid grid-cols-[2rem_auto_minmax(0,1fr)_auto] items-center gap-3 py-3",
                    eu && "rounded-lg bg-primary/10 px-2",
                  )}
                >
                  <span className="flex flex-col items-start leading-none">
                    <span
                      className={
                        s.posicao === 1
                          ? "num text-base text-primary"
                          : "num text-base text-muted-foreground"
                      }
                    >
                      {s.posicao}
                    </span>
                    <Variacao valor={s.variacao} />
                  </span>
                  <FotoJogador apelido={p?.apelido ?? "?"} fotoUrl={p?.fotoUrl} size={32} />
                  <span className="truncate text-sm text-foreground">{p?.apelido}</span>
                  <span
                    className={cn(
                      "num text-base",
                      s.pontos < 0 ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {s.pontos}
                  </span>
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
  const itemClass = cn(
    "grid min-h-[56px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40",
    FOCUS_RING,
  );
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
  const { player } = useAuth();
  const playerId = player?.id ?? null;
  const { dados, erro, recarregar } = usePainel(playerId);

  return (
    <>
      <TopBar />
      <h1 className="sr-only">Início: seu desempenho, próxima pelada e ranking</h1>
      {dados?.suspensao && (
        <div className="mb-4">
          <AvisoSuspensao suspensao={dados.suspensao} />
        </div>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="grid gap-5">
          {erro ? (
            <ErroCarregamento onRetry={recarregar} />
          ) : !dados ? (
            <Skeleton className="h-[360px] w-full rounded-2xl" />
          ) : playerId ? (
            <MeuDesempenho dados={dados} playerId={playerId} />
          ) : null}
          <NextPeladaCard />
          {dados && <MvpRecente dados={dados} />}
        </div>
        <div className="grid gap-5">
          {!erro && !dados ? (
            <>
              <Skeleton className="h-[260px] w-full rounded-2xl" />
              <Skeleton className="h-[280px] w-full rounded-2xl" />
            </>
          ) : dados ? (
            <>
              <UltimaPeladaCard dados={dados} />
              <RankingResumido dados={dados} playerId={playerId} />
            </>
          ) : null}
          <RegraPontuacao />
          <AcessoRapido />
        </div>
      </div>
    </>
  );
}
