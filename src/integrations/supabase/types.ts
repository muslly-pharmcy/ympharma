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
      activity_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      alert_dedupe: {
        Row: {
          alert_key: string
          count: number
          last_sent_at: string
        }
        Insert: {
          alert_key: string
          count?: number
          last_sent_at?: string
        }
        Update: {
          alert_key?: string
          count?: number
          last_sent_at?: string
        }
        Relationships: []
      }
      backups: {
        Row: {
          created_at: string
          id: string
          kind: string
          orders_count: number
          payload: Json
          rx_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          orders_count?: number
          payload: Json
          rx_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          orders_count?: number
          payload?: Json
          rx_count?: number
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          country: string | null
          extra: Json | null
          id: string
          level: string
          message: string
          occurred_at: string
          source: string
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          country?: string | null
          extra?: Json | null
          id?: string
          level?: string
          message: string
          occurred_at?: string
          source: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          country?: string | null
          extra?: Json | null
          id?: string
          level?: string
          message?: string
          occurred_at?: string
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      error_logs_archive: {
        Row: {
          archived_at: string
          country: string | null
          extra: Json | null
          id: string
          level: string
          message: string
          occurred_at: string
          source: string
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string
          country?: string | null
          extra?: Json | null
          id?: string
          level?: string
          message: string
          occurred_at?: string
          source: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string
          country?: string | null
          extra?: Json | null
          id?: string
          level?: string
          message?: string
          occurred_at?: string
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      insurance_claims: {
        Row: {
          card_expiry: string | null
          card_image_url: string | null
          channel: string
          created_at: string
          diagnosis: string | null
          id: string
          insurance_company: string
          insurance_number: string
          is_stamped: boolean | null
          patient_name: string
          patient_phone: string
          prescription_date: string | null
          prescription_image_url: string | null
          staff_notes: string | null
          status: string
          updated_at: string
          validation_notes: string | null
        }
        Insert: {
          card_expiry?: string | null
          card_image_url?: string | null
          channel?: string
          created_at?: string
          diagnosis?: string | null
          id?: string
          insurance_company?: string
          insurance_number: string
          is_stamped?: boolean | null
          patient_name: string
          patient_phone: string
          prescription_date?: string | null
          prescription_image_url?: string | null
          staff_notes?: string | null
          status?: string
          updated_at?: string
          validation_notes?: string | null
        }
        Update: {
          card_expiry?: string | null
          card_image_url?: string | null
          channel?: string
          created_at?: string
          diagnosis?: string | null
          id?: string
          insurance_company?: string
          insurance_number?: string
          is_stamped?: boolean | null
          patient_name?: string
          patient_phone?: string
          prescription_date?: string | null
          prescription_image_url?: string | null
          staff_notes?: string | null
          status?: string
          updated_at?: string
          validation_notes?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          created_at: string
          description: string | null
          discount_percent: number | null
          ends_at: string | null
          id: string
          is_active: boolean
          product_id: string | null
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          product_id?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          product_id?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          id: string
          items: Json
          notes: string | null
          status: string
          total: number
        }
        Insert: {
          created_at?: string
          customer_address: string
          customer_name: string
          customer_phone: string
          id: string
          items?: Json
          notes?: string | null
          status?: string
          total?: number
        }
        Update: {
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          items?: Json
          notes?: string | null
          status?: string
          total?: number
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          id: string
          image_urls: string[]
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          customer_address: string
          customer_name: string
          customer_phone: string
          id: string
          image_urls?: string[]
          notes?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          image_urls?: string[]
          notes?: string | null
          status?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          badge: string | null
          brand: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_published: boolean
          legacy_id: number | null
          name: string
          old_price: number | null
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge?: string | null
          brand?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          legacy_id?: number | null
          name: string
          old_price?: number | null
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge?: string | null
          brand?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          legacy_id?: number | null
          name?: string
          old_price?: number | null
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      trust_pages: {
        Row: {
          contact: string
          cookies: string
          data_collection: string
          encryption: string
          incident_reporting: string
          intro: string
          retention: string
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact?: string
          cookies?: string
          data_collection?: string
          encryption?: string
          incident_reporting?: string
          intro?: string
          retention?: string
          slug: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact?: string
          cookies?: string
          data_collection?: string
          encryption?: string
          incident_reporting?: string
          intro?: string
          retention?: string
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      uptime_checks: {
        Row: {
          checked_at: string
          error: string | null
          id: string
          latency_ms: number | null
          ok: boolean
          region: string | null
        }
        Insert: {
          checked_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          ok: boolean
          region?: string | null
        }
        Update: {
          checked_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          ok?: boolean
          region?: string | null
        }
        Relationships: []
      }
      uptime_incidents: {
        Row: {
          created_at: string
          details: Json | null
          ended_at: string | null
          id: string
          severity: string
          started_at: string
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          ended_at?: string | null
          id?: string
          severity?: string
          started_at?: string
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          ended_at?: string | null
          id?: string
          severity?: string
          started_at?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      uptime_incidents_archive: {
        Row: {
          archived_at: string
          created_at: string
          details: Json | null
          ended_at: string | null
          id: string
          severity: string
          started_at: string
          summary: string
          updated_at: string
        }
        Insert: {
          archived_at?: string
          created_at?: string
          details?: Json | null
          ended_at?: string | null
          id?: string
          severity?: string
          started_at?: string
          summary: string
          updated_at?: string
        }
        Update: {
          archived_at?: string
          created_at?: string
          details?: Json | null
          ended_at?: string | null
          id?: string
          severity?: string
          started_at?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_stats: { Args: never; Returns: Json }
      bootstrap_owner: { Args: never; Returns: boolean }
      create_backup: { Args: { _kind?: string }; Returns: string }
      create_scheduled_backup: { Args: { _kind: string }; Returns: string }
      get_order_history_public: {
        Args: { _id: string }
        Returns: {
          created_at: string
          note: string
          status: string
        }[]
      }
      get_order_public: {
        Args: { _id: string }
        Returns: {
          created_at: string
          customer_name: string
          id: string
          items: Json
          status: string
          total: number
        }[]
      }
      has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_activity: {
        Args: {
          _action: string
          _details?: Json
          _entity_id?: string
          _entity_type?: string
        }
        Returns: string
      }
      run_retention_policy: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user" | "owner"
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
    Enums: {
      app_role: ["admin", "user", "owner"],
    },
  },
} as const
