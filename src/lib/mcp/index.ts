import { auth, defineMcp } from "@lovable.dev/mcp-js";

import getPelada from "./tools/get-pelada";
import getRanking from "./tools/get-ranking";
import listPeladas from "./tools/list-peladas";
import listPlayers from "./tools/list-players";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "pelada-da-panela-app",
  title: "Pelada da Panela App",
  version: "0.1.0",
  instructions:
    "Ferramentas da Pelada da Panela: consultar peladas, escalação, jogadores e ranking. A escalação é definida só pelos admins no app.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPeladas, getPelada, listPlayers, getRanking],
});
