import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCog, ChevronRight, Play, Users, Shuffle } from "lucide-react";

import { TopBar } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/features/pelada/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatDataPorExtenso } from "@/lib/mock";

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
];

export function AdminPanel() {
  const [pelada, setPelada] = useState<PeladaAtual | null>(null);
  const [confirmados, setConfirmados] = useState(0);
  const [loading, setLoading] = useState(true);
  const hojeISO = new Date().toISOString().slice(0, 10);

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
        setConfirmados(0);
        setLoading(false);
        return;
      }
      setPelada(data);
      const { count } = await supabase
        .from("pelada_players")
        .select("player_id", { count: "exact", head: true })
        .eq("pelada_id", data.id);
      if (!ativo) return;
      setConfirmados(count ?? 0);
      setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [hojeISO]);

  return (
    <>
      <TopBar />

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground">Painel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Você está como administrador.</p>
      </header>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary">
          Próxima pelada
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

      <nav className="mt-5 grid gap-3">
        {ACOES.map((acao) => (
          <Link
            key={acao.titulo}
            to={acao.to}
            className="grid min-h-[64px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3"
          >
            <acao.icon size={20} className="text-primary" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{acao.titulo}</span>
              <span className="block truncate text-xs text-muted-foreground">{acao.descricao}</span>
            </span>
            <ChevronRight size={18} className="text-muted-foreground" />
          </Link>
        ))}
      </nav>
    </>
  );
}
