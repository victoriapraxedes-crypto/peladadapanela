import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_pelada",
  title: "Detalhes da pelada",
  description: "Retorna os dados de uma pelada, a lista de presença confirmada e as partidas com placares.",
  inputSchema: { pelada_id: z.string().uuid().describe("ID da pelada.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ pelada_id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);

    const [pelada, presencas, partidas] = await Promise.all([
      supabase.from("peladas").select("id, data, horario, local, status").eq("id", pelada_id).maybeSingle(),
      supabase
        .from("pelada_players")
        .select("confirmado_em, players(id, nome, apelido, posicao_principal)")
        .eq("pelada_id", pelada_id),
      supabase
        .from("matches")
        .select("id, ordem, status, placar_a, placar_b, inicio_em, fim_em")
        .eq("pelada_id", pelada_id)
        .order("ordem", { ascending: true }),
    ]);

    const err = pelada.error ?? presencas.error ?? partidas.error;
    if (err) return errorResult(err.message);
    if (!pelada.data) return errorResult("Pelada não encontrada.");

    return textResult({
      pelada: pelada.data,
      presencas: presencas.data ?? [],
      partidas: partidas.data ?? [],
    });
  },
});
