import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Posicao = Database["public"]["Enums"]["posicao"];
type Pe = Database["public"]["Enums"]["pe_dominante"];

const POSICOES: { value: Posicao; label: string }[] = [
  { value: "goleiro", label: "Goleiro" },
  { value: "defensor", label: "Defensor" },
  { value: "meio-campo", label: "Meio-campo" },
  { value: "atacante", label: "Atacante" },
];

const POSICAO_ABREV: Record<Posicao, string> = {
  goleiro: "GOL",
  defensor: "DEF",
  "meio-campo": "MEI",
  atacante: "ATA",
};

const PES: { value: Pe; label: string }[] = [
  { value: "direito", label: "Direito" },
  { value: "esquerdo", label: "Esquerdo" },
  { value: "ambidestro", label: "Ambidestro" },
];

const INPUT =
  "h-[52px] rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const SECTION_LABEL = "font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary";

function optionClass(selected: boolean) {
  return [
    "flex min-h-[52px] items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors",
    selected
      ? "border-primary bg-surface-2 text-foreground"
      : "border-border bg-transparent text-muted-foreground hover:border-primary/40",
  ].join(" ");
}

interface PlayerRow {
  id: string;
  nome: string;
  apelido: string;
  foto_url: string | null;
  posicao_principal: Posicao | null;
  ativo: boolean;
  profile_id: string | null;
}

interface ContaSemVinculo {
  id: string;
  nome: string;
  email: string | null;
  temPlayer: boolean;
}

