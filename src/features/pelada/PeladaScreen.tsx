import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { TopBar } from "@/components/layout/TopBar";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/features/pelada/StatusBadge";
import { useAuth } from "@/features/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatDataPorExtenso } from "@/lib/mock";

type PeladaStatus = Database["public"]["Enums"]["pelada_status"];
type MatchStatus = Database["public"]["Enums"]["match_status"];
type Posicao = Database["public"]["Enums"]["posicao"];

const POSICAO_LABEL: Record<Posicao, string> = {
  goleiro: "Goleiro",
  defensor: "Defensor",
  "meio-campo": "Meio-campo",
  atacante: "Atacante",
};

interface PeladaAtual {
  id: string;
  data: string;
  horario: string;
  local: string;
  status: PeladaStatus;
}

interface Confirmado {
  id: string;
  apelido: string;
  fotoUrl: string | null;
  posicao: Posicao;
}

interface TimeComJogadores {
  id: string;
  nome: string;
  jogadores: string[];
}

interface PartidaResumo {
  id: string;
  timeA: string;
  timeB: string;
  placarA: number;
  placarB: number;
  status: MatchStatus;
}

const SECTION_LABEL =
  "font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary";

export function PeladaScreen() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [pelada, setPelada] = useState<PeladaAtual | null>(null);
  const [confirmados, setConfirmados] = useState<Confirmado[]>([]);
  const [naoConfirmados, setNaoConfirmados] = useState<Confirmado[]>([]);
  const [times, setTimes] = useState<TimeComJogadores[]>([]);
  const [partidas, setPartidas] = useState<PartidaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [presencaBusyId, setPresencaBusyId] = useState<string | null>(null);

  const hojeISO = new Date().toISOString().slice(0, 10);

  // "Ainda não confirmaram" é derivado: não existe estado "recusado" no banco,
  // a linha em pelada_players existe ou não existe.
  const fetchConfirmados = useCallback(async (peladaId: string) => {
    const [{ data }, { data: ativos }] = await Promise.all([
      supabase
        .from("pelada_players")
        .select("player_id, players(id, apelido, foto_url, posicao_principal)")
        .eq("pelada_id", peladaId),
      supabase
        .from("players")
        .select("id, apelido, foto_url, posicao_principal")
        .eq("ativo", true)
        .order("apelido", { ascending: true }),
    ]);

    const lista = (data ?? [])
      .filter((row) => row.players)
      .map((row) => ({
        id: row.player_id,
        apelido: row.players!.apelido,
        fotoUrl: row.players!.foto_url,
        posicao: row.players!.posicao_principal,
      }));
    setConfirmados(lista);

    const confirmadosIds = new Set(lista.map((c) => c.id));
    setNaoConfirmados(
      (ativos ?? [])
        .filter((p) => !confirmadosIds.has(p.id))
        .map((p) => ({
          id: p.id,
          apelido: p.apelido,
          fotoUrl: p.foto_url,
          posicao: p.posicao_principal,
        })),
    );
  }, []);

  const removerPresenca = async (peladaId: string, c: Confirmado) => {
    if (presencaBusyId) return;
    setPresencaBusyId(c.id);
    const { error } = await supabase
      .from("pelada_players")
      .delete()
      .eq("pelada_id", peladaId)
      .eq("player_id", c.id);
    if (error) toast.error(error.message);
    else {
      await fetchConfirmados(peladaId);
      toast.success(`${c.apelido} removido.`);
    }
    setPresencaBusyId(null);
  };

  const adicionarPresenca = async (peladaId: string, c: Confirmado) => {
    if (presencaBusyId) return;
    setPresencaBusyId(c.id);
    const { error } = await supabase
      .from("pelada_players")
      .insert({ pelada_id: peladaId, player_id: c.id });
    if (error) toast.error(error.message);
    else {
      await fetchConfirmados(peladaId);
      toast.success(`${c.apelido} confirmado.`);
    }
    setPresencaBusyId(null);
  };

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("peladas")
        .select("id, data, horario, local, status")
        .gte("data", hojeISO)
        .neq("status", "finalizada")
        .order("data", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!ativo) return;
      if (!data) {
        setPelada(null);
        setConfirmados([]);
        setNaoConfirmados([]);
        setTimes([]);
        setPartidas([]);
        setLoading(false);
        return;
      }
      setPelada(data);

      const [{ data: teamRows }, { data: matchRows }] = await Promise.all([
        supabase
          .from("teams")
          .select("id, nome, ordem, team_players(players(id, apelido))")
          .eq("pelada_id", data.id)
          .order("ordem", { ascending: true }),
        supabase
          .from("matches")
          .select("id, ordem, placar_a, placar_b, status, team_a:team_a_id(nome), team_b:team_b_id(nome)")
          .eq("pelada_id", data.id)
          .order("ordem", { ascending: true }),
      ]);

      if (!ativo) return;
      setTimes(
        (teamRows ?? []).map((t) => ({
          id: t.id,
          nome: t.nome,
          jogadores: (t.team_players ?? [])
            .map((tp) => tp.players?.apelido)
            .filter((a): a is string => !!a),
        })),
      );
      setPartidas(
        (matchRows ?? []).map((m) => ({
          id: m.id,
          timeA: m.team_a?.nome ?? "Time A",
          timeB: m.team_b?.nome ?? "Time B",
          placarA: m.placar_a,
          placarB: m.placar_b,
          status: m.status,
        })),
      );

      await fetchConfirmados(data.id);
      if (ativo) setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [hojeISO, fetchConfirmados]);

  useEffect(() => {
    if (!pelada) return;
    const channel = supabase
      .channel(`pelada_screen:${pelada.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pelada_players",
          filter: `pelada_id=eq.${pelada.id}`,
        },
        () => {
          void fetchConfirmados(pelada.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pelada, fetchConfirmados]);

  if (loading) {
    return (
      <>
        <TopBar />
        <Skeleton className="mt-2 h-8 w-3/4" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-5 h-[220px] w-full rounded-2xl" />
        <Skeleton className="mt-5 h-[120px] w-full rounded-2xl" />
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
            Assim que a próxima for aberta ela aparece aqui.
          </p>
          {isAdmin && (
            <Link
              to="/admin/pelada"
              className="mt-5 flex h-[52px] w-full items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim"
            >
              Criar pelada
            </Link>
          )}
        </section>
      </>
    );
  }

  return (
    <>
      <TopBar />

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground">
          {formatDataPorExtenso(pelada.data)}
        </h1>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {pelada.horario} · {pelada.local}
        </p>
        <p className="mt-3">
          <StatusBadge status={pelada.status} />
        </p>
      </header>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className={SECTION_LABEL}>Confirmados</p>
          <span className="num text-2xl text-foreground">{confirmados.length}</span>
        </div>

        {confirmados.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Ninguém confirmou ainda.</p>
        ) : (
          <ul className="mt-3">
            {confirmados.map((c) => (
              <li
                key={c.id}
                className={`grid items-center gap-3 border-b border-border py-3 last:border-b-0 last:pb-0 ${
                  isAdmin
                    ? "grid-cols-[auto_minmax(0,1fr)_auto_auto]"
                    : "grid-cols-[auto_minmax(0,1fr)_auto]"
                }`}
              >
                {c.fotoUrl ? (
                  <img
                    src={c.fotoUrl}
                    alt={c.apelido}
                    width={36}
                    height={36}
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <InitialsAvatar apelido={c.apelido} size={36} />
                )}
                <span className="truncate text-sm text-foreground">{c.apelido}</span>
                <span className="text-xs text-muted-foreground">{POSICAO_LABEL[c.posicao]}</span>
                {isAdmin && (
                  <button
                    type="button"
                    aria-label={"Remover " + c.apelido}
                    disabled={presencaBusyId === c.id}
                    onClick={() => void removerPresenca(pelada.id, c)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (
        <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className={SECTION_LABEL}>Ainda não confirmaram</p>
            <span className="num text-2xl text-foreground">{naoConfirmados.length}</span>
          </div>

          {naoConfirmados.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Todo mundo já confirmou.</p>
          ) : (
            <ul className="mt-3">
              {naoConfirmados.map((c) => (
                <li
                  key={c.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border py-3 last:border-b-0 last:pb-0"
                >
                  {c.fotoUrl ? (
                    <img
                      src={c.fotoUrl}
                      alt={c.apelido}
                      width={36}
                      height={36}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar apelido={c.apelido} size={36} />
                  )}
                  <span className="truncate text-sm text-foreground">{c.apelido}</span>
                  <span className="text-xs text-muted-foreground">{POSICAO_LABEL[c.posicao]}</span>
                  <button
                    type="button"
                    aria-label={"Adicionar " + c.apelido}
                    disabled={presencaBusyId === c.id}
                    onClick={() => void adicionarPresenca(pelada.id, c)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-5">
        <p className={SECTION_LABEL}>Times</p>
        {times.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Times ainda não definidos.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {times.map((t) => (
              <div key={t.id} className="rounded-2xl border border-border bg-surface p-5">
                <h3 className="font-display text-base font-semibold text-foreground">{t.nome}</h3>
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

      <section className="mt-5">
        <p className={SECTION_LABEL}>Partidas</p>
        {partidas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma partida ainda.</p>
        ) : (
          <ul className="mt-3 rounded-2xl border border-border bg-surface px-5">
            {partidas.map((p) => (
              // TODO: link para /partida/$id no bloco 3
              <li
                key={p.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-4 last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">
                    {p.timeA} x {p.timeB}
                  </span>
                  <span className="mt-1 block">
                    <StatusBadge status={p.status} />
                  </span>
                </span>
                <span className="num text-xl text-foreground">
                  {p.placarA} – {p.placarB}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            to="/admin/times"
            className="flex h-[52px] items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-medium text-foreground"
          >
            Montar times
          </Link>
          <Link
            to="/admin"
            className="flex h-[52px] items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-medium text-foreground"
          >
            Painel
          </Link>
        </div>
      )}
    </>
  );
}
