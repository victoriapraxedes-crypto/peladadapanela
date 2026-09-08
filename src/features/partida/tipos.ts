import type { Database } from "@/integrations/supabase/types";

export type MatchEventType = Database["public"]["Enums"]["match_event_type"];

export interface EventoPartida {
  id: string;
  tipo: MatchEventType;
  playerId: string;
  teamId: string;
  assistPlayerId: string | null;
  criadoEm: string;
  autorApelido: string;
  assistApelido: string | null;
}
