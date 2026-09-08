import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_ranking",
  title: "Ranking de jogadores",
  description:
    "Ranking com gols, assistências, jogos, vitórias, MVPs e aproveitamento. Use season_id para uma temporada específica ou omita para o histórico geral.",
  inputSchema: {
    season_id: z.string().uuid().optional().describe("Temporada; se omitido, usa o histórico geral."),
    ordenar_por: z
      .enum(["gols", "assistencias", "mvps", "vitorias", "jogos", "aproveitamento"])
      .default("gols")
      .describe("Critério de ordenação."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ season_id, ordenar_por, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);
    const campo = ordenar_por ?? "gols";
    const max = limit ?? 20;

    const stats = season_id
      ? await supabase
          .from("player_stats")
          .select("*")
          .eq("season_id", season_id)
          .order(campo, { ascending: false, nullsFirst: false })
          .limit(max)
      : await supabase
          .from("player_stats_alltime")
          .select("*")
          .order(campo, { ascending: false, nullsFirst: false })
          .limit(max);

    if (stats.error) return errorResult(stats.error.message);
    const rows = stats.data ?? [];
    const ids = rows.map((r) => r.player_id).filter((id): id is string => Boolean(id));
    const { data: players } = await supabase.from("players").select("id, nome, apelido").in("id", ids);
    const nomes = new Map((players ?? []).map((p) => [p.id, p]));

    return textResult(
      rows.map((r) => ({ ...r, jogador: r.player_id ? (nomes.get(r.player_id) ?? null) : null })),
    );
  },
});
