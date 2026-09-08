export type Position = "goleiro" | "defensor" | "meio-campo" | "atacante";
export type Foot = "direito" | "esquerdo" | "ambidestro";
export type UserRole = "admin" | "jogador";
export type PeladaStatus =
  "aberta" | "confirmacao" | "times_definidos" | "em_andamento" | "finalizada";
export type MatchStatus = "agendada" | "em_andamento" | "finalizada";
export type MatchEventType = "gol" | "assistencia" | "gol_contra";

export interface Player {
  id: string;
  nome: string;
  apelido: string;
  fotoUrl?: string | null;
  posicaoPrincipal: Position;
  posicoesSecundarias: Position[];
  peDominante: Foot;
  numeroPreferido?: number | null;
  ativo: boolean;
  criadoEm: string;
}

export interface Season {
  id: string;
  nome: string;
  inicioEm: string;
  fimEm?: string | null;
  ativa: boolean;
}

export interface Team {
  id: string;
  peladaId: string;
  nome: string;
  cor: string;
  jogadores: string[];
  capitaoId?: string | null;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  tipo: MatchEventType;
  playerId: string;
  teamId: string;
  assistPlayerId?: string | null;
  minuto: number;
  criadoEm: string;
}

export interface Match {
  id: string;
  peladaId: string;
  timeA: string;
  timeB: string;
  placarA: number;
  placarB: number;
  inicioEm?: string | null;
  fimEm?: string | null;
  status: MatchStatus;
  eventos: MatchEvent[];
}

export interface Pelada {
  id: string;
  data: string;
  horario: string;
  local: string;
  seasonId: string;
  status: PeladaStatus;
  jogadoresConfirmados: string[];
  times: Team[];
  partidas: Match[];
}

export interface PlayerStats {
  playerId: string;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols: number;
  assistencias: number;
  golsContra: number;
  participacoesEmGols: number;
  mediaGolsPorJogo: number;
  mediaAssistenciasPorJogo: number;
  aproveitamento: number;
  mvps: number;
}

export interface MvpVote {
  id: string;
  peladaId: string;
  voterPlayerId: string;
  votedPlayerId: string;
  criadoEm: string;
}

export interface AuthUser {
  id: string;
  playerId: string;
  role: UserRole;
}
