import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCog, ChevronRight, Play, Users, Shuffle, UserCheck } from "lucide-react";
import { toast } from "sonner";

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
import { TopBar } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/features/pelada/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatDataPorExtenso } from "@/lib/format";

type PeladaStatus = Database["public"]["Enums"]["pelada_status"];

interface PeladaAtual {
  id: string;
  data: string;
  horario: string;
  local: string;
  status: PeladaStatus;
}

const ACOES = [
  {
    to: "/admin/pelada" as const,
    icon: CalendarCog,
    titulo: "Editar pelada",
    descricao: "Data, horário, local e status.",
  },
  {
    to: "/admin/jogadores" as const,
    icon: Users,
    titulo: "Gerenciar jogadores",
    descricao: "Cadastrar, ativar e desativar.",
  },
  {
    to: "/admin/times" as const,
    icon: Shuffle,
    titulo: "Montar times",
    descricao: "Distribuir os confirmados.",
  },
  {
    to: "/admin/times" as const,
    icon: Play,
    titulo: "Iniciar partida",
    descricao: "Escolher os times e começar.",
  },
  {
    to: "/admin/acessos" as const,
    icon: UserCheck,
    titulo: "Solicitações de acesso",
    descricao: "Aprovar quem pediu para entrar.",
  },
];

export function AdminPanel() {
  const [pelada, setPelada] = useState<PeladaAtual | null>(null);
  const [emAberto, setEmAberto] = useState<PeladaAtual[]>([]);
  const [confirmados, setConfirmados] = useState(0);
  const [loading, setLoading] = useState(true);
  const [alvoEncerrar, setAlvoEncerrar] = useState<PeladaAtual | null>(null);
  const [encerrando, setEncerrando] = useState(false);
  const [versao, setVersao] = useState(0);
  const [pendentes, setPendentes] = useState(0);
  const hojeISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("acesso", "pendente");
      if (ativo) setPendentes(count ?? 0);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      // Todas as peladas ainda não finalizadas, inclusive as de datas passadas:
      // nenhuma pelada pode sumir só porque o admin não encerrou o fluxo.
      const { data } = await supabase
        .from("peladas")
        .select("id, data, horario, local, status")
        .neq("status", "finalizada")
        .order("data", { ascending: true });

      if (!ativo) return;
      const lista = data ?? [];
      setEmAberto([...lista].sort((a, b) => b.data.localeCompare(a.data)));

      const atual = lista.find((p) => p.data >= hojeISO) ?? [...lista].reverse()[0] ?? null;
      if (!atual) {
        setPelada(null);
        setConfirmados(0);
        setLoading(false);
        return;
      }
      setPelada(atual);
      const { count } = await supabase
        .from("pelada_players")
        .select("player_id", { count: "exact", head: true })
        .eq("pelada_id", atual.id);
      if (!ativo) return;
      setConfirmados(count ?? 0);
      setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [hojeISO, versao]);


  const encerrarPelada = useCallback(async () => {
    if (!alvoEncerrar || encerrando) return;
    setEncerrando(true);
    const { error } = await supabase
      .from("peladas")
      .update({ status: "finalizada" })
      .eq("id", alvoEncerrar.id);
    setEncerrando(false);
    setAlvoEncerrar(null);
    if (error) {
      toast.error("Não foi possível encerrar a pelada. " + error.message);
      return;
    }
    toast.success("Pelada encerrada.");
    setVersao((v) => v + 1);
  }, [alvoEncerrar, encerrando]);

  return (
    <>
      <TopBar />

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground">
          Painel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Você está como administrador.</p>
      </header>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary">
          {pelada && pelada.data < hojeISO ? "Pelada em aberto" : "Próxima pelada"}
        </p>


        {loading ? (
          <>
            <Skeleton className="mt-3 h-7 w-3/4" />
            <Skeleton className="mt-3 h-4 w-1/2" />
            <Skeleton className="mt-5 h-10 w-40" />
          </>
        ) : pelada ? (
          <>
            <h2 className="mt-2 font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground">
              {formatDataPorExtenso(pelada.data)}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {pelada.horario} · {pelada.local}
            </p>
            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <span className="num text-4xl text-foreground">{confirmados}</span>
              <span className="text-sm text-muted-foreground">confirmados</span>
              <StatusBadge status={pelada.status} />
            </div>
            <div className="mt-5 grid gap-3">
              <Link
                to="/pelada"
                className="flex h-[52px] w-full items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim"
              >
                Retomar pelada
              </Link>
              <Link
                to="/historico/$peladaId"
                params={{ peladaId: pelada.id }}
                className="flex h-[52px] w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground"
              >
                Ver súmula
              </Link>
              <button
                type="button"
                onClick={() => setAlvoEncerrar(pelada)}
                className="flex h-[52px] w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground"
              >
                Encerrar pelada
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-2 font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground">
              Nenhuma pelada marcada
            </h2>
            <Link
              to="/admin/pelada"
              className="mt-5 flex h-[52px] w-full items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim"
            >
              Criar pelada
            </Link>
          </>
        )}
      </section>

      {emAberto.length > 1 && (
        <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            Peladas em aberto
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Nenhuma pelada some do app: ela fica aqui até você encerrar.
          </p>
          <ul className="mt-3 grid gap-3">
            {emAberto.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-surface-2 p-4">
                <p className="truncate text-sm font-medium text-foreground">
                  {formatDataPorExtenso(p.data)}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {p.horario} · {p.local}
                </p>
                <div className="mt-2">
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    to="/historico/$peladaId"
                    params={{ peladaId: p.id }}
                    className="flex h-[44px] items-center justify-center rounded-lg border border-border text-xs font-medium text-foreground"
                  >
                    Ver súmula
                  </Link>
                  <button
                    type="button"
                    onClick={() => setAlvoEncerrar(p)}
                    className="flex h-[44px] items-center justify-center rounded-lg border border-border text-xs font-medium text-foreground"
                  >
                    Encerrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}



      <nav className="mt-5 grid gap-3">
        {ACOES.map((acao) => (
          <Link
            key={acao.titulo}
            to={acao.to}
            className="grid min-h-[64px] grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3"
          >
            <acao.icon size={20} className="text-primary" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {acao.titulo}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{acao.descricao}</span>
            </span>
            {acao.to === "/admin/acessos" && pendentes > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {pendentes}
              </span>
            ) : (
              <span />
            )}
            <ChevronRight size={18} className="text-muted-foreground" />
          </Link>
        ))}
      </nav>

      <AlertDialog
        open={alvoEncerrar !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setAlvoEncerrar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar a pelada?</AlertDialogTitle>
            <AlertDialogDescription>
              A pelada vai para o histórico. As partidas já encerradas continuam registradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={encerrando} onClick={() => void encerrarPelada()}>
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
