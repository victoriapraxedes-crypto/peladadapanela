import { useCallback, useEffect, useState } from "react";
import { CalendarRange, Trophy } from "lucide-react";
import { toast } from "sonner";

import { TopBar } from "@/components/layout/TopBar";
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
import { SECTION_LABEL } from "@/features/desempenho/componentes";
import { buscarJogadores, buscarRanking, type Temporada } from "@/features/desempenho/dados";
import { supabase } from "@/integrations/supabase/client";
import { formatDataCurta, hojeLocalISO } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui";
import { cn } from "@/lib/utils";

const INPUT =
  "h-[52px] w-full rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary";
const BTN_PRIMARY = cn(
  "flex h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-4 font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground transition-colors hover:bg-primary-dim disabled:opacity-50",
  FOCUS_RING,
);
const BTN_SECONDARY = cn(
  "flex h-[52px] items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40 disabled:opacity-50",
  FOCUS_RING,
);

interface TemporadaInfo extends Temporada {
  peladas: number;
  rascunhos: number;
  lider: string | null;
}

export function AdminTemporadasScreen() {
  const [temporadas, setTemporadas] = useState<TemporadaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState(`Temporada ${new Date().getFullYear()}`);
  const [inicio, setInicio] = useState(hojeLocalISO());
  const [salvando, setSalvando] = useState(false);
  const [encerrarAlvo, setEncerrarAlvo] = useState<TemporadaInfo | null>(null);

  const carregar = useCallback(async () => {
    const [{ data: ts }, { data: peladas }, jogadores] = await Promise.all([
      supabase
        .from("seasons")
        .select("id, nome, ativa, inicio_em, fim_em")
        .order("inicio_em", { ascending: false }),
      supabase.from("peladas").select("season_id, resultado"),
      buscarJogadores(),
    ]);
    const lista = ts ?? [];
    const infos = await Promise.all(
      lista.map(async (t) => {
        const doT = (peladas ?? []).filter((p) => p.season_id === t.id);
        let lider: string | null = null;
        try {
          const r = await buscarRanking(t.id);
          const primeiros = r.filter((x) => x.posicao === 1);
          if (primeiros.length) {
            lider = `${primeiros
              .map((x) => jogadores.get(x.playerId)?.apelido ?? "?")
              .join(", ")} (${primeiros[0]!.pontos} pts)`;
          }
        } catch {
          lider = null;
        }
        return {
          ...t,
          peladas: doT.length,
          rascunhos: doT.filter((p) => p.resultado === "rascunho").length,
          lider,
        };
      }),
    );
    setTemporadas(infos);
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const ativa = temporadas.find((t) => t.ativa) ?? null;

  const abrir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando || !nome.trim()) return;
    setSalvando(true);
    const { error } = await supabase.rpc("abrir_temporada", {
      p_nome: nome.trim(),
      p_inicio: inicio,
    });
    setSalvando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Temporada aberta.");
    await carregar();
  };

  const encerrar = async () => {
    if (!encerrarAlvo || salvando) return;
    setSalvando(true);
    const { error } = await supabase.rpc("encerrar_temporada", {
      p_season_id: encerrarAlvo.id,
    });
    setSalvando(false);
    setEncerrarAlvo(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Temporada encerrada. A classificação dela fica guardada.");
    await carregar();
  };

  if (loading) {
    return (
      <>
        <TopBar />
        <Skeleton className="mt-2 h-8 w-2/3" />
        <Skeleton className="mt-5 h-[200px] w-full rounded-2xl" />
      </>
    );
  }

  return (
    <>
      <TopBar />
      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground md:text-3xl">
          Temporadas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Uma temporada ativa por vez. Ao encerrar, a classificação dela fica guardada e a próxima
          começa do zero; o histórico geral soma todas.
        </p>
      </header>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        {ativa ? (
          <section className="rounded-2xl border border-primary/60 bg-surface p-5">
            <p className={SECTION_LABEL}>Temporada ativa</p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">{ativa.nome}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Desde {formatDataCurta(ativa.inicio_em)} · {ativa.peladas}{" "}
              {ativa.peladas === 1 ? "pelada" : "peladas"}
            </p>
            {ativa.lider && (
              <p className="mt-3 flex items-center gap-2 text-sm text-foreground">
                <Trophy size={16} className="text-primary" /> Líder: {ativa.lider}
              </p>
            )}
            {ativa.rascunhos > 0 && (
              <p className="mt-3 text-xs text-warning">
                {ativa.rascunhos} {ativa.rascunhos === 1 ? "pelada está" : "peladas estão"} com
                súmula em rascunho. Publique antes de encerrar, senão ficam fora da classificação.
              </p>
            )}
            <button
              type="button"
              className={`${BTN_SECONDARY} mt-5 w-full`}
              onClick={() => setEncerrarAlvo(ativa)}
            >
              Encerrar temporada
            </button>
          </section>
        ) : (
          <form
            onSubmit={abrir}
            className="grid gap-4 rounded-2xl border border-border bg-surface p-5"
          >
            <p className={SECTION_LABEL}>Abrir nova temporada</p>
            <div className="grid gap-2">
              <label htmlFor="temp-nome" className="text-sm font-medium text-foreground">
                Nome
              </label>
              <input
                id="temp-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={40}
                className={INPUT}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="temp-inicio" className="text-sm font-medium text-foreground">
                Começa em
              </label>
              <input
                id="temp-inicio"
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className={INPUT}
              />
            </div>
            <button type="submit" disabled={salvando || !nome.trim()} className={BTN_PRIMARY}>
              Abrir temporada
            </button>
          </form>
        )}

        <section className="rounded-2xl border border-border bg-surface p-5">
          <p className={SECTION_LABEL}>Todas as temporadas</p>
          <ul className="mt-3">
            {temporadas.map((t) => (
              <li
                key={t.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-border py-3 last:border-b-0"
              >
                <CalendarRange
                  size={18}
                  className={cn("mt-0.5", t.ativa ? "text-primary" : "text-muted-foreground")}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {t.nome}
                    {t.ativa && <span className="ml-2 text-xs text-primary">ativa</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDataCurta(t.inicio_em)}
                    {t.fim_em ? ` até ${formatDataCurta(t.fim_em)}` : ""} · {t.peladas}{" "}
                    {t.peladas === 1 ? "pelada" : "peladas"}
                  </p>
                  {t.lider && (
                    <p className="mt-1 truncate text-xs text-foreground">
                      {t.ativa ? "Líder" : "Campeão"}: {t.lider}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <AlertDialog
        open={encerrarAlvo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setEncerrarAlvo(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar {encerrarAlvo?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              A classificação fica congelada. Depois disso, abra a próxima temporada para marcar
              novas peladas nela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={salvando} onClick={() => void encerrar()}>
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
