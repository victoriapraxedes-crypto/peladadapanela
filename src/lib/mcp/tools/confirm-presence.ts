import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { currentPlayer, errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "confirm_presence",
  title: "Confirmar ou cancelar presença",
  description: "Confirma ou cancela a presença do jogador conectado em uma pelada.",
  inputSchema: {
    pelada_id: z.string().uuid().describe("ID da pelada."),
    confirmar: z.boolean().default(true).describe("true confirma a presença; false cancela."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ pelada_id, confirmar }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const player = await currentPlayer(ctx);
    if (!player) return errorResult("Sua conta ainda não tem um jogador cadastrado no app.");

    const supabase = supabaseForUser(ctx);
    if (confirmar === false) {
      const { error } = await supabase
        .from("pelada_players")
        .delete()
        .eq("pelada_id", pelada_id)
        .eq("player_id", player.id);
      return error ? errorResult(error.message) : textResult({ pelada_id, presente: false });
    }

    const { error } = await supabase
      .from("pelada_players")
      .upsert({ pelada_id, player_id: player.id }, { onConflict: "pelada_id,player_id" });
    return error ? errorResult(error.message) : textResult({ pelada_id, presente: true });
  },
});
