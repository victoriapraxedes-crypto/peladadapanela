import type { Database } from "@/integrations/supabase/types";

type Posicao = Database["public"]["Enums"]["posicao"];
type PeDominante = Database["public"]["Enums"]["pe_dominante"];

export const POSICAO_LABEL: Record<Posicao, string> = {
  goleiro: "Goleiro",
  defensor: "Defensor",
  "meio-campo": "Meio-campo",
  atacante: "Atacante",
};

/** Convidados podem não ter posição cadastrada. */
export function posicaoLabel(p: Posicao | null | undefined): string {
  return p ? POSICAO_LABEL[p] : "Sem posição";
}

export const POSICAO_ABREV: Record<Posicao, string> = {
  goleiro: "GOL",
  defensor: "DEF",
  "meio-campo": "MEI",
  atacante: "ATA",
};

export function posicaoAbrev(p: Posicao | null | undefined): string {
  return p ? POSICAO_ABREV[p] : "—";
}

export const PE_LABEL: Record<PeDominante, string> = {
  direito: "Direito",
  esquerdo: "Esquerdo",
  ambidestro: "Ambidestro",
};
