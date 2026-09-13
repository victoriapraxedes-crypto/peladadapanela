import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { TopBar } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { ErroCarregamento } from "@/components/layout/ErroCarregamento";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { StatusBadge } from "@/features/pelada/StatusBadge";
import { useAuth } from "@/features/auth/AuthProvider";
import { POSICAO_LABEL } from "@/features/jogadores/labels";
import { supabase } from "@/integrations/supabase/client";
import { formatDataPorExtenso } from "@/lib/format";
import type { Database, Tables } from "@/integrations/supabase/types";

type Posicao = Database["public"]["Enums"]["posicao"];
type PeladaRow = Pick<Tables<"peladas">, "id" | "data" | "horario" | "local" | "status">;

interface Presente {
  id: string;
  apelido: string;
  fotoUrl: string | null;
  posicao: Posicao;
}

interface TimeInfo {
  id: string;
  nome: string;
  ordem: number;
  jogadores: string[];
}

interface MatchRow {
  id: string;
  ordem: number;
  status: string;
  placar_a: number;
  placar_b: number;
  team_a_id: string;
  team_b_id: string;
}

interface EventoRow {
  id: string;
  match_id: string;
  tipo: Database["public"]["Enums"]["match_event_type"];
  team_id: string;
  criado_em: string;
  autorApelido: string;
  assistApelido: string | null;
}

function nomes(lista: string[]) {
  return lista.join(" e ");
}

