import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PeladaStatus = Database["public"]["Enums"]["pelada_status"];
type ResultadoStatus = Database["public"]["Enums"]["resultado_status"];

export interface PeladaAberta {
  id: string;
  data: string;
  horario: string;
  local: string;
  status: PeladaStatus;
  resultado: ResultadoStatus;
  season_id: string;
}

/**
 * Todas as peladas que ainda não foram encerradas, inclusive as de datas passadas:
 * nenhuma pelada some do app só porque o dia passou.
 */
export async function buscarPeladasAbertas() {
  return supabase
    .from("peladas")
    .select("id, data, horario, local, status, resultado, season_id")
    .neq("status", "finalizada")
    .order("data", { ascending: true });
}

/** A próxima a partir de hoje; se não houver, a mais recente que ficou em aberto. */
export function escolherPeladaAtual<T extends { data: string }>(
  lista: T[],
  hoje: string,
): T | null {
  return lista.find((p) => p.data >= hoje) ?? [...lista].reverse()[0] ?? null;
}
