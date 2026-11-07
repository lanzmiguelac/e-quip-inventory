export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      access_requests: {
        Row: {
          decision_note: string;
          email: string;
          full_name: string;
          id: string;
          reason: string;
          requested_at: string;
          reviewed_at: string | null;
          reviewer_id: string | null;
          school_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          decision_note?: string;
          email: string;
          full_name: string;
          id?: string;
          reason?: string;
          requested_at?: string;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          school_id: string;
          status?: string;
          user_id: string;
        };
        Update: {
          decision_note?: string;
          email?: string;
          full_name?: string;
          id?: string;
          reason?: string;
          requested_at?: string;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          school_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_requests_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
        };
        Insert: {
          action: string;
          actor_id: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      borrow_requests: {
        Row: {
          borrower_id: string;
          created_at: string;
          due_date: string;
          equipment_id: string;
          id: string;
          purpose: string;
          reference: number;
          rejection_reason: string | null;
          requested_date: string;
          reviewed_at: string | null;
          reviewer_id: string | null;
          status: string;
        };
        Insert: {
          borrower_id: string;
          created_at?: string;
          due_date: string;
          equipment_id: string;
          id?: string;
          purpose: string;
          reference?: never;
          rejection_reason?: string | null;
          requested_date: string;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          status?: string;
        };
        Update: {
          borrower_id?: string;
          created_at?: string;
          due_date?: string;
          equipment_id?: string;
          id?: string;
          purpose?: string;
          reference?: never;
          rejection_reason?: string | null;
          requested_date?: string;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "borrow_requests_borrower_id_fkey";
            columns: ["borrower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "borrow_requests_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "borrow_requests_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      equipment: {
        Row: {
          archived_at: string | null;
          asset_number: string;
          category: string;
          condition: string;
          created_at: string;
          id: string;
          location: string;
          name: string;
          operational_state: string;
          photo_path: string | null;
          remarks: string;
          serial_number: string;
        };
        Insert: {
          archived_at?: string | null;
          asset_number: string;
          category?: string;
          condition?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name: string;
          operational_state?: string;
          photo_path?: string | null;
          remarks?: string;
          serial_number?: string;
        };
        Update: {
          archived_at?: string | null;
          asset_number?: string;
          category?: string;
          condition?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          operational_state?: string;
          photo_path?: string | null;
          remarks?: string;
          serial_number?: string;
        };
        Relationships: [];
      };
      loans: {
        Row: {
          borrower_id: string;
          due_date: string;
          equipment_id: string;
          id: string;
          received_by: string | null;
          release_accessories: string;
          release_condition: string;
          released_at: string;
          released_by: string;
          request_id: string;
          return_accessories: string;
          return_condition: string | null;
          returned_at: string | null;
        };
        Insert: {
          borrower_id: string;
          due_date: string;
          equipment_id: string;
          id?: string;
          received_by?: string | null;
          release_accessories?: string;
          release_condition: string;
          released_at?: string;
          released_by: string;
          request_id: string;
          return_accessories?: string;
          return_condition?: string | null;
          returned_at?: string | null;
        };
        Update: {
          borrower_id?: string;
          due_date?: string;
          equipment_id?: string;
          id?: string;
          received_by?: string | null;
          release_accessories?: string;
          release_condition?: string;
          released_at?: string;
          released_by?: string;
          request_id?: string;
          return_accessories?: string;
          return_condition?: string | null;
          returned_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "loans_borrower_id_fkey";
            columns: ["borrower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loans_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loans_received_by_fkey";
            columns: ["received_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loans_released_by_fkey";
            columns: ["released_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loans_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: true;
            referencedRelation: "borrow_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_records: {
        Row: {
          completed_at: string | null;
          cost: number;
          created_at: string;
          equipment_id: string;
          id: string;
          incident: string;
          loan_id: string | null;
          reported_by: string;
          resolution: string;
          status: string;
        };
        Insert: {
          completed_at?: string | null;
          cost?: number;
          created_at?: string;
          equipment_id: string;
          id?: string;
          incident: string;
          loan_id?: string | null;
          reported_by: string;
          resolution?: string;
          status?: string;
        };
        Update: {
          completed_at?: string | null;
          cost?: number;
          created_at?: string;
          equipment_id?: string;
          id?: string;
          incident?: string;
          loan_id?: string | null;
          reported_by?: string;
          resolution?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_records_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_loan_id_fkey";
            columns: ["loan_id"];
            isOneToOne: false;
            referencedRelation: "loans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          read_at: string | null;
          recipient_id: string;
          request_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          read_at?: string | null;
          recipient_id: string;
          request_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          read_at?: string | null;
          recipient_id?: string;
          request_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "borrow_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_active: boolean;
          role: string;
          school_id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          is_active?: boolean;
          role?: string;
          school_id?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          role?: string;
          school_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      access_request_status: { Args: never; Returns: Json };
      archive_equipment: { Args: { p_id: string }; Returns: undefined };
      decide_request: {
        Args: { p_decision: string; p_id: string; p_reason?: string };
        Returns: undefined;
      };
      equipment_catalog: { Args: never; Returns: Json };
      list_access_requests: { Args: never; Returns: Json };
      manage_profile: {
        Args: { p_active: boolean; p_id: string; p_role: string };
        Returns: undefined;
      };
      read_notifications: { Args: { p_id?: string }; Returns: undefined };
      record_incident: {
        Args: { p_cost?: number; p_equipment: string; p_incident: string };
        Returns: string;
      };
      release_equipment: {
        Args: {
          p_accessories?: string;
          p_condition: string;
          p_request: string;
        };
        Returns: string;
      };
      resolve_maintenance: {
        Args: {
          p_condition: string;
          p_cost?: number;
          p_id: string;
          p_resolution: string;
        };
        Returns: undefined;
      };
      return_equipment: {
        Args: {
          p_accessories?: string;
          p_condition: string;
          p_incident?: string;
          p_loan: string;
        };
        Returns: undefined;
      };
      review_access_request: {
        Args: { p_decision: string; p_id: string; p_note?: string };
        Returns: undefined;
      };
      save_equipment: { Args: { p_data: Json; p_id: string }; Returns: string };
      school_today: { Args: never; Returns: string };
      start_repair: { Args: { p_id: string }; Returns: undefined };
      submit_access_request: {
        Args: { p_full_name: string; p_reason?: string; p_school_id: string };
        Returns: string;
      };
      submit_request: {
        Args: {
          p_due: string;
          p_equipment: string;
          p_purpose: string;
          p_start: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