export function PeladaHistoricoScreen({ peladaId }: { peladaId: string }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [loading, setLoading] = useState(true);
  const [pelada, setPelada] = useState<PeladaRow | null>(null);
  const [presentes, setPresentes] = useState<Presente[]>([]);
  const [times, setTimes] = useState<TimeInfo[]>([]);
  const [partidas, setPartidas] = useState<MatchRow[]>([]);
  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [mvps, setMvps] = useState<string[]>([]);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    async function load() {
      setLoading(true);
      setErro(false);

      const peladaRes = await supabase
        .from("peladas")
        .select("id, data, horario, local, status")
        .eq("id", peladaId)
        .maybeSingle();

      if (!ativo) return;
      if (peladaRes.error) {
        setErro(true);
        setLoading(false);
        return;
      }
      if (!peladaRes.data) {
        setPelada(null);
        setLoading(false);
        return;
      }

      const [presentesRes, timesRes, matchesRes, mvpRes] = await Promise.all([
        supabase
          .from("pelada_players")
          .select("player_id, players(id, apelido, foto_url, posicao_principal)")
          .eq("pelada_id", peladaId),
        supabase
          .from("teams")
          .select("id, nome, ordem, team_players(players(id, apelido))")
          .eq("pelada_id", peladaId)
          .order("ordem", { ascending: true }),
        supabase
          .from("matches")
          .select("id, ordem, status, placar_a, placar_b, team_a_id, team_b_id")
          .eq("pelada_id", peladaId)
          .order("ordem", { ascending: true }),
        supabase.from("mvp_winners").select("player_id").eq("pelada_id", peladaId),
      ]);

      const matches = (matchesRes.data ?? []) as MatchRow[];
      const matchIds = matches.map((m) => m.id);
      const eventosRes = matchIds.length
        ? await supabase
            .from("match_events")
            .select(
              "id, match_id, tipo, team_id, criado_em, autor:players!match_events_player_id_fkey(apelido), assistente:players!match_events_assist_player_id_fkey(apelido)",
            )
            .in("match_id", matchIds)
            .order("criado_em", { ascending: true })
        : { data: [] as unknown[] };

      if (!ativo) return;
      if (
        presentesRes.error ||
        timesRes.error ||
        matchesRes.error ||
        mvpRes.error ||
        ("error" in eventosRes && eventosRes.error)
      ) {
        setErro(true);
        setLoading(false);
        return;
      }

      const listaPresentes = (presentesRes.data ?? [])
        .map((r) => r.players)
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => ({
          id: p.id,
          apelido: p.apelido,
          fotoUrl: p.foto_url,
          posicao: p.posicao_principal,
        }))
        .sort((a, b) => a.apelido.localeCompare(b.apelido, "pt-BR"));
      setPresentes(listaPresentes);

      const apelidoPorId = new Map(listaPresentes.map((p) => [p.id, p.apelido]));

      setTimes(
        (timesRes.data ?? []).map((t) => ({
          id: t.id,
          nome: t.nome,
          ordem: t.ordem,
          jogadores: (t.team_players ?? [])
            .map((tp) => tp.players?.apelido)
            .filter((v): v is string => !!v)
            .sort((a, b) => a.localeCompare(b, "pt-BR")),
        })),
      );

      setPartidas(matches);

      const brutos = (eventosRes.data ?? []) as unknown as {
        id: string;
        match_id: string;
        tipo: EventoRow["tipo"];
        team_id: string;
        criado_em: string;
        autor: { apelido: string } | null;
        assistente: { apelido: string } | null;
      }[];
      setEventos(
        brutos.map((e) => ({
          id: e.id,
          match_id: e.match_id,
          tipo: e.tipo,
          team_id: e.team_id,
          criado_em: e.criado_em,
          autorApelido: e.autor?.apelido ?? "Jogador",
          assistApelido: e.assistente?.apelido ?? null,
        })),
      );

      setMvps(
        (mvpRes.data ?? [])
          .map((m) => (m.player_id ? apelidoPorId.get(m.player_id) : null))
          .filter((v): v is string => !!v),
      );

      setPelada(peladaRes.data);
      setLoading(false);
    }
    void load();
    return () => {
      ativo = false;
    };
  }, [peladaId, tentativa]);

  const nomeTime = useMemo(() => new Map(times.map((t) => [t.id, t.nome])), [times]);

  const artilheiros = useMemo(() => {
    const contagem = new Map<string, number>();
    eventos
      .filter((e) => e.tipo === "gol")
      .forEach((e) => contagem.set(e.autorApelido, (contagem.get(e.autorApelido) ?? 0) + 1));
    const max = Math.max(0, ...contagem.values());
    if (max === 0) return { nomes: [] as string[], total: 0 };
    return {
      nomes: [...contagem.entries()].filter(([, v]) => v === max).map(([k]) => k),
      total: max,
    };
  }, [eventos]);

  const assistentes = useMemo(() => {
    const contagem = new Map<string, number>();
    eventos.forEach((e) => {
      if (!e.assistApelido) return;
      contagem.set(e.assistApelido, (contagem.get(e.assistApelido) ?? 0) + 1);
    });
    const max = Math.max(0, ...contagem.values());
    if (max === 0) return { nomes: [] as string[], total: 0 };
    return {
      nomes: [...contagem.entries()].filter(([, v]) => v === max).map(([k]) => k),
      total: max,
    };
  }, [eventos]);

  const temGol = eventos.some((e) => e.tipo === "gol");

  if (erro) {
    return (
      <>
        <TopBar />
        <div className="mt-4">
          <ErroCarregamento onRetry={() => setTentativa((t) => t + 1)} />
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="mt-4 grid gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </>
    );
  }

  if (!pelada) {
    return (
      <>
        <TopBar />
        <div className="mt-8 grid gap-4">
          <p className="text-sm text-foreground">Pelada não encontrada.</p>
          <Link
            to="/historico"
            className="flex h-[52px] w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground"
          >
            Voltar ao histórico
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground">
          {formatDataPorExtenso(pelada.data)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pelada.horario} · {pelada.local}
        </p>
      </header>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary">
          Resumo da noite
        </p>

        {temGol ? (
          <div className="mt-4 grid gap-4">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <InitialsAvatar apelido={artilheiros.nomes[0] ?? "?"} size={36} />
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                  Artilheiro da noite
                </span>
                <span className="block truncate text-sm text-foreground">
                  {nomes(artilheiros.nomes)}
                </span>
              </span>
              <span className="num text-2xl text-foreground">{artilheiros.total}</span>
            </div>

            {assistentes.nomes.length > 0 && (
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <InitialsAvatar apelido={assistentes.nomes[0] ?? "?"} size={36} />
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                    Líder de assistências
                  </span>
                  <span className="block truncate text-sm text-foreground">
                    {nomes(assistentes.nomes)}
                  </span>
                </span>
                <span className="num text-2xl text-foreground">{assistentes.total}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum gol registrado nesta pelada.</p>
        )}

        <div className="mt-4 border-t border-border pt-4">
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
            MVP da galera
          </span>
          {mvps.length > 0 ? (
            <span className="mt-1 block text-sm text-foreground">{nomes(mvps)}</span>
          ) : (
            <span className="mt-1 block text-sm text-muted-foreground">Sem votação.</span>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-baseline gap-2">
          <span className="num text-2xl text-foreground">{presentes.length}</span>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            Presentes
          </p>
        </div>
        <ul className="mt-3">
          {presentes.map((p) => (
            <li
              key={p.id}
              className="grid min-h-[56px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border last:border-b-0"
            >
              {p.fotoUrl ? (
                <img
                  src={p.fotoUrl}
                  alt={p.apelido}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <InitialsAvatar apelido={p.apelido} size={36} />
              )}
              <span className="truncate text-sm text-foreground">{p.apelido}</span>
              <span className="text-xs text-muted-foreground">{POSICAO_LABEL[p.posicao]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary">
          Times
        </p>
        {times.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Times não foram montados.</p>
        ) : (
          <div className="mt-3 grid gap-4">
            {times.map((t) => (
              <div key={t.id}>
                <p className="text-sm font-medium text-foreground">{t.nome}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.jogadores.length > 0 ? t.jogadores.join(", ") : "Sem jogadores."}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5">
        <h2 className="font-display text-base font-semibold text-foreground">Partidas</h2>
        {partidas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma partida registrada nesta pelada.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {partidas.map((m) => {
              const doJogo = eventos.filter((e) => e.match_id === m.id);
              return (
                <div key={m.id} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        {nomeTime.get(m.team_a_id) ?? "Time A"} x{" "}
                        {nomeTime.get(m.team_b_id) ?? "Time B"}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={m.status} />
                      </div>
                    </div>
                    <span className="num shrink-0 text-3xl text-foreground">
                      {m.placar_a} - {m.placar_b}
                    </span>
                  </div>

                  {doJogo.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">Sem gols.</p>
                  ) : (
                    <ul className="mt-4 grid gap-3">
                      {doJogo.map((e) => (
                        <li key={e.id}>
                          <p className="text-sm text-foreground">
                            {e.tipo === "gol"
                              ? `⚽ ${e.autorApelido}`
                              : `⚽ Gol contra — ${e.autorApelido}`}
                          </p>
                          {e.tipo === "gol" ? (
                            <p className="text-xs text-muted-foreground">
                              {e.assistApelido ? `Assistência: ${e.assistApelido} · ` : ""}
                              {nomeTime.get(e.team_id) ?? "Time"}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Ponto para {nomeTime.get(e.team_id) ?? "Time"}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
