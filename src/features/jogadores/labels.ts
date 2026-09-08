import type { Database } from "@/integrations/supabase/types";

type Posicao = Database["public"]["Enums"]["posicao"];
type PeDominante = Database["public"]["Enums"]["pe_dominante"];

export const POSICAO_LABEL: Record<Posicao, string> = {
  goleiro: "Goleiro",
  defensor: "Defensor",
  "meio-campo": "Meio-campo",
  atacante: "Atacante",
};

export const PE_LABEL: Record<PeDominante, string> = {
  direito: "Direito",
  esquerdo: "Esquerdo",
  ambidestro: "Ambidestro",
};
