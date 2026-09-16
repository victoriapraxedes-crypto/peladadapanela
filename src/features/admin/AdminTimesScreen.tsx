import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shuffle } from "lucide-react";
import { toast } from "sonner";

import { TopBar } from "@/components/layout/TopBar";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  buscarPeladasAbertas,
  escolherPeladaAtual,
  type PeladaAberta,
} from "@/features/pelada/peladaAtual";
import { posicaoAbrev } from "@/features/jogadores/labels";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatDataCurta, formatDataPorExtenso, hojeLocalISO } from "@/lib/format";

type Posicao = Database["public"]["Enums"]["posicao"];

const NOMES_TIMES = ["Time A", "Time B", "Time C", "Time D"];

const SECTION_LABEL = "font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary";
const BTN_PRIMARY =
  "flex h-[52px] items-center justify-center gap-2 rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim disabled:opacity-50";
const BTN_SECONDARY =
  "flex h-[52px] items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-medium text-foreground disabled:opacity-50";
const INPUT =
  "h-[52px] w-full rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary";

function optionClass(selected: boolean) {
  return [
    "flex min-h-[52px] items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors",
    selected
      ? "border-primary bg-surface-2 text-foreground"
      : "border-border bg-transparent text-muted-foreground hover:border-primary/40",
  ].join(" ");
}

interface Jogador {
  id: string;
  apelido: string;
  fotoUrl: string | null;
  posicao: Posicao | null;
}

interface TimeRow {
  id: string;
  nome: string;
  ordem: number;
}

/** Chave de destino: "disponiveis" ou o id de um time. */
type Destino = string;
const DISPONIVEIS = "disponiveis";

function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  const aleatorios = new Uint32Array(copia.length);
  crypto.getRandomValues(aleatorios);
  for (let i = copia.length - 1; i > 0; i--) {
    const j = aleatorios[i]! % (i + 1);
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}

/**
 * Sorteio simples e equilibrado em quantidade: goleiros primeiro (um por time,
 * enquanto houver), depois o restante em "serpentina" começando pelo time com menos gente.
 */
function sortearTimes(jogadores: Jogador[], timeIds: string[]): Record<string, Destino> {
  const resultado: Record<string, Destino> = {};
  const contagem = new Map(timeIds.map((id) => [id, 0]));
  const proximo = () =>
    [...contagem.entries()].sort(
      (a, b) => a[1] - b[1] || timeIds.indexOf(a[0]) - timeIds.indexOf(b[0]),
    )[0]![0];

  const goleiros = embaralhar(jogadores.filter((j) => j.posicao === "goleiro"));
  const linha = embaralhar(jogadores.filter((j) => j.posicao !== "goleiro"));

  for (const j of [...goleiros, ...linha]) {
    const alvo = proximo();
    resultado[j.id] = alvo;
    contagem.set(alvo, (contagem.get(alvo) ?? 0) + 1);
  }
  return resultado;
}

