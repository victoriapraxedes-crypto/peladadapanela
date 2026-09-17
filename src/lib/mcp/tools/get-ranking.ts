import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_ranking",
  title: "Ranking de jogadores",
  description:
    "Ranking individual: pontos (4 por gol, 2 por assistência, -5 por carrinho), jogos, gols, assistências e carrinhos, só com resultados publicados. Use season_id para uma temporada ou omita para o histórico geral.",
  inputSchema: {
    season_id: z
      .string()
      .uuid()
      .optional()
      .describe("Temporada; se omitido, usa o histórico geral."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ season_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);
    const max = limit ?? 20;

    const ranking = await supabase.rpc("ranking", season_id ? { p_season_id: season_id } : {});
    if (ranking.error) return errorResult(ranking.error.message);
    const rows = (ranking.data ?? []).slice(0, max);
    const ids = rows.map((r) => r.player_id);
    const { data: players } = await supabase
      .from("players")
      .select("id, nome, apelido")
      .in("id", ids);
    const nomes = new Map((players ?? []).map((p) => [p.id, p]));

    return textResult(rows.map((r) => ({ ...r, jogador: nomes.get(r.player_id) ?? null })));
  },
});
