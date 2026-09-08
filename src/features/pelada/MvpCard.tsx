import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
import { useAuth } from "@/features/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { formatDataPorExtenso } from "@/lib/mock";

// Decisão de produto: a /pelada mostra sempre a PRÓXIMA pelada em aberto, então
// uma pelada finalizada nunca apareceria aqui e a votação de MVP ficaria
// inalcançável. Por isso este card NÃO é da pelada exibida na tela: ele é da
// pelada finalizada mais recente em que o usuário atual participou. Assim o
// convite para votar acompanha a pessoa até ela votar, mesmo que a próxima
// pelada já esteja marcada.

const SECTION_LABEL =
  "font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary";

interface Participante {
  id: string;
  apelido: string;
  fotoUrl: string | null;
}

interface Dados {
  peladaId: string;
  data: string;
  participantes: Participante[];
  totalVotos: number;
  meuVotoEm: string | null;
  vencedores: string[];
}

function Foto({ p, size }: { p: Participante | undefined; size: number }) {
  if (p?.fotoUrl) {
    return (
      <img
        src={p.fotoUrl}
        alt={p.apelido}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <InitialsAvatar apelido={p?.apelido ?? "??"} size={size} />;
}

export function MvpCard() {
  const { player } = useAuth();
  const playerId = player?.id ?? null;

  const [dados, setDados] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [alvo, setAlvo] = useState<Participante | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    if (!playerId) {
      setDados(null);
      setLoading(false);
      return;
    }

    // 1) pelada finalizada mais recente em que o usuário participou
    const { data: minhas } = await supabase
      .from("pelada_players")
      .select("pelada_id, peladas!inner(id, data, status)")
      .eq("player_id", playerId)
      .eq("peladas.status", "finalizada");

    const ordenadas = (minhas ?? [])
      .filter((r) => r.peladas)
      .sort((a, b) => (a.peladas!.data < b.peladas!.data ? 1 : -1));
    const alvoPelada = ordenadas[0]?.peladas;

    if (!alvoPelada) {
      setDados(null);
      setLoading(false);
      return;
    }

    // 2) participantes, 3) votos, 4) vencedores
    const [{ data: parts }, { data: votos }, { data: winners }] = await Promise.all([
      supabase
        .from("pelada_players")
        .select("player_id, players(id, apelido, foto_url)")
        .eq("pelada_id", alvoPelada.id),
      supabase
        .from("mvp_votes")
        .select("voter_player_id, voted_player_id")
        .eq("pelada_id", alvoPelada.id),
      supabase.from("mvp_winners").select("player_id, votos").eq("pelada_id", alvoPelada.id),
    ]);

    const participantes: Participante[] = (parts ?? [])
      .filter((r) => r.players)
      .map((r) => ({
        id: r.player_id,
        apelido: r.players!.apelido,
        fotoUrl: r.players!.foto_url,
      }))
      .sort((a, b) => a.apelido.localeCompare(b.apelido, "pt-BR"));

    const meu = (votos ?? []).find((v) => v.voter_player_id === playerId);

    setDados({
      peladaId: alvoPelada.id,
      data: alvoPelada.data,
      participantes,
      totalVotos: (votos ?? []).length,
      meuVotoEm: meu?.voted_player_id ?? null,
      vencedores: (winners ?? []).map((w) => w.player_id).filter((id): id is string => !!id),
    });
    setLoading(false);
  }, [playerId]);

  useEffect(() => {
    setLoading(true);
    void carregar();
  }, [carregar]);

  const votar = async () => {
    if (!alvo || !playerId || !dados || enviando) return;
    setEnviando(true);
    const { error } = await supabase.from("mvp_votes").insert({
      pelada_id: dados.peladaId,
      voter_player_id: playerId,
      voted_player_id: alvo.id,
    });
    if (error) {
      toast.error("Não foi possível registrar seu voto. " + error.message);
    } else {
      toast.success(`Voto em ${alvo.apelido} registrado.`);
      await carregar();
    }
    setEnviando(false);
    setAlvo(null);
  };

  if (loading) {
    return (
      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-3 w-40" />
        <Skeleton className="mt-4 h-[96px] w-full rounded-xl" />
      </section>
    );
  }

  if (!dados) return null;

  const total = dados.participantes.length;
  const fechada = total > 0 && dados.totalVotos >= total;
  const votadoPorMim = dados.participantes.find((p) => p.id === dados.meuVotoEm);
  const vencedores = dados.vencedores
    .map((id) => dados.participantes.find((p) => p.id === id))
    .filter((p): p is Participante => !!p);

  return (
    <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
      <p className={SECTION_LABEL}>MVP da galera</p>
      <p className="mt-1 text-xs text-muted-foreground">{formatDataPorExtenso(dados.data)}</p>

      {fechada ? (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <Foto p={vencedores[0]} size={56} />
            <span className="font-display text-lg font-bold text-foreground">
              {vencedores.length > 0
                ? vencedores.map((v) => v.apelido).join(" e ")
                : "Sem vencedor"}
            </span>
          </div>
          {votadoPorMim && (
            <p className="mt-3 text-xs text-muted-foreground">
              Você votou em {votadoPorMim.apelido}
            </p>
          )}
        </div>
      ) : dados.meuVotoEm ? (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <Foto p={votadoPorMim} size={56} />
            <span className="text-sm text-foreground">
              Você votou em {votadoPorMim?.apelido ?? "—"}
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Votação em andamento · <span className="num">{dados.totalVotos}</span> de{" "}
            <span className="num">{total}</span> já votaram
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">Quem foi o melhor em campo?</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {dados.participantes
              .filter((p) => p.id !== playerId)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setAlvo(p)}
                  className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 p-3 text-center hover:border-primary/40"
                >
                  <Foto p={p} size={56} />
                  <span className="w-full truncate text-sm text-foreground">{p.apelido}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      <AlertDialog open={!!alvo} onOpenChange={(o) => !o && setAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar voto em {alvo?.apelido}?</AlertDialogTitle>
            <AlertDialogDescription>O voto não pode ser trocado depois.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={enviando}
              onClick={(e) => {
                e.preventDefault();
                void votar();
              }}
            >
              Confirmar voto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
