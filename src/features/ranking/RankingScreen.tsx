import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { TopBar } from "@/components/layout/TopBar";
import { ErroCarregamento } from "@/components/layout/ErroCarregamento";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  FotoJogador,
  RegraPontuacao,
  SECTION_LABEL,
  Variacao,
} from "@/features/desempenho/componentes";
import {
  buscarJogadores,
  buscarRanking,
  buscarTemporadas,
  type JogadorBasico,
  type LinhaRanking,
  type Temporada,
} from "@/features/desempenho/dados";
import { FOCUS_RING } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Ordem = "pontos" | "gols" | "assistencias" | "carrinhos";

const ORDENS: { id: Ordem; rotulo: string }[] = [
  { id: "pontos", rotulo: "Pontos" },
  { id: "gols", rotulo: "Gols" },
  { id: "assistencias", rotulo: "Assistências" },
  { id: "carrinhos", rotulo: "Menos carrinhos" },
];

/** "geral" = histórico de todas as temporadas */
type Escopo = string;
const GERAL = "geral";

function chip(ativo: boolean) {
  return cn(
    "shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
    ativo
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border text-muted-foreground hover:border-primary/40",
    FOCUS_RING,
  );
}

export function RankingScreen() {
  const { player } = useAuth();
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [escopo, setEscopo] = useState<Escopo | null>(null);
  const [ordem, setOrdem] = useState<Ordem>("pontos");
  const [linhas, setLinhas] = useState<LinhaRanking[]>([]);
  const [jogadores, setJogadores] = useState<Map<string, JogadorBasico>>(new Map());
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [ts, js] = await Promise.all([buscarTemporadas(), buscarJogadores()]);
        if (!ativo) return;
        setTemporadas(ts);
        setJogadores(js);
        setEscopo((atual) => atual ?? ts.find((t) => t.ativa)?.id ?? ts[0]?.id ?? GERAL);
      } catch {
        if (ativo) setErro(true);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  useEffect(() => {
    if (!escopo) return;
    let ativo = true;
    (async () => {
      setLoading(true);
      setErro(false);
      try {
        const r = await buscarRanking(escopo === GERAL ? null : escopo);
        if (ativo) setLinhas(r);
      } catch {
        if (ativo) setErro(true);
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [escopo, tentativa]);

  const ordenadas = useMemo(() => {
    if (ordem === "pontos") return linhas;
    const copia = [...linhas];
    if (ordem === "gols") copia.sort((a, b) => b.gols - a.gols || a.posicao - b.posicao);
    if (ordem === "assistencias")
      copia.sort((a, b) => b.assistencias - a.assistencias || a.posicao - b.posicao);
    if (ordem === "carrinhos")
      copia.sort((a, b) => a.carrinhos - b.carrinhos || a.posicao - b.posicao);
    return copia;
  }, [linhas, ordem]);

  const valorDe = (l: LinhaRanking) =>
    ordem === "pontos"
      ? l.pontos
      : ordem === "gols"
        ? l.gols
        : ordem === "assistencias"
          ? l.assistencias
          : l.carrinhos;

  const podio = ordem === "pontos" ? linhas.filter((l) => l.posicao <= 3).slice(0, 3) : [];
  const temporadaAtual = temporadas.find((t) => t.id === escopo);

  return (
    <>
      <TopBar />
      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground md:text-3xl">
          Ranking
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {escopo === GERAL
            ? "Histórico geral, somando todas as temporadas."
            : temporadaAtual
              ? `${temporadaAtual.nome}${temporadaAtual.ativa ? " (em andamento)" : " (encerrada)"}`
              : ""}
        </p>
      </header>

      <nav aria-label="Período" className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {temporadas.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={escopo === t.id}
            onClick={() => setEscopo(t.id)}
            className={chip(escopo === t.id)}
          >
            {t.nome}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={escopo === GERAL}
          onClick={() => setEscopo(GERAL)}
          className={chip(escopo === GERAL)}
        >
          Histórico geral
        </button>
      </nav>

      <nav aria-label="Ordenar por" className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {ORDENS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={ordem === o.id}
            onClick={() => setOrdem(o.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
              ordem === o.id
                ? "border-azul bg-azul/20 text-foreground"
                : "border-border text-muted-foreground hover:border-azul/60",
              FOCUS_RING,
            )}
          >
            {o.rotulo}
          </button>
        ))}
      </nav>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          {erro ? (
            <ErroCarregamento onRetry={() => setTentativa((t) => t + 1)} />
          ) : loading ? (
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          ) : linhas.length === 0 ? (
            <section className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-sm text-muted-foreground">
                Nenhum resultado publicado neste período ainda.
              </p>
            </section>
          ) : (
            <>
              {podio.length > 0 && (
                <section className="animar-surgir grid grid-cols-3 items-end gap-2">
                  {[podio[1], podio[0], podio[2]].map((l, i) => {
                    if (!l) return <div key={`vazio-${i}`} />;
                    const p = jogadores.get(l.playerId);
                    const alto = l.posicao === 1;
                    return (
                      <Link
                        key={l.playerId}
                        to="/jogadores/$id"
                        params={{ id: l.playerId }}
                        className={cn(
                          "flex min-w-0 flex-col items-center gap-2 rounded-2xl border p-3 text-center",
                          alto
                            ? "border-primary bg-primary/10 pb-6 pt-5"
                            : "border-border bg-surface",
                          FOCUS_RING,
                        )}
                      >
                        <span className={cn("num text-lg", alto ? "text-primary" : "text-azul")}>
                          {l.posicao}º
                        </span>
                        <FotoJogador
                          apelido={p?.apelido ?? "?"}
                          fotoUrl={p?.fotoUrl}
                          size={alto ? 64 : 48}
                          className={alto ? "ring-2 ring-primary" : undefined}
                        />
                        <span className="w-full truncate text-sm font-medium text-foreground">
                          {p?.apelido}
                        </span>
                        <span
                          className={cn(
                            "num text-2xl",
                            l.pontos < 0 ? "text-destructive" : "text-foreground",
                          )}
                        >
                          {l.pontos}
                        </span>
                      </Link>
                    );
                  })}
                </section>
              )}

              <section className="rounded-2xl border border-border bg-surface">
                <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_repeat(3,2rem)_3rem] items-center gap-2 border-b border-border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground sm:grid-cols-[2.5rem_minmax(0,1fr)_repeat(4,2.5rem)_3.5rem]">
                  <span>#</span>
                  <span>Jogador</span>
                  <span className="hidden text-center sm:block">J</span>
                  <span className="text-center">G</span>
                  <span className="text-center">A</span>
                  <span className="text-center">C</span>
                  <span className="text-right">
                    {ordem === "pontos"
                      ? "Pts"
                      : ORDENS.find((o) => o.id === ordem)?.rotulo.slice(0, 4)}
                  </span>
                </div>
                <ul>
                  {ordenadas.map((l, i) => {
                    const p = jogadores.get(l.playerId);
                    const eu = l.playerId === player?.id;
                    const valor = valorDe(l);
                    return (
                      <li key={l.playerId} className="border-b border-border last:border-b-0">
                        <Link
                          to="/jogadores/$id"
                          params={{ id: l.playerId }}
                          className={cn(
                            "grid min-h-[56px] grid-cols-[2.5rem_minmax(0,1fr)_repeat(3,2rem)_3rem] items-center gap-2 px-4 py-2 transition-colors hover:bg-surface-2 sm:grid-cols-[2.5rem_minmax(0,1fr)_repeat(4,2.5rem)_3.5rem]",
                            eu && "bg-primary/10",
                            FOCUS_RING,
                          )}
                        >
                          <span className="flex flex-col leading-none">
                            <span
                              className={cn(
                                "num text-base",
                                l.posicao === 1 && ordem === "pontos"
                                  ? "text-primary"
                                  : "text-muted-foreground",
                              )}
                            >
                              {ordem === "pontos" ? l.posicao : i + 1}
                            </span>
                            {ordem === "pontos" && <Variacao valor={l.variacao} />}
                          </span>
                          <span className="flex min-w-0 items-center gap-2">
                            <FotoJogador
                              apelido={p?.apelido ?? "?"}
                              fotoUrl={p?.fotoUrl}
                              size={32}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm text-foreground">
                                {p?.apelido ?? "Jogador"}
                              </span>
                              {p?.convidado && (
                                <span className="block text-[10px] text-muted-foreground">
                                  Convidado
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="num hidden text-center text-sm text-muted-foreground sm:block">
                            {l.jogos}
                          </span>
                          <span className="num text-center text-sm text-foreground">{l.gols}</span>
                          <span className="num text-center text-sm text-foreground">
                            {l.assistencias}
                          </span>
                          <span
                            className={cn(
                              "num text-center text-sm",
                              l.carrinhos > 0 ? "text-destructive" : "text-muted-foreground",
                            )}
                          >
                            {l.carrinhos}
                          </span>
                          <span
                            className={cn(
                              "num text-right text-lg",
                              valor < 0 || (ordem === "carrinhos" && valor > 0)
                                ? "text-destructive"
                                : ordem === "pontos"
                                  ? "text-primary"
                                  : "text-foreground",
                            )}
                          >
                            {valor}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
              <p className="text-xs text-muted-foreground">
                Empate total divide a posição. As setas mostram quem subiu ou caiu desde antes da
                última pelada publicada.
              </p>
            </>
          )}
        </div>

        <aside className="grid gap-5">
          <RegraPontuacao />
          <section className="rounded-2xl border border-border bg-surface p-5">
            <p className={SECTION_LABEL}>Legenda</p>
            <p className="mt-2 text-xs text-muted-foreground">
              J jogos · G gols · A assistências · C carrinhos. A votação de MVP é à parte e não
              entra na pontuação.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
