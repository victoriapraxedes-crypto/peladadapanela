import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_peladas",
  title: "Listar peladas",
  description: "Lista as peladas (data, horário, local e status), da mais recente para a mais antiga.",
  inputSchema: {
    status: z
      .enum(["agendada", "em_andamento", "finalizada"])
      .optional()
      .describe("Filtra por status da pelada."),
    limit: z.number().int().min(1).max(50).default(10).describe("Quantidade máxima de peladas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("peladas")
      .select("id, data, horario, local, status")
      .order("data", { ascending: false })
      .limit(limit ?? 10);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    return error ? errorResult(error.message) : textResult(data ?? []);
  },
});
