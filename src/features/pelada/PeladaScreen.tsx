import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { TopBar } from "@/components/layout/TopBar";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { ErroCarregamento } from "@/components/layout/ErroCarregamento";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/ui";
import { StatusBadge } from "@/features/pelada/StatusBadge";
import { MvpCard } from "@/features/pelada/MvpCard";
import {
  buscarPeladasAbertas,
  escolherPeladaAtual,
  type PeladaAberta,
} from "@/features/pelada/peladaAtual";
import { useAuth } from "@/features/auth/AuthProvider";
import { posicaoLabel } from "@/features/jogadores/labels";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatDataCurta, formatDataPorExtenso, hojeLocalISO, somarDias } from "@/lib/format";

type Posicao = Database["public"]["Enums"]["posicao"];

interface Jogador {
  id: string;
  apelido: string;
  fotoUrl: string | null;
  posicao: Posicao | null;
  convidado: boolean;
  /** último dia de suspensão (inclusive), quando suspenso na data da pelada */
  suspensoAte: string | null;
}

interface TimeComJogadores {
  id: string;
  nome: string;
  jogadores: string[];
}

const SECTION_LABEL = "font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary";
const INPUT =
  "h-[48px] w-full rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
const BTN_SECUNDARIO = cn(
  "flex h-[52px] min-w-0 items-center justify-center rounded-xl border border-border bg-surface-2 px-3 text-center text-sm font-medium text-foreground transition-colors hover:border-primary/40",
  FOCUS_RING,
);

