import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatDataPorExtenso } from "@/lib/mock";

type Posicao = Database["public"]["Enums"]["posicao"];

const POSICAO_ABREV: Record<Posicao, string> = {
  goleiro: "GOL",
  defensor: "DEF",
  "meio-campo": "MEI",
  atacante: "ATA",
};

const NOMES_TIMES = ["Time A", "Time B", "Time C", "Time D"];

const INPUT =
  "h-[52px] rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const SECTION_LABEL =
  "font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary";
const BTN_PRIMARY =
  "flex h-[52px] items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim disabled:opacity-50";
const BTN_SECONDARY =
  "flex h-[52px] items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-medium text-foreground disabled:opacity-50";

function optionClass(selected: boolean) {
  return [
    "flex min-h-[52px] items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors",
    selected
      ? "border-primary bg-surface-2 text-foreground"
      : "border-border bg-transparent text-muted-foreground hover:border-primary/40",
  ].join(" ");
}

interface PeladaAtual {
  id: string;
  data: string;
  local: string;
}

interface Jogador {
  id: string;
  apelido: string;
  fotoUrl: string | null;
  posicao: Posicao;
}

interface TimeRow {
  id: string;
  nome: string;
  ordem: number;
}

/** Chave de destino: "disponiveis" ou o id de um time. */
type Destino = string;
const DISPONIVEIS = "disponiveis";

