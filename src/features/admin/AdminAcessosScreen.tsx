import { useCallback, useEffect, useRef, useState } from "react";
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
import { InitialsAvatar } from "@/components/layout/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/ui";
import type { Database } from "@/integrations/supabase/types";

type Acesso = Database["public"]["Enums"]["acesso_status"];

interface Solicitacao {
  id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
  criado_em: string;
  role: Papel;
}

type Papel = Database["public"]["Enums"]["user_role"];

const FILTROS: { valor: Acesso; rotulo: string }[] = [
  { valor: "pendente", rotulo: "Pendentes" },
  { valor: "aprovado", rotulo: "Aprovados" },
  { valor: "recusado", rotulo: "Recusados" },
];

function formatarData(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `Cadastro em ${dd}/${mm}/${d.getFullYear()}`;
}

export function AdminAcessosScreen() {
  const { profile } = useAuth();
  const [lista, setLista] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Acesso>("pendente");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [recusarAlvo, setRecusarAlvo] = useState<Solicitacao | null>(null);

  const montadoRef = useRef(true);
  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, email, avatar_url, criado_em, role")
      .eq("acesso", filtro)
      .order("criado_em", { ascending: true });
    if (!montadoRef.current) return;
    if (error) toast.error("Não foi possível carregar as solicitações. " + error.message);
    setLista((data as Solicitacao[]) ?? []);
    setLoading(false);
  }, [filtro]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const alterar = useCallback(
    async (alvo: Solicitacao, novo: Acesso) => {
      if (salvandoId) return;
      setSalvandoId(alvo.id);
      const { data, error } = await supabase
        .from("profiles")
        .update({ acesso: novo })
        .eq("id", alvo.id)
        .select("id");
      setSalvandoId(null);
      setRecusarAlvo(null);
      if (error) {
        toast.error("Não foi possível atualizar o acesso. " + error.message);
        return;
      }
      // Um update barrado pela RLS não gera erro: apenas não afeta nenhuma linha.
      if (!data || data.length === 0) {
        toast.error("A alteração não foi aplicada.");
        return;
      }
      toast.success(novo === "aprovado" ? "Acesso aprovado." : "Acesso recusado.");
      await carregar();
    },
    [salvandoId, carregar],
  );

  const alterarPapel = useCallback(
    async (alvo: Solicitacao, novo: Papel) => {
      if (salvandoId) return;
      setSalvandoId(alvo.id);
      const { data, error } = await supabase
        .from("profiles")
        .update({ role: novo })
        .eq("id", alvo.id)
        .select("id");
      setSalvandoId(null);
      if (error) {
        toast.error("Não foi possível mudar o papel. " + error.message);
        return;
      }
      if (!data || data.length === 0) {
        toast.error("A alteração não foi aplicada.");
        return;
      }
      toast.success(
        novo === "admin"
          ? `${alvo.nome || alvo.email} agora é admin.`
          : `${alvo.nome || alvo.email} voltou a ser jogador.`,
      );
      await carregar();
    },
    [salvandoId, carregar],
  );

  return (
    <>
      <TopBar />

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground">
          Solicitações de acesso
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quem entra pelo link fica aqui até você liberar. Em Aprovados você também escolhe quem é
          admin.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setFiltro(f.valor)}
            aria-pressed={filtro === f.valor}
            className={cn(
              "min-h-[44px] rounded-xl border px-4 text-sm font-medium transition-colors",
              filtro === f.valor
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-foreground hover:border-primary/40",
              FOCUS_RING,
            )}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      <section className="mt-5 grid gap-3">
        {loading ? (
          <>
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {filtro === "pendente"
              ? "Nenhuma solicitação pendente."
              : filtro === "aprovado"
                ? "Ninguém aprovado ainda."
                : "Ninguém recusado."}
          </p>
        ) : (
          lista.map((p) => (
            <article key={p.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <InitialsAvatar apelido={p.nome ?? "?"} size={48} />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {p.nome || "Sem nome"}
                    {p.role === "admin" && (
                      <span className="ml-2 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        admin
                      </span>
                    )}
                  </p>
                  <p className="break-all text-xs text-muted-foreground">{p.email}</p>
                  <p className="text-xs text-muted-foreground">{formatarData(p.criado_em)}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {filtro === "aprovado" ? (
                  p.id === profile?.id ? (
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Você não pode mudar o seu próprio papel. Peça a outro admin.
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={salvandoId !== null}
                      onClick={() => void alterarPapel(p, p.role === "admin" ? "jogador" : "admin")}
                      className={cn(
                        "flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 sm:col-span-2",
                        p.role === "admin"
                          ? "border border-border bg-transparent text-foreground hover:border-primary/40"
                          : "bg-primary font-display uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim",
                        FOCUS_RING,
                      )}
                    >
                      {salvandoId === p.id
                        ? "Salvando..."
                        : p.role === "admin"
                          ? "Tirar admin"
                          : "Tornar admin"}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={salvandoId !== null}
                    onClick={() => void alterar(p, "aprovado")}
                    className={cn(
                      "flex h-12 items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground transition-colors hover:bg-primary-dim disabled:opacity-50",
                      FOCUS_RING,
                    )}
                  >
                    {salvandoId === p.id ? "Aprovando..." : "Aprovar"}
                  </button>
                )}
                {filtro === "pendente" && (
                  <button
                    type="button"
                    disabled={salvandoId !== null}
                    onClick={() => setRecusarAlvo(p)}
                    className={cn(
                      "flex h-12 items-center justify-center rounded-xl border border-destructive/40 bg-transparent text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50",
                      FOCUS_RING,
                    )}
                  >
                    Recusar
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <AlertDialog open={recusarAlvo !== null} onOpenChange={(o) => !o && setRecusarAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Recusar o acesso de {recusarAlvo?.nome || recusarAlvo?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A pessoa vai ver um aviso de que o acesso não foi liberado. Você pode aprovar depois
              se mudar de ideia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={salvandoId !== null}
              onClick={(event) => {
                event.preventDefault();
                if (recusarAlvo) void alterar(recusarAlvo, "recusado");
              }}
            >
              {salvandoId !== null ? "Recusando..." : "Recusar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