function Foto({ j }: { j: Pick<Jogador, "apelido" | "fotoUrl"> }) {
  if (j.fotoUrl) {
    return (
      <img
        src={j.fotoUrl}
        alt={j.apelido}
        width={36}
        height={36}
        referrerPolicy="no-referrer"
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }
  return <InitialsAvatar apelido={j.apelido} size={36} />;
}

function Detalhe({ j }: { j: Jogador }) {
  if (j.suspensoAte) {
    return (
      <span className="shrink-0 whitespace-nowrap text-xs text-destructive">
        Suspenso até {formatDataCurta(j.suspensoAte)}
      </span>
    );
  }
  return (
    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
      {j.convidado ? "Convidado" : posicaoLabel(j.posicao)}
    </span>
  );
}

export function PeladaScreen() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [abertas, setAbertas] = useState<PeladaAberta[]>([]);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [escalados, setEscalados] = useState<Jogador[]>([]);
  const [disponiveis, setDisponiveis] = useState<Jogador[]>([]);
  const [times, setTimes] = useState<TimeComJogadores[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [convidado, setConvidado] = useState("");
  const [criandoConvidado, setCriandoConvidado] = useState(false);

  const hojeISO = hojeLocalISO();
  const pelada = abertas.find((p) => p.id === selecionadaId) ?? null;

  const carregarEscalacao = useCallback(
    async (p: PeladaAberta) => {
      const [
        { data: escRows, error: errEsc },
        { data: ativos, error: errAtivos },
        { data: teamRows, error: errTimes },
      ] = await Promise.all([
        supabase
          .from("pelada_players")
          .select("player_id, players(id, apelido, foto_url, posicao_principal, profile_id)")
          .eq("pelada_id", p.id),
        supabase
          .from("players")
          .select("id, apelido, foto_url, posicao_principal, profile_id")
          .eq("ativo", true)
          .order("apelido", { ascending: true }),
        supabase
          .from("teams")
          .select("id, nome, ordem, team_players(players(id, apelido))")
          .eq("pelada_id", p.id)
          .order("ordem", { ascending: true }),
      ]);

      if (errEsc || errAtivos || errTimes) {
        setErro(true);
        return;
      }

      // Suspensões só são legíveis por admin (RLS); para jogador comum a lista vem vazia.
      const suspensoes = new Map<string, string>();
      if (isAdmin) {
        const { data: ocorrencias } = await supabase
          .from("ocorrencias_disciplinares")
          .select("player_id, data_ocorrencia, suspenso_ate")
          .eq("anulada", false)
          .lt("data_ocorrencia", p.data)
          .gt("suspenso_ate", p.data);
        for (const o of ocorrencias ?? []) {
          const ultimoDia = somarDias(o.suspenso_ate, -1);
          const atual = suspensoes.get(o.player_id);
          if (!atual || ultimoDia > atual) suspensoes.set(o.player_id, ultimoDia);
        }
      }

      const lista: Jogador[] = (escRows ?? [])
        .filter((row) => row.players)
        .map((row) => ({
          id: row.player_id,
          apelido: row.players!.apelido,
          fotoUrl: row.players!.foto_url,
          posicao: row.players!.posicao_principal,
          convidado: row.players!.profile_id === null,
          suspensoAte: null,
        }))
        .sort((a, b) => a.apelido.localeCompare(b.apelido, "pt-BR"));
      setEscalados(lista);

      const ids = new Set(lista.map((j) => j.id));
      setDisponiveis(
        (ativos ?? [])
          .filter((j) => !ids.has(j.id))
          .map((j) => ({
            id: j.id,
            apelido: j.apelido,
            fotoUrl: j.foto_url,
            posicao: j.posicao_principal,
            convidado: j.profile_id === null,
            suspensoAte: suspensoes.get(j.id) ?? null,
          })),
      );

      setTimes(
        (teamRows ?? []).map((t) => ({
          id: t.id,
          nome: t.nome,
          jogadores: (t.team_players ?? [])
            .map((tp) => tp.players?.apelido)
            .filter((a): a is string => !!a),
        })),
      );
    },
    [isAdmin],
  );

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      setErro(false);
      const { data, error } = await buscarPeladasAbertas();
      if (!ativo) return;
      if (error) {
        setErro(true);
        setLoading(false);
        return;
      }
      const lista = data ?? [];
      setAbertas(lista);
      const atual =
        lista.find((p) => p.id === selecionadaId) ?? escolherPeladaAtual(lista, hojeISO);
      setSelecionadaId(atual?.id ?? null);
      if (atual) await carregarEscalacao(atual);
      if (ativo) setLoading(false);
    })();
    return () => {
      ativo = false;
    };
    // selecionadaId fica de fora de propósito: trocar de pelada usa o efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hojeISO, carregarEscalacao, tentativa]);

  const trocarPelada = async (id: string) => {
    const p = abertas.find((x) => x.id === id);
    if (!p || id === selecionadaId) return;
    setSelecionadaId(id);
    setBusca("");
    await carregarEscalacao(p);
  };

  const carregarRef = useRef(carregarEscalacao);
  useEffect(() => {
    carregarRef.current = carregarEscalacao;
  }, [carregarEscalacao]);

  // Um único canal por pelada: a assinatura só depende do id.
  useEffect(() => {
    if (!pelada) return;
    const alvo = pelada;
    const channel = supabase
      .channel(`pelada_screen:${alvo.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pelada_players",
          filter: `pelada_id=eq.${alvo.id}`,
        },
        () => {
          void carregarRef.current(alvo);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pelada?.id]);

  const remover = async (j: Jogador) => {
    if (!pelada || busyId) return;
    setBusyId(j.id);
    const { error } = await supabase
      .from("pelada_players")
      .delete()
      .eq("pelada_id", pelada.id)
      .eq("player_id", j.id);
    if (error) {
      toast.error(
        error.code === "23503"
          ? `${j.apelido} já tem números na súmula. Zere a súmula antes de tirar da escalação.`
          : "Não foi possível tirar da escalação. " + error.message,
      );
    } else {
      await carregarEscalacao(pelada);
      toast.success(`${j.apelido} saiu da escalação.`);
    }
    setBusyId(null);
  };

  const escalar = async (j: Pick<Jogador, "id" | "apelido">) => {
    if (!pelada || busyId) return;
    setBusyId(j.id);
    const { error } = await supabase
      .from("pelada_players")
      .insert({ pelada_id: pelada.id, player_id: j.id });
    if (error) toast.error(error.message);
    else {
      await carregarEscalacao(pelada);
      toast.success(`${j.apelido} escalado.`);
    }
    setBusyId(null);
  };

  const adicionarConvidado = async (e: React.FormEvent) => {
    e.preventDefault();
    const apelido = convidado.trim();
    if (!pelada || !apelido || criandoConvidado) return;

    const existente = disponiveis.find(
      (j) => j.apelido.localeCompare(apelido, "pt-BR", { sensitivity: "base" }) === 0,
    );
    if (existente) {
      toast.message(`${existente.apelido} já está cadastrado. Escale pela lista.`);
      setBusca(existente.apelido);
      return;
    }

    setCriandoConvidado(true);
    const { data: novo, error } = await supabase
      .from("players")
      .insert({ nome: apelido, apelido })
      .select("id, apelido")
      .single();
    if (error || !novo) {
      toast.error("Não foi possível cadastrar o convidado. " + (error?.message ?? ""));
      setCriandoConvidado(false);
      return;
    }
    setConvidado("");
    setCriandoConvidado(false);
    await escalar(novo);
  };

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return disponiveis;
    return disponiveis.filter((j) => j.apelido.toLocaleLowerCase("pt-BR").includes(termo));
  }, [busca, disponiveis]);

  if (erro) {
    return (
      <>
        <TopBar />
        <div className="mt-2">
          <ErroCarregamento onRetry={() => setTentativa((t) => t + 1)} />
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <TopBar />
        <Skeleton className="mt-2 h-8 w-3/4" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-[260px] w-full rounded-2xl" />
          <Skeleton className="h-[260px] w-full rounded-2xl" />
        </div>
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
            Assim que a próxima for marcada ela aparece aqui.
          </p>
          {isAdmin && (
            <Link
              to="/admin/pelada"
              className={cn(
                "mt-5 flex h-[52px] w-full items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground transition-colors hover:bg-primary-dim",
                FOCUS_RING,
              )}
            >
              Criar pelada
            </Link>
          )}
        </section>
        <MvpCard />
      </>
    );
  }

  return (
    <>
      <TopBar />

      {isAdmin && abertas.length > 1 && (
        <nav
          aria-label="Peladas em aberto"
          className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {abertas.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === pelada.id}
              onClick={() => void trocarPelada(p.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                p.id === pelada.id
                  ? "border-primary bg-surface-2 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40",
                FOCUS_RING,
              )}
            >
              {formatDataCurta(p.data)} · {p.local}
            </button>
          ))}
        </nav>
      )}

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground md:text-3xl">
          {formatDataPorExtenso(pelada.data)}
        </h1>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {pelada.horario} · {pelada.local}
        </p>
        <p className="mt-3">
          <StatusBadge status={pelada.status} />
        </p>
        {pelada.data < hojeISO && (
          <p className="mt-3 rounded-xl border border-primary/40 bg-surface p-3 text-xs text-muted-foreground">
            Esta pelada já aconteceu e continua em aberto. Ela vai para o histórico quando o
            resultado for publicado.
          </p>
        )}
      </header>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className={SECTION_LABEL}>Escalados</p>
            <span className="num text-2xl text-foreground">{escalados.length}</span>
          </div>

          {escalados.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {isAdmin
                ? "Ninguém escalado ainda. Adicione os jogadores ao lado."
                : "A escalação ainda não foi montada pelos admins."}
            </p>
          ) : (
            <ul className="mt-3">
              {escalados.map((j) => (
                <li
                  key={j.id}
                  className={cn(
                    "grid items-center gap-3 border-b border-border py-3 last:border-b-0 last:pb-0",
                    isAdmin
                      ? "grid-cols-[auto_minmax(0,1fr)_auto_auto]"
                      : "grid-cols-[auto_minmax(0,1fr)_auto]",
                  )}
                >
                  <Foto j={j} />
                  <span className="truncate text-sm text-foreground">{j.apelido}</span>
                  <Detalhe j={j} />
                  {isAdmin && (
                    <button
                      type="button"
                      aria-label={"Tirar " + j.apelido + " da escalação"}
                      disabled={busyId === j.id}
                      onClick={() => void remover(j)}
                      className={cn(
                        "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50",
                        FOCUS_RING,
                      )}
                    >
                      <X size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-5">
          {isAdmin && (
            <section className="rounded-2xl border border-border bg-surface p-5">
              <p className={SECTION_LABEL}>Adicionar à escalação</p>

              <form
                onSubmit={adicionarConvidado}
                className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2"
              >
                <label htmlFor="novo-convidado" className="sr-only">
                  Nome ou apelido do convidado
                </label>
                <input
                  id="novo-convidado"
                  value={convidado}
                  onChange={(e) => setConvidado(e.target.value)}
                  placeholder="Convidado sem conta (nome ou apelido)"
                  maxLength={40}
                  className={INPUT}
                />
                <button
                  type="submit"
                  disabled={!convidado.trim() || criandoConvidado}
                  aria-label="Adicionar convidado"
                  className={cn(
                    "flex h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary-dim disabled:opacity-50",
                    FOCUS_RING,
                  )}
                >
                  <UserPlus size={18} />
                </button>
              </form>

              <div className="relative mt-3">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <label htmlFor="busca-jogador" className="sr-only">
                  Buscar jogador cadastrado
                </label>
                <input
                  id="busca-jogador"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar jogador cadastrado"
                  className={cn(INPUT, "pl-10")}
                />
              </div>

              {filtrados.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {disponiveis.length === 0
                    ? "Todos os jogadores ativos já estão escalados."
                    : "Ninguém com esse nome."}
                </p>
              ) : (
                <ul className="mt-3 max-h-[420px] overflow-y-auto pr-1">
                  {filtrados.map((j) => (
                    <li
                      key={j.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border py-3 last:border-b-0 last:pb-0"
                    >
                      <Foto j={j} />
                      <span className="truncate text-sm text-foreground">{j.apelido}</span>
                      <Detalhe j={j} />
                      <button
                        type="button"
                        aria-label={"Escalar " + j.apelido}
                        disabled={busyId === j.id || j.suspensoAte !== null}
                        onClick={() => void escalar(j)}
                        className={cn(
                          "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary disabled:opacity-40",
                          FOCUS_RING,
                        )}
                      >
                        <Plus size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section>
            <p className={SECTION_LABEL}>Times</p>
            {times.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Times ainda não sorteados.</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {times.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-border bg-surface p-5">
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {t.nome}
                    </h3>
                    <ul className="mt-2 grid gap-1">
                      {t.jogadores.map((apelido) => (
                        <li key={apelido} className="truncate text-sm text-muted-foreground">
                          {apelido}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <MvpCard />

      {isAdmin && (
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <Link to="/admin/times" className={BTN_SECUNDARIO}>
            <span className="truncate">Sortear times</span>
          </Link>
          <Link to="/admin/sumula" className={BTN_SECUNDARIO}>
            <span className="truncate">Súmula</span>
          </Link>
          <Link to="/admin" className={BTN_SECUNDARIO}>
            <span className="truncate">Painel</span>
          </Link>
        </div>
      )}
    </>
  );
}
