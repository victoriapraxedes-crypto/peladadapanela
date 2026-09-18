export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auditoria_resultados: {
        Row: {
          acao: string
          antes: Json | null
          depois: Json | null
          entidade: string
          feito_em: string
          feito_por: string | null
          id: number
          justificativa: string | null
          pelada_id: string | null
          player_id: string | null
        }
        Insert: {
          acao: string
          antes?: Json | null
          depois?: Json | null
          entidade: string
          feito_em?: string
          feito_por?: string | null
          id?: never
          justificativa?: string | null
          pelada_id?: string | null
          player_id?: string | null
        }
        Update: {
          acao?: string
          antes?: Json | null
          depois?: Json | null
          entidade?: string
          feito_em?: string
          feito_por?: string | null
          id?: never
          justificativa?: string | null
          pelada_id?: string | null
          player_id?: string | null
        }
        Relationships: []
      }
      match_events: {
        Row: {
          assist_player_id: string | null
          created_by: string | null
          criado_em: string
          id: string
          match_id: string
          minuto: number | null
          player_id: string
          team_id: string
          tipo: Database["public"]["Enums"]["match_event_type"]
        }
        Insert: {
          assist_player_id?: string | null
          created_by?: string | null
          criado_em?: string
          id?: string
          match_id: string
          minuto?: number | null
          player_id: string
          team_id: string
          tipo: Database["public"]["Enums"]["match_event_type"]
        }
        Update: {
          assist_player_id?: string | null
          created_by?: string | null
          criado_em?: string
          id?: string
          match_id?: string
          minuto?: number | null
          player_id?: string
          team_id?: string
          tipo?: Database["public"]["Enums"]["match_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "match_events_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_events_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "player_stats_alltime"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_events_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_participations"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats_alltime"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          fim_em: string | null
          id: string
          inicio_em: string | null
          ordem: number
          pelada_id: string
          placar_a: number
          placar_b: number
          status: Database["public"]["Enums"]["match_status"]
          team_a_id: string
          team_b_id: string
        }
        Insert: {
          fim_em?: string | null
          id?: string
          inicio_em?: string | null
          ordem?: number
          pelada_id: string
          placar_a?: number
          placar_b?: number
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id: string
          team_b_id: string
        }
        Update: {
          fim_em?: string | null
          id?: string
          inicio_em?: string | null
          ordem?: number
          pelada_id?: string
          placar_a?: number
          placar_b?: number
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string
          team_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      mvp_votes: {
        Row: {
          criado_em: string
          id: string
          pelada_id: string
          voted_player_id: string
          voter_player_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          pelada_id: string
          voted_player_id: string
          voter_player_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          pelada_id?: string
          voted_player_id?: string
          voter_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mvp_votes_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mvp_votes_voted_player_id_fkey"
            columns: ["voted_player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "mvp_votes_voted_player_id_fkey"
            columns: ["voted_player_id"]
            isOneToOne: false
            referencedRelation: "player_stats_alltime"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "mvp_votes_voted_player_id_fkey"
            columns: ["voted_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mvp_votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "mvp_votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "player_stats_alltime"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "mvp_votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias_disciplinares: {
        Row: {
          anulada: boolean
          anulada_em: string | null
          anulada_por: string | null
          data_ocorrencia: string
          descricao: string | null
          id: string
          justificativa_anulacao: string | null
          pelada_id: string
          player_id: string
          registrado_em: string
          registrado_por: string | null
          suspenso_ate: string
          tipo: string
        }
        Insert: {
          anulada?: boolean
          anulada_em?: string | null
          anulada_por?: string | null
          data_ocorrencia: string
          descricao?: string | null
          id?: string
          justificativa_anulacao?: string | null
          pelada_id: string
          player_id: string
          registrado_em?: string
          registrado_por?: string | null
          suspenso_ate: string
          tipo?: string
        }
        Update: {
          anulada?: boolean
          anulada_em?: string | null
          anulada_por?: string | null
          data_ocorrencia?: string
          descricao?: string | null
          id?: string
          justificativa_anulacao?: string | null
          pelada_id?: string
          player_id?: string
          registrado_em?: string
          registrado_por?: string | null
          suspenso_ate?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_disciplinares_pelada_id_player_id_fkey"
            columns: ["pelada_id", "player_id"]
            isOneToOne: false
            referencedRelation: "pelada_players"
            referencedColumns: ["pelada_id", "player_id"]
          },
          {
            foreignKeyName: "ocorrencias_disciplinares_pelada_id_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_players: {
        Row: {
          confirmado_em: string
          pelada_id: string
          player_id: string
        }
        Insert: {
          confirmado_em?: string
          pelada_id: string
          player_id: string
        }
        Update: {
          confirmado_em?: string
          pelada_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_players_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pelada_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "pelada_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats_alltime"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "pelada_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_stats: {
        Row: {
          assistencias: number
          atualizado_em: string
          atualizado_por: string | null
          carrinhos: number
          gols: number
          pelada_id: string
          player_id: string
        }
        Insert: {
          assistencias?: number
          atualizado_em?: string
          atualizado_por?: string | null
          carrinhos?: number
          gols?: number
          pelada_id: string
          player_id: string
        }
        Update: {
          assistencias?: number
          atualizado_em?: string
          atualizado_por?: string | null
          carrinhos?: number
          gols?: number
          pelada_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_stats_pelada_id_player_id_fkey"
            columns: ["pelada_id", "player_id"]
            isOneToOne: false
            referencedRelation: "pelada_players"
            referencedColumns: ["pelada_id", "player_id"]
          },
          {
            foreignKeyName: "pelada_stats_pelada_id_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      peladas: {
        Row: {
          criado_em: string
          data: string
          horario: string
          id: string
          local: string
          publicado_em: string | null
          publicado_por: string | null
          resultado: Database["public"]["Enums"]["resultado_status"]
          season_id: string
          status: Database["public"]["Enums"]["pelada_status"]
        }
        Insert: {
          criado_em?: string
          data: string
          horario?: string
          id?: string
          local: string
          publicado_em?: string | null
          publicado_por?: string | null
          resultado?: Database["public"]["Enums"]["resultado_status"]
          season_id: string
          status?: Database["public"]["Enums"]["pelada_status"]
        }
        Update: {
          criado_em?: string
          data?: string
          horario?: string
          id?: string
          local?: string
          publicado_em?: string | null
          publicado_por?: string | null
          resultado?: Database["public"]["Enums"]["resultado_status"]
          season_id?: string
          status?: Database["public"]["Enums"]["pelada_status"]
        }
        Relationships: [
          {
            foreignKeyName: "peladas_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "peladas_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          apelido: string
          ativo: boolean
          criado_em: string
          foto_url: string | null
          id: string
          nome: string
          numero_preferido: number | null
          pe_dominante: Database["public"]["Enums"]["pe_dominante"]
          posicao_principal: Database["public"]["Enums"]["posicao"] | null
          posicoes_secundarias: Database["public"]["Enums"]["posicao"][]
          profile_id: string | null
        }
        Insert: {
          apelido: string
          ativo?: boolean
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome: string
          numero_preferido?: number | null
          pe_dominante?: Database["public"]["Enums"]["pe_dominante"]
          posicao_principal?: Database["public"]["Enums"]["posicao"] | null
          posicoes_secundarias?: Database["public"]["Enums"]["posicao"][]
          profile_id?: string | null
        }
        Update: {
          apelido?: string
          ativo?: boolean
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome?: string
          numero_preferido?: number | null
          pe_dominante?: Database["public"]["Enums"]["pe_dominante"]
          posicao_principal?: Database["public"]["Enums"]["posicao"] | null
          posicoes_secundarias?: Database["public"]["Enums"]["posicao"][]
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acesso: Database["public"]["Enums"]["acesso_status"]
          avatar_url: string | null
          criado_em: string
          email: string | null
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          acesso?: Database["public"]["Enums"]["acesso_status"]
          avatar_url?: string | null
          criado_em?: string
          email?: string | null
          id: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          acesso?: Database["public"]["Enums"]["acesso_status"]
          avatar_url?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      seasons: {
        Row: {
          ativa: boolean
          fim_em: string | null
          id: string
          inicio_em: string
          nome: string
        }
        Insert: {
          ativa?: boolean
          fim_em?: string | null
          id?: string
          inicio_em: string
          nome: string
        }
        Update: {
          ativa?: boolean
          fim_em?: string | null
          id?: string
          inicio_em?: string
          nome?: string
        }
        Relationships: []
      }
      team_players: {
        Row: {
          player_id: string
          team_id: string
        }
        Insert: {
          player_id: string
          team_id: string
        }
        Update: {
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats_alltime"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          cor: string
          id: string
          nome: string
          ordem: number
          pelada_id: string
        }
        Insert: {
          cor?: string
          id?: string
          nome: string
          ordem?: number
          pelada_id: string
        }
        Update: {
          cor?: string
          id?: string
          nome?: string
          ordem?: number
          pelada_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      desempenho_pelada: {
        Row: {
          assistencias: number | null
          carrinhos: number | null
          data: string | null
          gols: number | null
          pelada_id: string | null
          player_id: string | null
          pontos: number | null
          season_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pelada_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pelada_players_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      match_participations: {
        Row: {
          gols_pro: number | null
          gols_sofridos: number | null
          match_id: string | null
          pelada_id: string | null
          player_id: string | null
          season_id: string | null
          team_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peladas_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "peladas_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats_alltime"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      mvp_winners: {
        Row: {
          pelada_id: string | null
          player_id: string | null
          votos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mvp_votes_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mvp_votes_voted_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "mvp_votes_voted_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats_alltime"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "mvp_votes_voted_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          aproveitamento: number | null
          assistencias: number | null
          derrotas: number | null
          empates: number | null
          gols: number | null
          gols_contra: number | null
          jogos: number | null
          media_assistencias_por_jogo: number | null
          media_gols_por_jogo: number | null
          mvps: number | null
          participacoes_em_gols: number | null
          player_id: string | null
          season_id: string | null
          vitorias: number | null
        }
        Relationships: []
      }
      player_stats_alltime: {
        Row: {
          aproveitamento: number | null
          assistencias: number | null
          derrotas: number | null
          empates: number | null
          gols: number | null
          gols_contra: number | null
          jogos: number | null
          media_assistencias_por_jogo: number | null
          media_gols_por_jogo: number | null
          mvps: number | null
          participacoes_em_gols: number | null
          player_id: string | null
          vitorias: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      abrir_temporada: {
        Args: { p_inicio?: string; p_nome: string }
        Returns: string
      }
      anular_ocorrencia: {
        Args: {
          p_justificativa: string
          p_ocorrencia_id: string
          p_remover_carrinho?: boolean
        }
        Returns: undefined
      }
      current_player_id: { Args: never; Returns: string }
      encerrar_temporada: {
        Args: { p_fim?: string; p_season_id: string }
        Returns: undefined
      }
      editar_escalacao: {
        Args: {
          p_entra?: string | null
          p_justificativa?: string | null
          p_levar_numeros?: boolean
          p_pelada_id: string
          p_sai?: string | null
        }
        Returns: undefined
      }
      hoje_local: { Args: never; Returns: string }
      votacao_mvp_fecha_em: { Args: { p_pelada_id: string }; Returns: string | null }
      is_admin: { Args: never; Returns: boolean }
      is_aprovado: { Args: never; Returns: boolean }
      publicar_resultado: { Args: { p_pelada_id: string }; Returns: undefined }
      ranking: {
        Args: { p_antes_de?: string; p_season_id?: string }
        Returns: {
          assistencias: number
          carrinhos: number
          gols: number
          jogos: number
          player_id: string
          pontos: number
          posicao: number
        }[]
      }
      registrar_carrinho_lesao: {
        Args: { p_descricao?: string; p_pelada_id: string; p_player_id: string }
        Returns: string
      }
      salvar_sumula: {
        Args: { p_justificativa?: string; p_linhas: Json; p_pelada_id: string }
        Returns: undefined
      }
      suspensao_na_data: {
        Args: { p_data: string; p_player_id: string }
        Returns: string
      }
      vincular_convidado: {
        Args: { p_convidado_id: string; p_profile_id: string }
        Returns: string
      }
    }
    Enums: {
      acesso_status: "pendente" | "aprovado" | "recusado"
      match_event_type: "gol" | "gol_contra"
      match_status: "agendada" | "em_andamento" | "finalizada"
      pe_dominante: "direito" | "esquerdo" | "ambidestro"
      pelada_status:
        | "aberta"
        | "confirmacao"
        | "times_definidos"
        | "em_andamento"
        | "finalizada"
      posicao: "goleiro" | "defensor" | "meio-campo" | "atacante"
      resultado_status: "rascunho" | "publicado"
      user_role: "admin" | "jogador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      acesso_status: ["pendente", "aprovado", "recusado"],
      match_event_type: ["gol", "gol_contra"],
      match_status: ["agendada", "em_andamento", "finalizada"],
      pe_dominante: ["direito", "esquerdo", "ambidestro"],
      pelada_status: [
        "aberta",
        "confirmacao",
        "times_definidos",
        "em_andamento",
        "finalizada",
      ],
      posicao: ["goleiro", "defensor", "meio-campo", "atacante"],
      resultado_status: ["rascunho", "publicado"],
      user_role: ["admin", "jogador"],
    },
  },
} as const