export function AdminTimesScreen() {
  const [abertas, setAbertas] = useState<PeladaAberta[]>([]);
  const [peladaId, setPeladaId] = useState<string | null>(null);
  const [escalados, setEscalados] = useState<Jogador[]>([]);
  const [times, setTimes] = useState<TimeRow[]>([]);
  /** playerId -> destino (id do time) ou DISPONIVEIS */
  const [alocacao, setAlocacao] = useState<Record<string, Destino>>({});
  const [quantidade, setQuantidade] = useState(2);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [dropAlvo, setDropAlvo] = useState<Destino | null>(null);
  const [alterado, setAlterado] = useState(false);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sorteando, setSorteando] = useState(false);
  const [confirmarReducao, setConfirmarReducao] = useState(false);
  const [confirmarZerar, setConfirmarZerar] = useState(false);

  const pelada = abertas.find((p) => p.id === peladaId) ?? null;

  const carregarPelada = useCallback(async (id: string) => {
    const [{ data: pp }, { data: teamRows }] = await Promise.all([
      supabase
        .from("pelada_players")
        .select("player_id, players(id, apelido, foto_url, posicao_principal)")
        .eq("pelada_id", id),
      supabase
        .from("teams")
        .select("id, nome, ordem, team_players(player_id)")
        .eq("pelada_id", id)
        .order("ordem", { ascending: true }),
    ]);

    const jogadores: Jogador[] = (pp ?? [])
      .filter((row) => row.players)
      .map((row) => ({
        id: row.player_id,
        apelido: row.players!.apelido,
        fotoUrl: row.players!.foto_url,
        posicao: row.players!.posicao_principal,
      }))
      .sort((a, b) => a.apelido.localeCompare(b.apelido, "pt-BR"));
    setEscalados(jogadores);

    const listaTimes = (teamRows ?? []).map((t) => ({ id: t.id, nome: t.nome, ordem: t.ordem }));
    setTimes(listaTimes);
    if (listaTimes.length >= 2) setQuantidade(listaTimes.length);

    const mapa: Record<string, Destino> = {};
    for (const j of jogadores) mapa[j.id] = DISPONIVEIS;
    for (const t of teamRows ?? []) {
      for (const tp of t.team_players ?? []) {
        if (mapa[tp.player_id] !== undefined) mapa[tp.player_id] = t.id;
      }
    }
    setAlocacao(mapa);
    setSelecionado(null);
    setAlterado(false);
    return listaTimes;
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await buscarPeladasAbertas();
      if (!ativo) return;
      const lista = data ?? [];
      setAbertas(lista);
      const atual = escolherPeladaAtual(lista, hojeLocalISO());
      setPeladaId(atual?.id ?? null);
      if (atual) await carregarPelada(atual.id);
      if (ativo) setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [carregarPelada]);

  const trocarPelada = async (id: string) => {
    if (id === peladaId) return;
    if (alterado && !window.confirm("Há mudanças não salvas nos times. Trocar mesmo assim?"))
      return;
    setPeladaId(id);
    await carregarPelada(id);
  };

  /** Deixa a pelada com exatamente `quantidade` times e devolve a lista final. */
  const ajustarQuantidade = async (): Promise<TimeRow[] | null> => {
    if (!pelada) return null;
    const atuais = [...times].sort((a, b) => a.ordem - b.ordem);

    if (quantidade > atuais.length) {
      const novas = [];
      for (let i = atuais.length; i < quantidade; i++) {
        novas.push({ pelada_id: pelada.id, nome: NOMES_TIMES[i] ?? `Time ${i + 1}`, ordem: i + 1 });
      }
      const { error } = await supabase.from("teams").insert(novas);
      if (error) {
        toast.error("Não foi possível criar os times. " + error.message);
        return null;
      }
    } else if (quantidade < atuais.length) {
      const excedentes = atuais.slice(quantidade).map((t) => t.id);
      const { error } = await supabase.from("teams").delete().in("id", excedentes);
      if (error) {
        toast.error("Não foi possível remover os times extras. " + error.message);
        return null;
      }
    } else {
      return atuais;
    }
    const { data } = await supabase
      .from("teams")
      .select("id, nome, ordem")
      .eq("pelada_id", pelada.id)
      .order("ordem", { ascending: true });
    const lista = data ?? [];
    setTimes(lista);
    setAlocacao((prev) => {
      const ids = new Set(lista.map((t) => t.id));
      const limpo: Record<string, Destino> = {};
      for (const [pid, d] of Object.entries(prev)) limpo[pid] = ids.has(d) ? d : DISPONIVEIS;
      return limpo;
    });
    return lista;
  };

  const sortear = async () => {
    if (!pelada || sorteando) return;
    if (escalados.length < quantidade) {
      toast.error("Tem menos escalados do que times.");
      return;
    }
    setSorteando(true);
    const lista = await ajustarQuantidade();
    if (lista) {
      setAlocacao(
        sortearTimes(
          escalados,
          lista.map((t) => t.id),
        ),
      );
      setAlterado(true);
      toast.success("Times sorteados. Ajuste se quiser e salve.");
    }
    setSorteando(false);
  };

  const handleSortear = () => {
    if (quantidade < times.length) {
      setConfirmarReducao(true);
      return;
    }
    void sortear();
  };

  const mover = (playerId: string, destino: Destino) => {
    setAlocacao((prev) => ({ ...prev, [playerId]: destino }));
    setSelecionado(null);
    setAlterado(true);
  };

  const salvarComposicao = async () => {
    if (!pelada || salvando || times.length === 0) return;
    setSalvando(true);

    const idsTimes = times.map((t) => t.id);
    const { error: delErr } = await supabase.from("team_players").delete().in("team_id", idsTimes);
    if (delErr) {
      toast.error(delErr.message);
      setSalvando(false);
      return;
    }

    const linhas = Object.entries(alocacao)
      .filter(([, destino]) => destino !== DISPONIVEIS)
      .map(([playerId, teamId]) => ({ team_id: teamId, player_id: playerId }));

    if (linhas.length > 0) {
      const { error } = await supabase.from("team_players").insert(linhas);
      if (error) {
        toast.error("Não foi possível salvar os times. " + error.message);
        setSalvando(false);
        return;
      }
    }

    if (pelada.status === "aberta" || pelada.status === "confirmacao") {
      await supabase.from("peladas").update({ status: "times_definidos" }).eq("id", pelada.id);
      setAbertas((prev) =>
        prev.map((p) => (p.id === pelada.id ? { ...p, status: "times_definidos" } : p)),
      );
    }

    await carregarPelada(pelada.id);
    setSalvando(false);
    toast.success("Times salvos.");
  };

  if (loading) {
    return (
      <>
        <TopBar />
        <Skeleton className="mt-2 h-8 w-2/3" />
        <Skeleton className="mt-5 h-[120px] w-full rounded-2xl" />
        <Skeleton className="mt-5 h-[220px] w-full rounded-2xl" />
      </>
    );
  }

  if (!pelada) {
    return (
      <>
        <TopBar />
        <section className="mt-2 rounded-2xl border border-border bg-surface p-5">
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground">
            Nenhuma pelada em aberto
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Marque uma pelada antes de sortear os times.
          </p>
          <Link to="/admin/pelada" className={`${BTN_PRIMARY} mt-5 w-full`}>
            Marcar pelada
          </Link>
        </section>
      </>
    );
  }

  const jogadoresDe = (destino: Destino) =>
    escalados.filter((j) => (alocacao[j.id] ?? DISPONIVEIS) === destino);

  const selecionadoJogador = escalados.find((j) => j.id === selecionado) ?? null;
  const destinoAtualSelecionado = selecionado ? (alocacao[selecionado] ?? DISPONIVEIS) : null;

  const linhaJogador = (j: Jogador) => (
    <li
      key={j.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", j.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="border-b border-border last:border-b-0"
    >
      <button
        type="button"
        onClick={() => setSelecionado((prev) => (prev === j.id ? null : j.id))}
        className={`grid min-h-[44px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2 text-left ${
          selecionado === j.id ? "border border-primary bg-surface-2" : "border border-transparent"
        }`}
      >
        {j.fotoUrl ? (
          <img
            src={j.fotoUrl}
            alt={j.apelido}
            width={36}
            height={36}
            referrerPolicy="no-referrer"
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <InitialsAvatar apelido={j.apelido} size={36} />
        )}
        <span className="truncate text-sm text-foreground">{j.apelido}</span>
        <span className="text-xs text-muted-foreground">{posicaoAbrev(j.posicao)}</span>
      </button>
    </li>
  );

  const cardProps = (destino: Destino) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDropAlvo(destino);
    },
    onDragLeave: () => setDropAlvo((prev) => (prev === destino ? null : prev)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const playerId = e.dataTransfer.getData("text/plain");
      setDropAlvo(null);
      if (playerId) mover(playerId, destino);
    },
    className: `rounded-2xl border bg-surface p-5 ${
      dropAlvo === destino ? "border-primary" : "border-border"
    }`,
  });

  const disponiveis = jogadoresDe(DISPONIVEIS);

  return (
    <>
      <TopBar />

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground md:text-3xl">
          Sortear times
        </h1>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {formatDataPorExtenso(pelada.data)} · {pelada.local} · {escalados.length} escalados
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Os times servem só para organizar o jogo. A pontuação é individual.
        </p>
      </header>

      {abertas.length > 1 && (
        <div className="mt-4">
          <label htmlFor="pelada-times" className="sr-only">
            Pelada
          </label>
          <select
            id="pelada-times"
            value={pelada.id}
            onChange={(e) => void trocarPelada(e.target.value)}
            className={INPUT}
          >
            {abertas.map((p) => (
              <option key={p.id} value={p.id}>
                {formatDataCurta(p.data)} · {p.local}
              </option>
            ))}
          </select>
        </div>
      )}

      {escalados.length === 0 ? (
        <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted-foreground">
            Ninguém escalado nesta pelada ainda. Monte a escalação primeiro.
          </p>
          <Link to="/pelada" className={`${BTN_PRIMARY} mt-4 w-full`}>
            Montar escalação
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
            <p className={SECTION_LABEL}>Quantidade de times</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[2, 3, 4].map((q) => (
                <button
                  key={q}
                  type="button"
                  aria-pressed={quantidade === q}
                  onClick={() => setQuantidade(q)}
                  className={optionClass(quantidade === q)}
                >
                  <span className="num">{q}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSortear}
              disabled={sorteando}
              className={`${BTN_PRIMARY} mt-3 w-full`}
            >
              <Shuffle size={18} />
              {sorteando ? "Sorteando..." : times.length === 0 ? "Sortear" : "Sortear de novo"}
            </button>
          </section>

          {times.length > 0 && (
            <>
              <p className="mt-5 text-sm text-muted-foreground">
                Toque num jogador para trocar de time (no computador, dá para arrastar). As mudanças
                só valem depois de salvar.
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {disponiveis.length > 0 && (
                  <section {...cardProps(DISPONIVEIS)}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={SECTION_LABEL}>Sem time</p>
                      <span className="num text-2xl text-foreground">{disponiveis.length}</span>
                    </div>
                    <ul className="mt-3">{disponiveis.map(linhaJogador)}</ul>
                  </section>
                )}

                {times.map((t) => {
                  const doTime = jogadoresDe(t.id);
                  return (
                    <section key={t.id} {...cardProps(t.id)}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={SECTION_LABEL}>{t.nome}</p>
                        <span className="num text-2xl text-foreground">{doTime.length}</span>
                      </div>
                      {doTime.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">Ninguém aqui ainda.</p>
                      ) : (
                        <ul className="mt-3">{doTime.map(linhaJogador)}</ul>
                      )}
                    </section>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setConfirmarZerar(true)}
                  className={`${BTN_SECONDARY} w-full`}
                >
                  Tirar todos dos times
                </button>
                <button
                  type="button"
                  onClick={() => void salvarComposicao()}
                  disabled={salvando}
                  className={`${BTN_PRIMARY} w-full`}
                >
                  {salvando ? "Salvando..." : "Salvar times"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {selecionadoJogador && (
        <div
          className="fixed inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur"
          style={{ bottom: "calc(56px + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto w-full max-w-md px-5 py-3 md:max-w-2xl">
            <p className="truncate text-xs text-muted-foreground">
              Mover <span className="text-foreground">{selecionadoJogador.apelido}</span> para:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {destinoAtualSelecionado !== DISPONIVEIS && (
                <button
                  type="button"
                  onClick={() => mover(selecionadoJogador.id, DISPONIVEIS)}
                  className="flex min-h-[44px] items-center justify-center rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground"
                >
                  Sem time
                </button>
              )}
              {times
                .filter((t) => t.id !== destinoAtualSelecionado)
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => mover(selecionadoJogador.id, t.id)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground"
                  >
                    {t.nome}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={confirmarReducao} onOpenChange={setConfirmarReducao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Diminuir a quantidade de times?</AlertDialogTitle>
            <AlertDialogDescription>
              Os times excedentes são apagados e todo mundo é sorteado de novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void sortear()}>Sortear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarZerar} onOpenChange={setConfirmarZerar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tirar todos dos times?</AlertDialogTitle>
            <AlertDialogDescription>
              Todo mundo fica sem time. Só vale depois de salvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const zerado: Record<string, Destino> = {};
                for (const j of escalados) zerado[j.id] = DISPONIVEIS;
                setAlocacao(zerado);
                setSelecionado(null);
                setAlterado(true);
              }}
            >
              Tirar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
