import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { compartilharOuBaixar } from "@/features/compartilhar/cards";
import { FOCUS_RING } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function BotaoCompartilhar({
  gerar,
  nomeArquivo,
  titulo,
  texto,
  rotulo = "Compartilhar card",
  className,
}: {
  gerar: () => Promise<Blob>;
  nomeArquivo: string;
  titulo: string;
  texto: string;
  rotulo?: string;
  className?: string;
}) {
  const [gerando, setGerando] = useState(false);

  const acionar = async () => {
    if (gerando) return;
    setGerando(true);
    try {
      const blob = await gerar();
      const r = await compartilharOuBaixar(blob, nomeArquivo, titulo, texto);
      if (r === "baixado") toast.success("Imagem salva. É só postar.");
    } catch (e) {
      toast.error("Não foi possível gerar o card. " + (e instanceof Error ? e.message : ""));
    } finally {
      setGerando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void acionar()}
      disabled={gerando}
      className={cn(
        "flex h-[48px] items-center justify-center gap-2 rounded-xl border border-primary/60 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60",
        FOCUS_RING,
        className,
      )}
    >
      <Share2 size={16} />
      {gerando ? "Gerando..." : rotulo}
    </button>
  );
}
