import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, History, Minus, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { TopBar } from "@/components/layout/TopBar";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { escolherPeladaAtual } from "@/features/pelada/peladaAtual";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatDataCurta, formatDataPorExtenso, hojeLocalISO, somarDias } from "@/lib/format";
import { PONTOS, SUSPENSAO_MESES, formatPontos, previaPontos } from "@/lib/pontuacao";
import { FOCUS_RING } from "@/lib/ui";
import { cn } from "@/lib/utils";

type ResultadoStatus = Database["public"]["Enums"]["resultado_status"];

interface PeladaItem {
  id: string;
  data: string;
  local: string;
  resultado: ResultadoStatus;
  publicado_em: string | null;
}

interface Linha {
  playerId: string;
  apelido: string;
  fotoUrl: string | null;
  convidado: boolean;
  gols: number;
  assistencias: number;
  carrinhos: number;
}

interface Ocorrencia {
  id: string;
  playerId: string;
  descricao: string | null;
  suspensoAte: string;
  anulada: boolean;
  justificativa: string | null;
}

interface RegistroAuditoria {
  id: number;
  acao: string;
  entidade: string;
  playerId: string | null;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  justificativa: string | null;
  feitoPor: string | null;
  feitoEm: string;
}

type Campo = "gols" | "assistencias" | "carrinhos";

const CAMPOS: { campo: Campo; rotulo: string; curto: string }[] = [
  { campo: "gols", rotulo: "Gols", curto: "G" },
  { campo: "assistencias", rotulo: "Assistências", curto: "A" },
  { campo: "carrinhos", rotulo: "Carrinhos", curto: "C" },
];

const SECTION_LABEL = "font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary";
const INPUT =
  "h-[52px] w-full rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary";
const TEXTAREA =
  "min-h-[96px] w-full rounded-xl border border-border bg-surface-2 p-3 text-sm text-foreground outline-none transition-colors focus:border-primary";
const BTN_PRIMARY = cn(
  "flex h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-4 font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground transition-colors hover:bg-primary-dim disabled:opacity-50",
  FOCUS_RING,
);
const BTN_SECONDARY = cn(
  "flex h-[52px] items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40 disabled:opacity-50",
  FOCUS_RING,
);
const STEP_BTN = cn(
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-foreground transition-colors hover:border-primary/40 disabled:opacity-40",
  FOCUS_RING,
);

const ACAO_LABEL: Record<string, string> = {
  insert: "lançou",
  update: "corrigiu",
  delete: "apagou",
  publicar: "publicou o resultado",
  despublicar: "voltou para rascunho",
  anular: "anulou a ocorrência",
  vincular_convidado: "vinculou convidado",
};

function mensagemErro(error: { message: string } | null): string {
  return error?.message ?? "Erro desconhecido.";
}

function formatDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function Stepper({
  valor,
  rotulo,
  apelido,
  onChange,
  desabilitado,
  minimo = 0,
}: {
  valor: number;
  rotulo: string;
  apelido: string;
  onChange: (v: number) => void;
  desabilitado?: boolean;
  minimo?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border px-2 py-2">
      <span className="text-xs text-muted-foreground">{rotulo}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Tirar 1 de ${rotulo.toLowerCase()} de ${apelido}`}
          className={STEP_BTN}
          disabled={desabilitado || valor <= minimo}
          onClick={() => onChange(valor - 1)}
        >
          <Minus size={16} />
        </button>
        <span className="num w-8 text-center text-xl text-foreground" aria-live="polite">
          {valor}
        </span>
        <button
          type="button"
          aria-label={`Somar 1 em ${rotulo.toLowerCase()} de ${apelido}`}
          className={STEP_BTN}
          disabled={desabilitado || valor >= 99}
          onClick={() => onChange(valor + 1)}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export function AdminSumulaScreen() {
  const [peladas, setPeladas] = useState<PeladaItem[]>([]);
  const [peladaId, setPeladaId] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([]);
  const [nomes, setNomes] = useState<Map<string, string>>(new Map());

  const [loading, setLoading] = useState(true);
  const [carregandoPelada, setCarregandoPelada] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [confirmarPublicar, setConfirmarPublicar] = useState(false);
  const [pedirMotivo, setPedirMotivo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [lesaoAlvo, setLesaoAlvo] = useState<Linha | null>(null);
  const [lesaoDescricao, setLesaoDescricao] = useState("");
  const [anularAlvo, setAnularAlvo] = useState<Ocorrencia | null>(null);
  const [anularMotivo, setAnularMotivo] = useState("");
  const [anularRemoveCarrinho, setAnularRemoveCarrinho] = useState(true);

  const pelada = peladas.find((p) => p.id === peladaId) ?? null;
  const publicado = pelada?.resultado === "publicado";

  const chave = (l: Pick<Linha, Campo>) => `${l.gols}|${l.assistencias}|${l.carrinhos}`;
  const alteradas = useMemo(
    () => linhas.filter((l) => original[l.playerId] !== chave(l)),
    [linhas, original],
  );
  const sujo = alteradas.length > 0;

  const carregarPelada = useCallback(async (id: string) => {
    setCarregandoPelada(true);
    const [
      { data: esc, error: errEsc },
      { data: stats, error: errStats },
      { data: ocs },
      { data: aud },
    ] = await Promise.all([
      supabase
        .from("pelada_players")
        .select("player_id, players(apelido, foto_url, profile_id)")
        .eq("pelada_id", id),
      supabase
        .from("pelada_stats")
        .select("player_id, gols, assistencias, carrinhos")
        .eq("pelada_id", id),
      supabase
        .from("ocorrencias_disciplinares")
        .select("id, player_id, descricao, suspenso_ate, anulada, justificativa_anulacao")
        .eq("pelada_id", id)
        .order("registrado_em", { ascending: false }),
      supabase
        .from("auditoria_resultados")
        .select("id, acao, entidade, player_id, antes, depois, justificativa, feito_por, feito_em")
        .eq("pelada_id", id)
        .order("feito_em", { ascending: false })
        .limit(50),
    ]);

    if (errEsc || errStats) {
      toast.error("Não foi possível carregar a súmula. " + mensagemErro(errEsc ?? errStats));
      setCarregandoPelada(false);
      return;
    }

    const porJogador = new Map((stats ?? []).map((s) => [s.player_id, s]));
    const novas: Linha[] = (esc ?? [])
      .filter((r) => r.players)
      .map((r) => {
        const s = porJogador.get(r.player_id);
        return {
          playerId: r.player_id,
          apelido: r.players!.apelido,
          fotoUrl: r.players!.foto_url,
          convidado: r.players!.profile_id === null,
          gols: s?.gols ?? 0,
          assistencias: s?.assistencias ?? 0,
          carrinhos: s?.carrinhos ?? 0,
        };
      })
      .sort((a, b) => a.apelido.localeCompare(b.apelido, "pt-BR"));

    setLinhas(novas);
    setOriginal(Object.fromEntries(novas.map((l) => [l.playerId, chave(l)])));
    setOcorrencias(
      (ocs ?? []).map((o) => ({
        id: o.id,
        playerId: o.player_id,
        descricao: o.descricao,
        suspensoAte: o.suspenso_ate,
        anulada: o.anulada,
        justificativa: o.justificativa_anulacao,
      })),
    );
    setAuditoria(
      (aud ?? []).map((a) => ({
        id: a.id,
        acao: a.acao,
        entidade: a.entidade,
        playerId: a.player_id,
        antes: (a.antes as Record<string, unknown> | null) ?? null,
        depois: (a.depois as Record<string, unknown> | null) ?? null,
        justificativa: a.justificativa,
        feitoPor: a.feito_por,
        feitoEm: a.feito_em,
      })),
    );
    setCarregandoPelada(false);
  }, []);

  const carregarLista = useCallback(async () => {
    const [{ data }, { data: perfis }] = await Promise.all([
      supabase
        .from("peladas")
        .select("id, data, local, resultado, publicado_em")
        .order("data", { ascending: false })
        .limit(30),
      supabase.from("profiles").select("id, nome"),
    ]);
    setNomes(new Map((perfis ?? []).map((p) => [p.id, p.nome || "Admin"])));
    const lista = data ?? [];
    setPeladas(lista);
    return lista;
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const lista = await carregarLista();
      if (!ativo) return;
      const rascunhos = lista.filter((p) => p.resultado === "rascunho");
      const hoje = hojeLocalISO();
      // Prioridade: a pelada em rascunho mais recente que já aconteceu.
      const jaJogadas = rascunhos.filter((p) => p.data <= hoje);
      const alvo =
        jaJogadas[0] ?? escolherPeladaAtual([...rascunhos].reverse(), hoje) ?? lista[0] ?? null;
      setPeladaId(alvo?.id ?? null);
      if (alvo) await carregarPelada(alvo.id);
      if (ativo) setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [carregarLista, carregarPelada]);

  const trocarPelada = async (id: string) => {
    if (id === peladaId) return;
    if (sujo && !window.confirm("Há números não salvos. Trocar de pelada mesmo assim?")) return;
    setPeladaId(id);
    await carregarPelada(id);
  };

  const mudar = (playerId: string, campo: Campo, valor: number) => {
    setLinhas((prev) =>
      prev.map((l) => (l.playerId === playerId ? { ...l, [campo]: Math.max(0, valor) } : l)),
    );
  };

  const lesoesAtivas = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of ocorrencias) if (!o.anulada) m.set(o.playerId, (m.get(o.playerId) ?? 0) + 1);
    return m;
  }, [ocorrencias]);

  const totais = useMemo(
    () =>
      linhas.reduce(
        (acc, l) => ({
          gols: acc.gols + l.gols,
          assistencias: acc.assistencias + l.assistencias,
          carrinhos: acc.carrinhos + l.carrinhos,
        }),
        { gols: 0, assistencias: 0, carrinhos: 0 },
      ),
    [linhas],
  );

  const salvar = async (justificativa?: string): Promise<boolean> => {
    if (!pelada) return false;
    const payload = (publicado ? alteradas : linhas).map((l) => ({
      player_id: l.playerId,
      gols: l.gols,
      assistencias: l.assistencias,
      carrinhos: l.carrinhos,
    }));
    if (payload.length === 0) return true;
    const { error } = await supabase.rpc("salvar_sumula", {
      p_pelada_id: pelada.id,
      p_linhas: payload,
      ...(justificativa ? { p_justificativa: justificativa } : {}),
    });
    if (error) {
      toast.error(mensagemErro(error));
      return false;
    }
    return true;
  };

  const salvarRascunho = async () => {
    if (salvando || !pelada) return;
    setSalvando(true);
    if (await salvar()) {
      toast.success("Rascunho salvo. Ainda não aparece no ranking.");
      await carregarPelada(pelada.id);
    }
    setSalvando(false);
  };

  const publicar = async () => {
    if (salvando || !pelada) return;
    setSalvando(true);
    setConfirmarPublicar(false);
    if (await salvar()) {
      const { error } = await supabase.rpc("publicar_resultado", { p_pelada_id: pelada.id });
      if (error) toast.error(mensagemErro(error));
      else {
        toast.success("Resultado publicado. Ranking atualizado.");
        await carregarLista();
        await carregarPelada(pelada.id);
      }
    }
    setSalvando(false);
  };

  const salvarCorrecao = async () => {
    const texto = motivo.trim();
    if (salvando || !pelada || !texto) return;
    setSalvando(true);
    if (await salvar(texto)) {
      toast.success("Correção salva e registrada.");
      setPedirMotivo(false);
      setMotivo("");
      await carregarPelada(pelada.id);
    }
    setSalvando(false);
  };

  const registrarLesao = async () => {
    if (!pelada || !lesaoAlvo || salvando) return;
    if (sujo) {
      toast.error("Salve os números antes de registrar a lesão.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.rpc("registrar_carrinho_lesao", {
      p_pelada_id: pelada.id,
      p_player_id: lesaoAlvo.playerId,
      ...(lesaoDescricao.trim() ? { p_descricao: lesaoDescricao.trim() } : {}),
    });
    if (error) toast.error(mensagemErro(error));
    else {
      toast.success(`Suspensão de ${lesaoAlvo.apelido} registrada.`);
      setLesaoAlvo(null);
      setLesaoDescricao("");
      await carregarPelada(pelada.id);
    }
    setSalvando(false);
  };

  const anular = async () => {
    const texto = anularMotivo.trim();
    if (!pelada || !anularAlvo || !texto || salvando) return;
    if (sujo) {
      toast.error("Salve os números antes de anular a ocorrência.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.rpc("anular_ocorrencia", {
      p_ocorrencia_id: anularAlvo.id,
      p_justificativa: texto,
      p_remover_carrinho: anularRemoveCarrinho,
    });
    if (error) toast.error(mensagemErro(error));
    else {
      toast.success("Ocorrência anulada.");
      setAnularAlvo(null);
      setAnularMotivo("");
      setAnularRemoveCarrinho(true);
      await carregarPelada(pelada.id);
    }
    setSalvando(false);
  };

  const apelidoDe = (playerId: string | null) =>
    linhas.find((l) => l.playerId === playerId)?.apelido ?? "Jogador";

  if (loading) {
    return (
      <>
        <TopBar />
        <Skeleton className="mt-2 h-8 w-2/3" />
        <Skeleton className="mt-5 h-[52px] w-full rounded-xl" />
        <Skeleton className="mt-5 h-[420px] w-full rounded-2xl" />
      </>
    );
  }

  if (!pelada) {
    return (
      <>
        <TopBar />
        <section className="mt-2 rounded-2xl border border-border bg-surface p-5">
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground">
            Nenhuma pelada cadastrada
          </h1>
          <Link to="/admin/pelada" className={`${BTN_PRIMARY} mt-5 w-full`}>
            Marcar pelada
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <TopBar />

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground md:text-3xl">
          Súmula
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lance os números de cada jogador. Só entra no ranking depois de publicar.
        </p>
      </header>

      <div className="mt-4">
        <label htmlFor="pelada-sumula" className="sr-only">
          Pelada
        </label>
        <select
          id="pelada-sumula"
          value={pelada.id}
          onChange={(e) => void trocarPelada(e.target.value)}
          className={INPUT}
        >
          {peladas.map((p) => (
            <option key={p.id} value={p.id}>
              {formatDataCurta(p.data)} · {p.local} ·{" "}
              {p.resultado === "publicado" ? "publicado" : "rascunho"}
            </option>
          ))}
        </select>
      </div>

      <section
        className={cn(
          "mt-4 rounded-2xl border p-4",
          publicado ? "border-success/40 bg-surface" : "border-primary/40 bg-surface",
        )}
      >
        <p className="font-display text-base font-semibold text-foreground">
          {formatDataPorExtenso(pelada.data)} · {pelada.local}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {publicado
            ? `Publicado${pelada.publicado_em ? " em " + formatDataHora(pelada.publicado_em) : ""}. Toda correção pede um motivo e fica registrada.`
            : "Rascunho: os jogadores ainda não veem estes números."}
        </p>
      </section>

      <section
        aria-label="Regra de pontuação"
        className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface p-3 text-center"
      >
        <div>
          <p className="num text-xl text-success">+{PONTOS.gol}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">por gol</p>
        </div>
        <div>
          <p className="num text-xl text-success">+{PONTOS.assistencia}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            por assistência
          </p>
        </div>
        <div>
          <p className="num text-xl text-destructive">{formatPontos(PONTOS.carrinho)}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">por carrinho</p>
        </div>
      </section>

      {carregandoPelada ? (
        <Skeleton className="mt-5 h-[420px] w-full rounded-2xl" />
      ) : linhas.length === 0 ? (
        <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted-foreground">
            Ninguém escalado nesta pelada. Monte a escalação antes de lançar a súmula.
          </p>
          <Link to="/pelada" className={`${BTN_PRIMARY} mt-4 w-full`}>
            Montar escalação
          </Link>
        </section>
      ) : (
        <>
          <ul className="mt-5 grid gap-3 lg:grid-cols-2">
            {linhas.map((l) => {
              const lesoes = lesoesAtivas.get(l.playerId) ?? 0;
              const pontos = previaPontos(l);
              const mudou = original[l.playerId] !== chave(l);
              return (
                <li
                  key={l.playerId}
                  className={cn(
                    "rounded-2xl border bg-surface p-4",
                    mudou ? "border-primary/60" : "border-border",
                  )}
                >
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                    {l.fotoUrl ? (
                      <img
                        src={l.fotoUrl}
                        alt={l.apelido}
                        width={36}
                        height={36}
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <InitialsAvatar apelido={l.apelido} size={36} />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{l.apelido}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.convidado ? "Convidado" : "Jogador"}
                        {lesoes > 0 && (
                          <span className="ml-2 text-destructive">
                            {lesoes === 1 ? "1 lesão registrada" : `${lesoes} lesões registradas`}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "num text-2xl",
                          pontos < 0 ? "text-destructive" : "text-foreground",
                        )}
                      >
                        {formatPontos(pontos)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        prévia
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    {CAMPOS.map(({ campo, rotulo }) => (
                      <Stepper
                        key={campo}
                        rotulo={rotulo}
                        apelido={l.apelido}
                        valor={l[campo]}
                        minimo={campo === "carrinhos" ? lesoes : 0}
                        desabilitado={salvando}
                        onChange={(v) => mudar(l.playerId, campo, v)}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setLesaoAlvo(l)}
                    disabled={salvando}
                    className={cn(
                      "mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50",
                      FOCUS_RING,
                    )}
                  >
                    <ShieldAlert size={14} />
                    Carrinho que causou lesão
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 text-xs text-muted-foreground">
            Totais: {totais.gols} gols, {totais.assistencias} assistências, {totais.carrinhos}{" "}
            carrinhos.
            {totais.assistencias > totais.gols && (
              <span className="ml-1 inline-flex items-center gap-1 text-warning">
                <AlertTriangle size={12} />
                Tem mais assistência do que gol. Confira.
              </span>
            )}
          </p>

          {ocorrencias.length > 0 && (
            <section className="mt-5 rounded-2xl border border-destructive/40 bg-surface p-5">
              <p className={SECTION_LABEL}>Ocorrências disciplinares</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Visível só para admins. O jogador vê apenas o motivo e o prazo da própria suspensão.
              </p>
              <ul className="mt-3 grid gap-3">
                {ocorrencias.map((o) => (
                  <li key={o.id} className="rounded-xl border border-border bg-surface-2 p-4">
                    <p className="text-sm font-medium text-foreground">
                      {apelidoDe(o.playerId)}
                      {o.anulada && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (anulada)
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.descricao ?? "Carrinho que causou lesão"}
                    </p>
                    {o.anulada ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Motivo da anulação: {o.justificativa}
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 text-xs text-destructive">
                          Suspenso até {formatDataCurta(somarDias(o.suspensoAte, -1))}
                        </p>
                        <button
                          type="button"
                          onClick={() => setAnularAlvo(o)}
                          className={cn(
                            "mt-3 flex min-h-[44px] items-center justify-center rounded-lg border border-border px-4 text-xs font-medium text-foreground",
                            FOCUS_RING,
                          )}
                        >
                          Anular (registrado por engano)
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 mt-5 rounded-2xl border border-border bg-background/95 p-3 backdrop-blur">
            {publicado ? (
              <button
                type="button"
                disabled={!sujo || salvando}
                onClick={() => setPedirMotivo(true)}
                className={`${BTN_PRIMARY} w-full`}
              >
                {sujo ? `Salvar correção (${alteradas.length})` : "Sem alterações"}
              </button>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!sujo || salvando}
                  onClick={() => void salvarRascunho()}
                  className={`${BTN_SECONDARY} w-full`}
                >
                  {salvando ? "Salvando..." : "Salvar rascunho"}
                </button>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => setConfirmarPublicar(true)}
                  className={`${BTN_PRIMARY} w-full`}
                >
                  Publicar resultado
                </button>
              </div>
            )}
          </div>

          {auditoria.length > 0 && (
            <details className="mt-5 rounded-2xl border border-border bg-surface p-5">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                <History size={16} className="text-primary" />
                Histórico de alterações ({auditoria.length})
              </summary>
              <ul className="mt-3 grid gap-2">
                {auditoria.map((a) => {
                  const nome = a.feitoPor ? (nomes.get(a.feitoPor) ?? "Admin") : "Sistema";
                  const detalhe =
                    a.entidade === "pelada_stats" && (a.antes || a.depois)
                      ? CAMPOS.map(({ campo, curto }) => {
                          const antes = a.antes?.[campo];
                          const depois = a.depois?.[campo];
                          if (antes === depois) return null;
                          return `${curto} ${antes ?? 0}→${depois ?? 0}`;
                        })
                          .filter(Boolean)
                          .join(", ")
                      : "";
                  return (
                    <li key={a.id} className="border-b border-border pb-2 text-xs last:border-b-0">
                      <p className="text-foreground">
                        <span className="font-medium">{nome}</span> {ACAO_LABEL[a.acao] ?? a.acao}
                        {a.playerId && a.entidade !== "resultado"
                          ? ` · ${apelidoDe(a.playerId)}`
                          : ""}
                        {detalhe ? ` (${detalhe})` : ""}
                      </p>
                      <p className="text-muted-foreground">
                        {formatDataHora(a.feitoEm)}
                        {a.justificativa ? ` · ${a.justificativa}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </>
      )}

      <Dialog open={confirmarPublicar} onOpenChange={setConfirmarPublicar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar o resultado?</DialogTitle>
            <DialogDescription>
              Os números entram no ranking e no painel dos jogadores, a pelada vai para o histórico
              e a votação do MVP abre. Depois disso, cada correção pede um motivo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              type="button"
              className={BTN_SECONDARY}
              onClick={() => setConfirmarPublicar(false)}
            >
              Voltar
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={salvando}
              onClick={() => void publicar()}
            >
              Publicar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pedirMotivo} onOpenChange={setPedirMotivo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da correção</DialogTitle>
            <DialogDescription>
              Fica registrado com seu nome, a data e os valores antigos e novos.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="motivo-correcao" className="sr-only">
            Motivo
          </label>
          <textarea
            id="motivo-correcao"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={280}
            placeholder="Ex.: gol do Pv lançado para o Vk por engano"
            className={TEXTAREA}
          />
          <DialogFooter className="gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setPedirMotivo(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={!motivo.trim() || salvando}
              onClick={() => void salvarCorrecao()}
            >
              Salvar correção
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={lesaoAlvo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setLesaoAlvo(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carrinho que causou lesão</DialogTitle>
            <DialogDescription>
              {lesaoAlvo?.apelido} fica suspenso por {SUSPENSAO_MESES} meses a partir de{" "}
              {formatDataCurta(pelada.data)}, até{" "}
              {formatDataCurta(
                somarDias(
                  new Date(
                    Date.UTC(
                      Number(pelada.data.slice(0, 4)),
                      Number(pelada.data.slice(5, 7)) - 1 + SUSPENSAO_MESES,
                      Number(pelada.data.slice(8, 10)),
                    ),
                  )
                    .toISOString()
                    .slice(0, 10),
                  -1,
                ),
              )}
              . O carrinho também conta na súmula ({formatPontos(PONTOS.carrinho)}). Confirme só se
              tiver certeza.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="descricao-lesao" className="text-sm text-foreground">
            O que aconteceu (o jogador vê este texto)
          </label>
          <textarea
            id="descricao-lesao"
            value={lesaoDescricao}
            onChange={(e) => setLesaoDescricao(e.target.value)}
            maxLength={280}
            className={TEXTAREA}
          />
          <DialogFooter className="gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setLesaoAlvo(null)}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={() => void registrarLesao()}
              className={cn(
                "flex h-[52px] items-center justify-center rounded-xl bg-destructive px-4 text-sm font-semibold text-destructive-foreground disabled:opacity-50",
                FOCUS_RING,
              )}
            >
              Confirmar suspensão
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={anularAlvo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setAnularAlvo(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular ocorrência</DialogTitle>
            <DialogDescription>
              A suspensão de {anularAlvo ? apelidoDe(anularAlvo.playerId) : ""} é cancelada. O
              motivo fica registrado.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="motivo-anulacao" className="sr-only">
            Motivo da anulação
          </label>
          <textarea
            id="motivo-anulacao"
            value={anularMotivo}
            onChange={(e) => setAnularMotivo(e.target.value)}
            maxLength={280}
            placeholder="Por que está sendo anulada?"
            className={TEXTAREA}
          />
          <label className="flex min-h-[44px] items-center gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={anularRemoveCarrinho}
              onChange={(e) => setAnularRemoveCarrinho(e.target.checked)}
              className="h-5 w-5 accent-[hsl(var(--primary))]"
            />
            Tirar também 1 carrinho da súmula
          </label>
          <DialogFooter className="gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setAnularAlvo(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={!anularMotivo.trim() || salvando}
              onClick={() => void anular()}
            >
              Anular
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