export function AdminJogadoresScreen() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [contas, setContas] = useState<ContaSemVinculo[]>([]);
  const [vincularAlvo, setVincularAlvo] = useState<PlayerRow | null>(null);
  const [contaEscolhida, setContaEscolhida] = useState("");
  const [vinculando, setVinculando] = useState(false);

  const [nome, setNome] = useState("");
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const [pe, setPe] = useState<Pe>("direito");
  const [numero, setNumero] = useState("");

  const carregar = useCallback(async () => {
    const [{ data }, { data: perfis }] = await Promise.all([
      supabase
        .from("players")
        .select("id, nome, apelido, foto_url, posicao_principal, ativo, profile_id")
        .order("nome", { ascending: true }),
      supabase.from("profiles").select("id, nome, email").order("nome", { ascending: true }),
    ]);
    const lista = data ?? [];
    setPlayers(lista);
    const comPlayer = new Set(lista.map((p) => p.profile_id).filter(Boolean));
    setContas(
      (perfis ?? []).map((c) => ({
        id: c.id,
        nome: c.nome || c.email || "Sem nome",
        email: c.email,
        temPlayer: comPlayer.has(c.id),
      })),
    );
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

  const limpar = () => {
    setNome("");
    setPosicao(null);
    setPe("direito");
    setNumero("");
  };

  const valido = nome.trim() !== "";

  const vincular = async () => {
    if (!vincularAlvo || !contaEscolhida || vinculando) return;
    setVinculando(true);
    const { error } = await supabase.rpc("vincular_convidado", {
      p_convidado_id: vincularAlvo.id,
      p_profile_id: contaEscolhida,
    });
    setVinculando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${vincularAlvo.apelido} agora está ligado à conta. Nada foi somado em dobro.`);
    setVincularAlvo(null);
    setContaEscolhida("");
    await carregar();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido || saving) return;
    setSaving(true);

    const { error } = await supabase.from("players").insert({
      nome: nome.trim(),
      // O app mostra sempre o nome; o apelido virou espelho dele.
      apelido: nome.trim(),
      posicao_principal: posicao,
      pe_dominante: pe,
      numero_preferido: numero.trim() === "" ? null : Number(numero),
    });

    if (error) {
      toast.error("Não foi possível cadastrar o jogador. " + error.message);
      setSaving(false);
      return;
    }

    await carregar();
    limpar();
    setAberto(false);
    setSaving(false);
    toast.success("Jogador cadastrado.");
  };

  const alternarAtivo = async (p: PlayerRow) => {
    if (togglingId) return;
    setTogglingId(p.id);
    const { error } = await supabase.from("players").update({ ativo: !p.ativo }).eq("id", p.id);
    if (error) {
      toast.error("Não foi possível atualizar o jogador. " + error.message);
    } else {
      await carregar();
      toast.success(p.ativo ? `${p.apelido} ficou inativo.` : `${p.apelido} está ativo.`);
    }
    setTogglingId(null);
  };

  const ativos = players.filter((p) => p.ativo).length;

  return (
    <>
      <TopBar />

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground">
          Jogadores
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Você pode cadastrar quem joga mesmo sem a pessoa ter conta no app.
        </p>
        {!loading && (
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="num text-foreground">{players.length}</span> jogadores ·{" "}
            <span className="num text-foreground">{ativos}</span> ativos
          </p>
        )}
      </header>

      <div className="mt-5">
        {!aberto ? (
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 text-sm font-medium text-foreground"
          >
            <UserPlus size={18} />
            Cadastrar jogador
          </button>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="grid gap-5 rounded-2xl border border-border bg-surface p-5"
          >
            <p className={SECTION_LABEL}>Novo jogador</p>

            <div className="grid gap-2">
              <label htmlFor="j-nome" className="text-sm font-medium text-foreground">
                Nome
              </label>
              <input
                id="j-nome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={INPUT}
              />
            </div>

            <div className="grid gap-2">
              <span className="text-sm font-medium text-foreground">
                Posição principal (opcional)
              </span>
              <div className="grid grid-cols-2 gap-3">
                {POSICOES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={posicao === p.value}
                    onClick={() => setPosicao(p.value)}
                    className={optionClass(posicao === p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <span className="text-sm font-medium text-foreground">Pé dominante</span>
              <div className="grid grid-cols-3 gap-3">
                {PES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={pe === p.value}
                    onClick={() => setPe(p.value)}
                    className={optionClass(pe === p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="j-numero" className="text-sm font-medium text-foreground">
                Número preferido <span className="text-muted-foreground">(opcional)</span>
              </label>
              <input
                id="j-numero"
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className={INPUT}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  limpar();
                  setAberto(false);
                }}
                className="flex h-[52px] items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-medium text-foreground"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!valido || saving}
                className="flex h-[52px] items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar jogador"}
              </button>
            </div>
          </form>
        )}
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <p className={SECTION_LABEL}>Elenco</p>

        {loading ? (
          <div className="mt-3 grid gap-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : players.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum jogador cadastrado ainda.</p>
        ) : (
          <ul className="mt-3">
            {players.map((p) => (
              <li
                key={p.id}
                className={`grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border py-3 last:border-b-0 last:pb-0 ${
                  p.ativo ? "" : "opacity-50"
                }`}
              >
                {p.foto_url ? (
                  <img
                    src={p.foto_url}
                    alt={p.apelido}
                    width={36}
                    height={36}
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <InitialsAvatar apelido={p.apelido} size={36} />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">{p.apelido}</span>
                  <span className="block truncate text-xs text-muted-foreground">{p.nome}</span>
                  {p.profile_id === null && (
                    <button
                      type="button"
                      onClick={() => {
                        setVincularAlvo(p);
                        setContaEscolhida("");
                      }}
                      className="mt-1 text-xs font-medium text-azul underline-offset-2 hover:underline"
                    >
                      Convidado · vincular a uma conta
                    </button>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.posicao_principal ? POSICAO_ABREV[p.posicao_principal] : "—"}
                </span>
                <button
                  type="button"
                  onClick={() => void alternarAtivo(p)}
                  disabled={togglingId === p.id}
                  className={`flex min-h-[44px] min-w-[44px] items-center justify-center px-2 text-xs font-medium disabled:opacity-50 ${
                    p.ativo ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  {p.ativo ? "Ativo" : "Inativo"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={vincularAlvo !== null}
        onOpenChange={(abertoDialog) => {
          if (!abertoDialog) setVincularAlvo(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular {vincularAlvo?.apelido} a uma conta</DialogTitle>
            <DialogDescription>
              O histórico do convidado passa para a conta escolhida. Se a pessoa já tinha criado o
              perfil dela, os dois cadastros viram um só, sem somar nada em dobro. Se os dois
              aparecem na mesma pelada, o app recusa e avisa.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="conta-vinculo" className="text-sm font-medium text-foreground">
            Conta
          </label>
          <select
            id="conta-vinculo"
            value={contaEscolhida}
            onChange={(e) => setContaEscolhida(e.target.value)}
            className={INPUT}
          >
            <option value="">Escolha a conta</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
                {c.email ? ` (${c.email})` : ""}
                {c.temPlayer ? " · já tem perfil" : ""}
              </option>
            ))}
          </select>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setVincularAlvo(null)}
              className="flex h-[48px] items-center justify-center rounded-xl border border-border px-4 text-sm text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!contaEscolhida || vinculando}
              onClick={() => void vincular()}
              className="flex h-[48px] items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {vinculando ? "Vinculando..." : "Vincular"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
