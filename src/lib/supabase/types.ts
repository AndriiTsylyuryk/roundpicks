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
      best_third_picks: {
        Row: {
          group_id: string
          id: string
          team_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          team_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          team_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "best_third_picks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_answers: {
        Row: {
          answer: string
          created_at: string
          group_id: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          group_id: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          group_id?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_answers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "bonus_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          difficulty: string
          group_id: string
          id: string
          options: Json | null
          question: string
          type: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          difficulty?: string
          group_id: string
          id?: string
          options?: Json | null
          question: string
          type: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          difficulty?: string
          group_id?: string
          id?: string
          options?: Json | null
          question?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_questions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          name: string
          slug: string
          starts_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          name: string
          slug: string
          starts_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string
          slug?: string
          starts_at?: string | null
          status?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string | null
          page: string | null
          rating: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          page?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          page?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_picks: {
        Row: {
          created_at: string
          group_id: string
          id: string
          rank1_id: string
          rank2_id: string
          rank3_id: string | null
          updated_at: string
          user_id: string
          wc_group: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          rank1_id: string
          rank2_id: string
          rank3_id?: string | null
          updated_at?: string
          user_id: string
          wc_group: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          rank1_id?: string
          rank2_id?: string
          rank3_id?: string | null
          updated_at?: string
          user_id?: string
          wc_group?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_picks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_picks_rank1_id_fkey"
            columns: ["rank1_id"]
            isOneToOne: false
            referencedRelation: "wc_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_picks_rank2_id_fkey"
            columns: ["rank2_id"]
            isOneToOne: false
            referencedRelation: "wc_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_picks_rank3_id_fkey"
            columns: ["rank3_id"]
            isOneToOne: false
            referencedRelation: "wc_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          creator_id: string
          event_id: string | null
          id: string
          invite_code: string
          max_participants: number
          mode: string
          name: string
          phase1_deadline: string | null
          phase1_locked: boolean
          phase2_deadline: string | null
          phase2_locked: boolean
          phase3_deadline: string | null
          phase3_locked: boolean
        }
        Insert: {
          created_at?: string
          creator_id: string
          event_id?: string | null
          id?: string
          invite_code: string
          max_participants?: number
          mode?: string
          name: string
          phase1_deadline?: string | null
          phase1_locked?: boolean
          phase2_deadline?: string | null
          phase2_locked?: boolean
          phase3_deadline?: string | null
          phase3_locked?: boolean
        }
        Update: {
          created_at?: string
          creator_id?: string
          event_id?: string | null
          id?: string
          invite_code?: string
          max_participants?: number
          mode?: string
          name?: string
          phase1_deadline?: string | null
          phase1_locked?: boolean
          phase2_deadline?: string | null
          phase2_locked?: boolean
          phase3_deadline?: string | null
          phase3_locked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      knockout_picks: {
        Row: {
          group_id: string
          id: string
          match_id: string
          updated_at: string
          user_id: string
          winner_id: string
        }
        Insert: {
          group_id: string
          id?: string
          match_id: string
          updated_at?: string
          user_id: string
          winner_id: string
        }
        Update: {
          group_id?: string
          id?: string
          match_id?: string
          updated_at?: string
          user_id?: string
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knockout_picks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knockout_picks_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "wc_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knockout_picks_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "wc_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_predictions: {
        Row: {
          created_at: string
          group_id: string
          id: string
          match_id: string
          prediction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          match_id: string
          prediction: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          match_id?: string
          prediction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_predictions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "wc_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          dismissed_notifications: Json
          display_name: string | null
          has_rated: boolean
          has_surveyed: boolean
          id: string
          keep_me_posted: boolean
          keep_posted_email: string | null
          locale: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          dismissed_notifications?: Json
          display_name?: string | null
          has_rated?: boolean
          has_surveyed?: boolean
          id: string
          keep_me_posted?: boolean
          keep_posted_email?: string | null
          locale?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          dismissed_notifications?: Json
          display_name?: string | null
          has_rated?: boolean
          has_surveyed?: boolean
          id?: string
          keep_me_posted?: boolean
          keep_posted_email?: string | null
          locale?: string
        }
        Relationships: []
      }
      site_notifications: {
        Row: {
          body: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          email_html: string | null
          email_subject: string | null
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          email_html?: string | null
          email_subject?: string | null
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          email_html?: string | null
          email_subject?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          chat_email: string | null
          chat_opt_in: boolean
          created_at: string
          enjoyed_most: string[]
          enjoyed_most_other: string | null
          frustrating: string | null
          id: string
          improvement: string | null
          user_id: string
          want_events: string[]
          want_events_other: string | null
        }
        Insert: {
          chat_email?: string | null
          chat_opt_in?: boolean
          created_at?: string
          enjoyed_most?: string[]
          enjoyed_most_other?: string | null
          frustrating?: string | null
          id?: string
          improvement?: string | null
          user_id: string
          want_events?: string[]
          want_events_other?: string | null
        }
        Update: {
          chat_email?: string | null
          chat_opt_in?: boolean
          created_at?: string
          enjoyed_most?: string[]
          enjoyed_most_other?: string | null
          frustrating?: string | null
          id?: string
          improvement?: string | null
          user_id?: string
          want_events?: string[]
          want_events_other?: string | null
        }
        Relationships: []
      }
      wc_matches: {
        Row: {
          away_score: number | null
          away_team_id: string | null
          external_id: number
          home_score: number | null
          home_team_id: string | null
          id: string
          kickoff_at: string
          round: string
          status: string
          updated_at: string
        }
        Insert: {
          away_score?: number | null
          away_team_id?: string | null
          external_id: number
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          kickoff_at: string
          round: string
          status?: string
          updated_at?: string
        }
        Update: {
          away_score?: number | null
          away_team_id?: string | null
          external_id?: number
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          kickoff_at?: string
          round?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "wc_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "wc_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_teams: {
        Row: {
          external_id: number | null
          group_letter: string
          id: string
          name: string
        }
        Insert: {
          external_id?: number | null
          group_letter: string
          id?: string
          name: string
        }
        Update: {
          external_id?: number | null
          group_letter?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_join_group: { Args: { p_group_id: string }; Returns: boolean }
      get_my_group_ids: { Args: never; Returns: string[] }
      phase1_open_for_group: { Args: { p_group_id: string }; Returns: boolean }
      phase2_open_for_group: { Args: { p_group_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