export function AdminTimesScreen() {
  const navigate = useNavigate();

  const [pelada, setPelada] = useState<PeladaAtual | null>(null);
  const [confirmados, setConfirmados] = useState<Jogador[]>([]);
  const [times, setTimes] = useState<TimeRow[]>([]);
  /** playerId -> destino (id do time) ou DISPONIVEIS */
  const [alocacao, setAlocacao] = useState<Record<string, Destino>>({});
  const [quantidade, setQuantidade] = useState(2);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [dropAlvo, setDropAlvo] = useState<Destino | null>(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [criandoTimes, setCriandoTimes] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [confirmarReducao, setConfirmarReducao] = useState(false);
  const [confirmarZerar, setConfirmarZerar] = useState(false);

  const [timeAId, setTimeAId] = useState("");
  const [timeBId, setTimeBId] = useState("");

  const carregar = useCallback(async () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: p } = await supabase
      .from("peladas")
      .select("id, data, local")
      .gte("data", hoje)
      .neq("status", "finalizada")
      .order("data", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!p) {
      setPelada(null);
      setConfirmados([]);
      setTimes([]);
      setAlocacao({});
      return;
    }
    setPelada(p);

    const [{ data: pp }, { data: teamRows }] = await Promise.all([
      supabase
        .from("pelada_players")
        .select("player_id, players(id, apelido, foto_url, posicao_principal)")
        .eq("pelada_id", p.id),
      supabase
        .from("teams")
        .select("id, nome, ordem, team_players(player_id)")
        .eq("pelada_id", p.id)
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
      .sort((a, b) => a.apelido.localeCompare(b.apelido));
    setConfirmados(jogadores);

    const listaTimes = (teamRows ?? []).map((t) => ({ id: t.id, nome: t.nome, ordem: t.ordem }));
    setTimes(listaTimes);
    if (listaTimes.length >= 2) setQuantidade(listaTimes.length);
    setTimeAId(listaTimes[0]?.id ?? "");
    setTimeBId(listaTimes[1]?.id ?? "");

    const mapa: Record<string, Destino> = {};
    for (const j of jogadores) mapa[j.id] = DISPONIVEIS;
    for (const t of teamRows ?? []) {
      for (const tp of t.team_players ?? []) {
        if (mapa[tp.player_id] !== undefined) mapa[tp.player_id] = t.id;
      }
    }
    setAlocacao(mapa);
    setSelecionado(null);
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      await carregar();
      if (ativo) setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [carregar]);

  const aplicarTimes = async () => {
    if (!pelada || criandoTimes) return;
    setCriandoTimes(true);

    const atuais = [...times].sort((a, b) => a.ordem - b.ordem);

    if (quantidade > atuais.length) {
      const novas = [];
      for (let i = atuais.length; i < quantidade; i++) {
        novas.push({ pelada_id: pelada.id, nome: NOMES_TIMES[i] ?? `Time ${i + 1}`, ordem: i + 1 });
      }
      const { error } = await supabase.from("teams").insert(novas);
      if (error) {
        toast.error("Não foi possível salvar os times. " + error.message);
        setCriandoTimes(false);
        return;
      }
      await carregar();
      toast.success("Times atualizados.");
    } else if (quantidade < atuais.length) {
      const excedentes = atuais.slice(quantidade).map((t) => t.id);
      const { error } = await supabase.from("teams").delete().in("id", excedentes);
      if (error) {
        toast.error("Não foi possível remover os times extras. " + error.message);
        setCriandoTimes(false);
        return;
      }
      await carregar();
      toast.success("Times atualizados.");
    } else {
      toast.success("Nada para mudar.");
    }

    setCriandoTimes(false);
  };

  const handleAplicar = () => {
    if (quantidade < times.length) {
      setConfirmarReducao(true);
      return;
    }
    void aplicarTimes();
  };

  const mover = (playerId: string, destino: Destino) => {
    setAlocacao((prev) => ({ ...prev, [playerId]: destino }));
    setSelecionado(null);
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
        toast.error("Não foi possível salvar a composição. " + error.message);
        setSalvando(false);
        return;
      }
    }

    await carregar();
    setSalvando(false);
    toast.success("Composição salva.");
  };

  const iniciarPartida = async () => {
    if (!pelada || iniciando || times.length === 0 || timeAId === timeBId) return;
    setIniciando(true);

    const { count } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("pelada_id", pelada.id);

    const { data: criada, error } = await supabase
      .from("matches")
      .insert({
        pelada_id: pelada.id,
        team_a_id: timeAId,
        team_b_id: timeBId,
        status: "em_andamento",
        inicio_em: new Date().toISOString(),
        ordem: (count ?? 0) + 1,
      })
      .select("id")
      .single();

    if (error || !criada) {
      toast.error(error?.message ?? "Não foi possível iniciar a partida.");
      setIniciando(false);
      return;
    }

    const { error: upErr } = await supabase
      .from("peladas")
      .update({ status: "em_andamento" })
      .eq("id", pelada.id);
    if (upErr) toast.error("Partida criada, mas o status da pelada não mudou.");

    toast.success("Partida iniciada.");
    navigate({ to: "/partida/$id", params: { id: criada.id } });
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
            Nenhuma pelada marcada
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Marque uma pelada antes de montar os times.
          </p>
          <Link to="/admin/pelada" className={`${BTN_PRIMARY} mt-5 w-full`}>
            Marcar pelada
          </Link>
        </section>
      </>
    );
  }

  const jogadoresDe = (destino: Destino) =>
    confirmados.filter((j) => (alocacao[j.id] ?? DISPONIVEIS) === destino);

  const selecionadoJogador = confirmados.find((j) => j.id === selecionado) ?? null;
  const destinoAtualSelecionado = selecionado
    ? alocacao[selecionado] ?? DISPONIVEIS
    : null;

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
        <span className="text-xs text-muted-foreground">{POSICAO_ABREV[j.posicao]}</span>
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
    className: `mt-5 rounded-2xl border bg-surface p-5 ${
      dropAlvo === destino ? "border-primary" : "border-border"
    }`,
  });

  const disponiveis = jogadoresDe(DISPONIVEIS);

  return (
    <>
      <TopBar />

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground">
          Montar times
        </h1>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {formatDataPorExtenso(pelada.data)} · {pelada.local}
        </p>
      </header>

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
          onClick={handleAplicar}
          disabled={criandoTimes}
          className={`${BTN_PRIMARY} mt-3 w-full`}
        >
          {times.length === 0 ? "Criar times" : "Atualizar times"}
        </button>
      </section>

      {times.length > 0 && (
        <>
          <p className="mt-5 text-sm text-muted-foreground">
            As mudanças só valem depois de salvar.
          </p>

          <section {...cardProps(DISPONIVEIS)}>
            <div className="flex items-baseline justify-between gap-3">
              <p className={SECTION_LABEL}>Disponíveis</p>
              <span className="num text-2xl text-foreground">{disponiveis.length}</span>
            </div>
            {disponiveis.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Todos os confirmados já estão em um time.
              </p>
            ) : (
              <ul className="mt-3">{disponiveis.map(linhaJogador)}</ul>
            )}
          </section>

          {times.map((t) => {
            const doTime = jogadoresDe(t.id);
            return (
              <section key={t.id} {...cardProps(t.id)}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className={SECTION_LABEL}>{t.nome}</p>
                  <span className="num text-2xl text-foreground">{doTime.length}</span>
                </div>
                {doTime.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum jogador aqui ainda.</p>
                ) : (
                  <ul className="mt-3">{doTime.map(linhaJogador)}</ul>
                )}
              </section>
            );
          })}

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => setConfirmarZerar(true)}
              className={`${BTN_SECONDARY} w-full`}
            >
              Zerar times
            </button>
            <button
              type="button"
              onClick={() => void salvarComposicao()}
              disabled={salvando}
              className={`${BTN_PRIMARY} w-full`}
            >
              {salvando ? "Salvando..." : "Salvar composição"}
            </button>
          </div>

          <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
            <p className={SECTION_LABEL}>Partida</p>

            <div className="mt-3 grid gap-3">
              <div className="grid gap-2">
                <label htmlFor="time-a" className="text-sm font-medium text-foreground">
                  Time A
                </label>
                <select
                  id="time-a"
                  value={timeAId}
                  onChange={(e) => setTimeAId(e.target.value)}
                  className={INPUT}
                >
                  {times.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="time-b" className="text-sm font-medium text-foreground">
                  Time B
                </label>
                <select
                  id="time-b"
                  value={timeBId}
                  onChange={(e) => setTimeBId(e.target.value)}
                  className={INPUT}
                >
                  {times.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>

              {timeAId === timeBId && (
                <p className="text-xs text-destructive">Escolha dois times diferentes.</p>
              )}

              <button
                type="button"
                onClick={() => void iniciarPartida()}
                disabled={iniciando || times.length === 0 || timeAId === timeBId}
                className={`${BTN_PRIMARY} w-full`}
              >
                {iniciando ? "Iniciando..." : "Iniciar partida"}
              </button>
            </div>
          </section>
        </>
      )}

      {selecionadoJogador && (
        <div
          className="fixed inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur"
          style={{ bottom: "calc(56px + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto w-full max-w-md px-5 py-3">
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
                  Disponíveis
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
            <AlertDialogTitle>Apagar os times excedentes?</AlertDialogTitle>
            <AlertDialogDescription>
              Os jogadores desses times voltam para a lista de disponíveis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void aplicarTimes()}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarZerar} onOpenChange={setConfirmarZerar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zerar os times?</AlertDialogTitle>
            <AlertDialogDescription>
              Todo mundo volta para a lista de disponíveis. Só vale depois de salvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const zerado: Record<string, Destino> = {};
                for (const j of confirmados) zerado[j.id] = DISPONIVEIS;
                setAlocacao(zerado);
                setSelecionado(null);
              }}
            >
              Zerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
