import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_players",
  title: "Listar jogadores",
  description: "Lista os jogadores cadastrados na pelada, com posição e pé dominante.",
  inputSchema: {
    apenas_ativos: z.boolean().default(true).describe("Retorna somente jogadores ativos."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ apenas_ativos }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("players")
      .select("id, nome, apelido, posicao_principal, pe_dominante, numero_preferido, ativo")
      .order("apelido", { ascending: true });
    if (apenas_ativos !== false) query = query.eq("ativo", true);
    const { data, error } = await query;
    return error ? errorResult(error.message) : textResult(data ?? []);
  },
});
