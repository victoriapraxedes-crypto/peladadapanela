import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Logo } from "@/components/brand/Logo";
import { AuthLoading } from "@/features/auth/RequireAuth";
import { useAuth } from "@/features/auth/AuthProvider";
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

const PES: { value: Pe; label: string }[] = [
  { value: "direito", label: "Direito" },
  { value: "esquerdo", label: "Esquerdo" },
  { value: "ambidestro", label: "Ambidestro" },
];

function optionClass(selected: boolean) {
  return [
    "flex min-h-[52px] items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors",
    selected
      ? "border-primary bg-surface-2 text-foreground"
      : "border-border bg-transparent text-muted-foreground hover:border-primary/40",
  ].join(" ");
}

export function OnboardingScreen() {
  const { session, user, profile, player, loading, reloadPlayer } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const [pe, setPe] = useState<Pe>("direito");
  const [numero, setNumero] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (player) navigate({ to: "/" });
  }, [loading, session, player, navigate]);

  useEffect(() => {
    if (profile?.nome) setNome((v) => (v ? v : profile.nome));
  }, [profile?.nome]);

  if (loading || !session || player) return <AuthLoading />;

  const valido = nome.trim().length > 0 && posicao !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido || !user || saving) return;
    setSaving(true);
    setErro(null);

    const numeroPreferido = numero.trim() === "" ? null : Number(numero);
    const { error } = await supabase.from("players").insert({
      profile_id: user.id,
      nome: nome.trim(),
      // O app mostra sempre o nome; o apelido virou espelho dele.
      apelido: nome.trim(),
      posicao_principal: posicao,
      pe_dominante: pe,
      numero_preferido: numeroPreferido,
    });

    if (error) {
      setErro(error.message);
      setSaving(false);
      return;
    }

    await reloadPlayer();
    navigate({ to: "/" });
  };

  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <Logo size={56} />
        <h1 className="mt-6 font-display text-3xl font-bold uppercase leading-tight tracking-[-0.02em] text-foreground">
          Complete seu perfil
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Só faltam seus dados de jogador.</p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-6 rounded-2xl border border-border bg-surface p-5"
        >
          <div className="grid gap-2">
            <label htmlFor="nome" className="text-sm font-medium text-foreground">
              Nome
            </label>
            <input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="h-[52px] rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium text-foreground">Posição principal</span>
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
            <label htmlFor="numero" className="text-sm font-medium text-foreground">
              Número preferido <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="numero"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="h-[52px] rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={!valido || saving}
              className="flex h-[52px] w-full items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Começar a jogar"}
            </button>
            {erro && <p className="mt-3 text-xs text-destructive">{erro}</p>}
          </div>
        </form>
      </div>
    </main>
  );
}
