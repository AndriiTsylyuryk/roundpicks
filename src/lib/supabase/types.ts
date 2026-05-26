export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          locale: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          locale?: string;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          locale?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: string;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: string;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          status?: string;
          starts_at?: string | null;
          ends_at?: string | null;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          creator_id: string;
          invite_code: string;
          max_participants: number;
          event_id: string | null;
          phase1_locked: boolean;
          phase1_deadline: string | null;
          phase2_locked: boolean;
          phase2_deadline: string | null;
          phase3_locked: boolean;
          phase3_deadline: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          creator_id: string;
          invite_code: string;
          max_participants?: number;
          event_id?: string | null;
          phase1_locked?: boolean;
          phase1_deadline?: string | null;
          phase2_locked?: boolean;
          phase2_deadline?: string | null;
          phase3_locked?: boolean;
          phase3_deadline?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          max_participants?: number;
          event_id?: string | null;
          phase1_locked?: boolean;
          phase1_deadline?: string | null;
          phase2_locked?: boolean;
          phase2_deadline?: string | null;
          phase3_locked?: boolean;
          phase3_deadline?: string | null;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      wc_teams: {
        Row: {
          id: string;
          name: string;
          group_letter: string;
          external_id: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          group_letter: string;
          external_id?: number | null;
        };
        Update: {
          name?: string;
          group_letter?: string;
          external_id?: number | null;
        };
        Relationships: [];
      };
      wc_matches: {
        Row: {
          id: string;
          external_id: number;
          round: string;
          home_team_id: string | null;
          away_team_id: string | null;
          home_score: number | null;
          away_score: number | null;
          status: string;
          kickoff_at: string;
        };
        Insert: {
          id?: string;
          external_id: number;
          round: string;
          home_team_id?: string | null;
          away_team_id?: string | null;
          home_score?: number | null;
          away_score?: number | null;
          status?: string;
          kickoff_at: string;
        };
        Update: {
          home_score?: number | null;
          away_score?: number | null;
          status?: string;
        };
        Relationships: [];
      };
      group_picks: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          wc_group: string;
          rank1_id: string;
          rank2_id: string;
          rank3_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          wc_group: string;
          rank1_id: string;
          rank2_id: string;
          rank3_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          rank1_id?: string;
          rank2_id?: string;
          rank3_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      best_third_picks: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          team_ids: string[];
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          team_ids?: string[];
          updated_at?: string;
        };
        Update: {
          team_ids?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      knockout_picks: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          match_id: string;
          winner_id: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          match_id: string;
          winner_id: string;
          updated_at?: string;
        };
        Update: {
          winner_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      finals_picks: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          winner_id: string | null;
          runner_up_id: string | null;
          third_id: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          winner_id?: string | null;
          runner_up_id?: string | null;
          third_id?: string | null;
          updated_at?: string;
        };
        Update: {
          winner_id?: string | null;
          runner_up_id?: string | null;
          third_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      bonus_questions: {
        Row: {
          id: string;
          group_id: string;
          question: string;
          type: string;
          options: Json | null;
          difficulty: string;
          correct_answer: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          question: string;
          type: string;
          options?: Json | null;
          difficulty?: string;
          correct_answer?: string | null;
          created_at?: string;
        };
        Update: {
          question?: string;
          type?: string;
          options?: Json | null;
          difficulty?: string;
          correct_answer?: string | null;
        };
        Relationships: [];
      };
      bonus_answers: {
        Row: {
          id: string;
          question_id: string;
          group_id: string;
          user_id: string;
          answer: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          group_id: string;
          user_id: string;
          answer: string;
          created_at?: string;
        };
        Update: {
          answer?: string;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          user_id: string | null;
          message: string;
          page: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          message: string;
          page?: string | null;
          created_at?: string;
        };
        Update: {
          message?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_my_group_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
