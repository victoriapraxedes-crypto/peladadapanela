// Segurança: a RLS da tabela `players` já garante que cada pessoa só consegue
// atualizar a própria linha (profile_id = auth.uid()), e que apenas admin altera
// qualquer jogador. As validações abaixo são só de experiência de uso — a checagem
// real acontece no banco, não no React.
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { InitialsAvatar } from "@/components/layout/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Database, Tables } from "@/integrations/supabase/types";

type Posicao = Database["public"]["Enums"]["posicao"];
type Pe = Database["public"]["Enums"]["pe_dominante"];
type PlayerRow = Tables<"players">;

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

const MAX_BYTES = 5 * 1024 * 1024;

function optionClass(selected: boolean, disabled = false) {
  return [
    "flex min-h-[52px] items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors",
    selected
      ? "border-primary bg-surface-2 text-foreground"
      : "border-border bg-transparent text-muted-foreground hover:border-primary/40",
    disabled ? "opacity-40" : "",
  ].join(" ");
}

const INPUT_CLASS =
  "h-[52px] rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: PlayerRow;
  onSaved: () => void;
}

export function EditarPerfilDrawer({ open, onOpenChange, player, onSaved }: Props) {
  const { user, reloadPlayer } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(player.nome);
  const [apelido, setApelido] = useState(player.apelido);
  const [fotoUrl, setFotoUrl] = useState<string | null>(player.foto_url);
  const [posicao, setPosicao] = useState<Posicao>(player.posicao_principal);
  const [secundarias, setSecundarias] = useState<Posicao[]>(
    (player.posicoes_secundarias ?? []) as Posicao[],
  );
  const [pe, setPe] = useState<Pe>(player.pe_dominante);
  const [numero, setNumero] = useState(
    player.numero_preferido == null ? "" : String(player.numero_preferido),
  );
  const [erroNumero, setErroNumero] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(player.nome);
    setApelido(player.apelido);
    setFotoUrl(player.foto_url);
    setPosicao(player.posicao_principal);
    setSecundarias((player.posicoes_secundarias ?? []) as Posicao[]);
    setPe(player.pe_dominante);
    setNumero(player.numero_preferido == null ? "" : String(player.numero_preferido));
    setErroNumero(null);
  }, [open, player]);

  function escolherPrincipal(value: Posicao) {
    setPosicao(value);
    setSecundarias((prev) => prev.filter((p) => p !== value));
  }

  function alternarSecundaria(value: Posicao) {
    if (value === posicao) return;
    setSecundarias((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    );
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (file.size > MAX_BYTES) {
      toast.error("A foto precisa ter no máximo 5 MB. Escolha uma imagem menor.");
      return;
    }

    setEnviandoFoto(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    // O caminho precisa começar pelo uid: as policies do bucket só permitem
    // escrita dentro da pasta da própria pessoa.
    const caminho = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(caminho, file, { upsert: false, contentType: file.type });

    if (error) {
      toast.error("Não foi possível enviar a foto. " + error.message);
      setEnviandoFoto(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(caminho);
    setFotoUrl(data.publicUrl);
    setEnviandoFoto(false);
  }

  async function salvar() {
    if (salvando) return;
    if (!nome.trim() || !apelido.trim()) {
      toast.error("Nome e apelido são obrigatórios.");
      return;
    }

    let numeroPreferido: number | null = null;
    if (numero.trim() !== "") {
      const parsed = Number(numero);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) {
        setErroNumero("Escolha um número entre 1 e 99.");
        return;
      }
      numeroPreferido = parsed;
    }
    setErroNumero(null);

    setSalvando(true);
    const { error } = await supabase
      .from("players")
      .update({
        nome: nome.trim(),
        apelido: apelido.trim(),
        foto_url: fotoUrl,
        posicao_principal: posicao,
        posicoes_secundarias: secundarias,
        pe_dominante: pe,
        numero_preferido: numeroPreferido,
      })
      .eq("id", player.id);

    if (error) {
      toast.error("Não foi possível salvar o perfil. " + error.message);
      setSalvando(false);
      return;
    }

    await reloadPlayer();
    setSalvando(false);
    onOpenChange(false);
    onSaved();
    toast.success("Perfil atualizado.");
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Editar perfil</DrawerTitle>
        </DrawerHeader>

        <div className="grid max-h-[70vh] gap-6 overflow-y-auto px-5 pb-8">
          <div className="grid justify-items-center gap-3">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={apelido}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <InitialsAvatar apelido={apelido || nome} size={96} />
            )}
            <button
              type="button"
              disabled={enviandoFoto}
              onClick={() => fileRef.current?.click()}
              className="flex h-[52px] items-center justify-center rounded-xl border border-border px-5 text-sm font-medium text-foreground disabled:opacity-50"
            >
              {enviandoFoto ? "Enviando foto..." : "Trocar foto"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="perfil-nome" className="text-sm font-medium text-foreground">
              Nome
            </label>
            <input
              id="perfil-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="perfil-apelido" className="text-sm font-medium text-foreground">
              Apelido
            </label>
            <input
              id="perfil-apelido"
              value={apelido}
              maxLength={16}
              onChange={(e) => setApelido(e.target.value)}
              className={INPUT_CLASS}
            />
            <p className="text-xs text-muted-foreground">
              É o nome que aparece no placar e no ranking.
            </p>
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium text-foreground">Posição principal</span>
            <div className="grid grid-cols-2 gap-3">
              {POSICOES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={posicao === p.value}
                  onClick={() => escolherPrincipal(p.value)}
                  className={optionClass(posicao === p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium text-foreground">Posições secundárias</span>
            <div className="grid grid-cols-2 gap-3">
              {POSICOES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  disabled={p.value === posicao}
                  aria-pressed={secundarias.includes(p.value)}
                  onClick={() => alternarSecundaria(p.value)}
                  className={optionClass(secundarias.includes(p.value), p.value === posicao)}
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
            <label htmlFor="perfil-numero" className="text-sm font-medium text-foreground">
              Número preferido <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="perfil-numero"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={numero}
              onChange={(e) => {
                setNumero(e.target.value);
                setErroNumero(null);
              }}
              className={INPUT_CLASS}
            />
            {erroNumero && <p className="text-xs text-destructive">{erroNumero}</p>}
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              disabled={salvando || enviandoFoto}
              onClick={salvar}
              className="flex h-[52px] w-full items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-[52px] w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-muted-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
