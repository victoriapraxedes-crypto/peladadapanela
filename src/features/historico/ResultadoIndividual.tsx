import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { BotaoCompartilhar } from "@/features/compartilhar/BotaoCompartilhar";
import { gerarCardPelada } from "@/features/compartilhar/cards";
import { FotoJogador, SECTION_LABEL } from "@/features/desempenho/componentes";
import {
  buscarDesempenhos,
  buscarJogadores,
  calcularDestaques,
  nomesDe,
  type DesempenhoPelada,
  type JogadorBasico,
} from "@/features/desempenho/dados";
import { formatDataPorExtenso } from "@/lib/format";
import { formatPontos } from "@/lib/pontuacao";
import { FOCUS_RING } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function ResultadoIndividual({
  peladaId,
  data,
  local,
  publicado,
  mvps,
}: {
  peladaId: string;
  data: string;
  local: string;
  publicado: boolean;
  mvps: string[];
}) {
  const { player, profile } = useAuth();
  const [linhas, setLinhas] = useState<DesempenhoPelada[] | null>(null);
  const [jogadores, setJogadores] = useState<Map<string, JogadorBasico>>(new Map());

  useEffect(() => {
    let ativo = true;
    Promise.all([buscarDesempenhos({ peladaId }), buscarJogadores()])
      .then(([l, j]) => {
        if (!ativo) return;
        setLinhas(l);
        setJogadores(j);
      })
      .catch(() => {
        if (ativo) setLinhas([]);
      });
    return () => {
      ativo = false;
    };
  }, [peladaId]);

  const ordenadas = useMemo(
    () =>
      [...(linhas ?? [])].sort(
        (a, b) =>
          b.pontos - a.pontos ||
          b.gols - a.gols ||
          b.assistencias - a.assistencias ||
          a.carrinhos - b.carrinhos,
      ),
    [linhas],
  );
  const destaques = useMemo(() => calcularDestaques(linhas ?? []), [linhas]);

  if (!publicado) {
    return (
      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <p className={SECTION_LABEL}>Resultado</p>
        <p className="mt-3 text-sm text-muted-foreground">
          O resultado desta pelada ainda não foi publicado.
        </p>
        {profile?.role === "admin" && (
          <Link
            to="/admin/sumula"
            className={cn(
              "mt-4 flex h-[48px] items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground",
              FOCUS_RING,
            )}
          >
            Abrir súmula
          </Link>
        )}
      </section>
    );
  }

  if (linhas === null) return <Skeleton className="mt-5 h-72 w-full rounded-2xl" />;

  // posição com empate compartilhado
  let pos = 0;
  let anterior = "";
  const posicoes = ordenadas.map((l, i) => {
    const chave = `${l.pontos}|${l.gols}|${l.assistencias}|${l.carrinhos}`;
    if (chave !== anterior) pos = i + 1;
    anterior = chave;
    return pos;
  });
  const dataExtenso = formatDataPorExtenso(data);

  return (
    <>
      <section className="animar-surgir mt-5 rounded-2xl border border-border bg-surface p-5">
        <p className={SECTION_LABEL}>Destaques</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {destaques.map((d) => {
            const primeiro = jogadores.get(d.playerIds[0] ?? "");
            return (
              <li key={d.titulo} className="rounded-xl border border-border bg-surface-2 p-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  {d.titulo}
                  {d.playerIds.length > 1 && " (empate)"}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {d.playerIds.length === 1 && (
                    <FotoJogador
                      apelido={primeiro?.apelido ?? "?"}
                      fotoUrl={primeiro?.fotoUrl}
                      size={28}
                    />
                  )}
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {nomesDe(d.playerIds, jogadores)}
                  </p>
                  <p className="num text-xl text-primary">
                    {d.titulo === "Maior pontuação" ? formatPontos(d.valor) : d.valor}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 border-t border-border pt-4">
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
            MVP da galera
          </span>
          <span
            className={cn(
              "mt-1 block text-sm",
              mvps.length ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {mvps.length ? mvps.join(" e ") : "Votação em aberto ou sem votos."}
          </span>
        </div>
        <BotaoCompartilhar
          className="mt-4 w-full"
          rotulo="Compartilhar resultado"
          nomeArquivo={`pelada-${data}.png`}
          titulo="Resultado da Pelada da Panela"
          texto={`Resultado da pelada de ${dataExtenso}`}
          gerar={() =>
            gerarCardPelada({
              dataExtenso,
              local,
              destaques: destaques.map((d) => ({
                titulo: d.titulo,
                nomes: nomesDe(d.playerIds, jogadores),
                valor: d.titulo === "Maior pontuação" ? formatPontos(d.valor) : String(d.valor),
              })),
              top: ordenadas.slice(0, 6).map((l) => ({
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

      <section className="mt-5 rounded-2xl border border-border bg-surface">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)_repeat(3,2rem)_3rem] items-center gap-2 border-b border-border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          <span>#</span>
          <span>Jogador</span>
          <span className="text-center">G</span>
          <span className="text-center">A</span>
          <span className="text-center">C</span>
          <span className="text-right">Pts</span>
        </div>
        <ul>
          {ordenadas.map((l, i) => {
            const p = jogadores.get(l.playerId);
            return (
              <li key={l.playerId} className="border-b border-border last:border-b-0">
                <Link
                  to="/jogadores/$id"
                  params={{ id: l.playerId }}
                  className={cn(
                    "grid min-h-[52px] grid-cols-[2rem_minmax(0,1fr)_repeat(3,2rem)_3rem] items-center gap-2 px-4 py-2 hover:bg-surface-2",
                    l.playerId === player?.id && "bg-primary/10",
                    FOCUS_RING,
                  )}
                >
                  <span
                    className={cn(
                      "num text-base",
                      posicoes[i] === 1 ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {posicoes[i]}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <FotoJogador apelido={p?.apelido ?? "?"} fotoUrl={p?.fotoUrl} size={28} />
                    <span className="truncate text-sm text-foreground">{p?.apelido}</span>
                  </span>
                  <span className="num text-center text-sm">{l.gols}</span>
                  <span className="num text-center text-sm">{l.assistencias}</span>
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
                      l.pontos < 0 ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {l.pontos}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
