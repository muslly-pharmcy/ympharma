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
      agent_actions: {
        Row: {
          action_type: string
          agent_name: string
          approved_at: string | null
          approved_by: string | null
          compiled_arabic_output: string | null
          correlation_id: string | null
          created_at: string
          error_message: string | null
          executed_at: string | null
          execution_status:
            | Database["public"]["Enums"]["action_execution_status"]
            | null
          id: string
          originating_agent:
            | Database["public"]["Enums"]["valid_agent_modes"]
            | null
          payload: Json
          priority_level: string | null
          recommendation_id: string | null
          result: Json | null
          status: string
          target_pipeline:
            | Database["public"]["Enums"]["action_target_pipeline"]
            | null
          updated_at: string
          updated_by_admin: string | null
        }
        Insert: {
          action_type: string
          agent_name: string
          approved_at?: string | null
          approved_by?: string | null
          compiled_arabic_output?: string | null
          correlation_id?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          execution_status?:
            | Database["public"]["Enums"]["action_execution_status"]
            | null
          id?: string
          originating_agent?:
            | Database["public"]["Enums"]["valid_agent_modes"]
            | null
          payload?: Json
          priority_level?: string | null
          recommendation_id?: string | null
          result?: Json | null
          status?: string
          target_pipeline?:
            | Database["public"]["Enums"]["action_target_pipeline"]
            | null
          updated_at?: string
          updated_by_admin?: string | null
        }
        Update: {
          action_type?: string
          agent_name?: string
          approved_at?: string | null
          approved_by?: string | null
          compiled_arabic_output?: string | null
          correlation_id?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          execution_status?:
            | Database["public"]["Enums"]["action_execution_status"]
            | null
          id?: string
          originating_agent?:
            | Database["public"]["Enums"]["valid_agent_modes"]
            | null
          payload?: Json
          priority_level?: string | null
          recommendation_id?: string | null
          result?: Json | null
          status?: string
          target_pipeline?:
            | Database["public"]["Enums"]["action_target_pipeline"]
            | null
          updated_at?: string
          updated_by_admin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "agent_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_approval_requests: {
        Row: {
          action_type: string
          agent_id: string
          ai_analysis: Json | null
          ai_analyzed_at: string | null
          ai_confidence: number | null
          ai_risk_score: number | null
          conversation_id: string | null
          correlation_id: string | null
          created_at: string
          customer_message: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          extracted_medicines: Json | null
          id: string
          is_valid: boolean | null
          missing_medicines: string[] | null
          payload: Json
          pharmacist_notes: string | null
          status: string
          updated_at: string
          user_phone: string | null
        }
        Insert: {
          action_type: string
          agent_id?: string
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_confidence?: number | null
          ai_risk_score?: number | null
          conversation_id?: string | null
          correlation_id?: string | null
          created_at?: string
          customer_message?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          extracted_medicines?: Json | null
          id?: string
          is_valid?: boolean | null
          missing_medicines?: string[] | null
          payload?: Json
          pharmacist_notes?: string | null
          status?: string
          updated_at?: string
          user_phone?: string | null
        }
        Update: {
          action_type?: string
          agent_id?: string
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_confidence?: number | null
          ai_risk_score?: number | null
          conversation_id?: string | null
          correlation_id?: string | null
          created_at?: string
          customer_message?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          extracted_medicines?: Json | null
          id?: string
          is_valid?: boolean | null
          missing_medicines?: string[] | null
          payload?: Json
          pharmacist_notes?: string | null
          status?: string
          updated_at?: string
          user_phone?: string | null
        }
        Relationships: []
      }
      agent_decisions: {
        Row: {
          confidence_score: number | null
          context_ms: number | null
          context_snapshot: Json | null
          created_at: string
          decision_factors: Json | null
          decision_ms: number | null
          decision_summary: string | null
          expires_at: string
          fallback_reason: string | null
          fallback_used: boolean
          generation_ms: number | null
          id: number
          platform: string
          post_id: string | null
          product_breakdown: Json | null
          product_id: string | null
          product_score: number | null
          ranking_ms: number | null
          total_ms: number | null
          variants: Json
          winner_variant_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          context_ms?: number | null
          context_snapshot?: Json | null
          created_at?: string
          decision_factors?: Json | null
          decision_ms?: number | null
          decision_summary?: string | null
          expires_at?: string
          fallback_reason?: string | null
          fallback_used?: boolean
          generation_ms?: number | null
          id?: number
          platform: string
          post_id?: string | null
          product_breakdown?: Json | null
          product_id?: string | null
          product_score?: number | null
          ranking_ms?: number | null
          total_ms?: number | null
          variants?: Json
          winner_variant_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          context_ms?: number | null
          context_snapshot?: Json | null
          created_at?: string
          decision_factors?: Json | null
          decision_ms?: number | null
          decision_summary?: string | null
          expires_at?: string
          fallback_reason?: string | null
          fallback_used?: boolean
          generation_ms?: number | null
          id?: number
          platform?: string
          post_id?: string | null
          product_breakdown?: Json | null
          product_id?: string | null
          product_score?: number | null
          ranking_ms?: number | null
          total_ms?: number | null
          variants?: Json
          winner_variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_decisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_events: {
        Row: {
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_name: string
          id: string
          last_error: string | null
          occurred_at: string
          payload: Json
          processed_at: string | null
          processed_by: string | null
          retry_count: number
          source: string
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_name: string
          id?: string
          last_error?: string | null
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          processed_by?: string | null
          retry_count?: number
          source?: string
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_name?: string
          id?: string
          last_error?: string | null
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          processed_by?: string | null
          retry_count?: number
          source?: string
        }
        Relationships: []
      }
      agent_events_dlq: {
        Row: {
          correlation_id: string | null
          entity_id: string | null
          entity_type: string | null
          event_name: string
          failed_at: string
          id: string
          last_error: string | null
          occurred_at: string
          original_id: string
          payload: Json
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number
          source: string
        }
        Insert: {
          correlation_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_name: string
          failed_at?: string
          id?: string
          last_error?: string | null
          occurred_at: string
          original_id: string
          payload?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count: number
          source?: string
        }
        Update: {
          correlation_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_name?: string
          failed_at?: string
          id?: string
          last_error?: string | null
          occurred_at?: string
          original_id?: string
          payload?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number
          source?: string
        }
        Relationships: []
      }
      agent_feedback_events: {
        Row: {
          comments: number
          expires_at: string
          external_id: string | null
          id: number
          likes: number
          platform: string
          post_id: string | null
          raw_payload: Json | null
          received_at: string
          shares: number
          views: number
        }
        Insert: {
          comments?: number
          expires_at?: string
          external_id?: string | null
          id?: number
          likes?: number
          platform: string
          post_id?: string | null
          raw_payload?: Json | null
          received_at?: string
          shares?: number
          views?: number
        }
        Update: {
          comments?: number
          expires_at?: string
          external_id?: string | null
          id?: number
          likes?: number
          platform?: string
          post_id?: string | null
          raw_payload?: Json | null
          received_at?: string
          shares?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_feedback_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_kpis: {
        Row: {
          agent_name: string
          as_of: string
          created_at: string
          details: Json
          id: string
          metric: string
          score: number | null
        }
        Insert: {
          agent_name: string
          as_of?: string
          created_at?: string
          details?: Json
          id?: string
          metric: string
          score?: number | null
        }
        Update: {
          agent_name?: string
          as_of?: string
          created_at?: string
          details?: Json
          id?: string
          metric?: string
          score?: number | null
        }
        Relationships: []
      }
      agent_performance_insights: {
        Row: {
          avg_engagement: number | null
          computed_at: string
          id: number
          notes: string | null
          platform: string | null
          recommendations: Json
          sample_size: number
          top_tone: string | null
          top_variant_id: string | null
          window_days: number
        }
        Insert: {
          avg_engagement?: number | null
          computed_at?: string
          id?: number
          notes?: string | null
          platform?: string | null
          recommendations?: Json
          sample_size: number
          top_tone?: string | null
          top_variant_id?: string | null
          window_days?: number
        }
        Update: {
          avg_engagement?: number | null
          computed_at?: string
          id?: number
          notes?: string | null
          platform?: string | null
          recommendations?: Json
          sample_size?: number
          top_tone?: string | null
          top_variant_id?: string | null
          window_days?: number
        }
        Relationships: []
      }
      agent_recommendations: {
        Row: {
          agent_name: string
          category: string
          confidence: number | null
          created_at: string
          dedupe_key: string
          id: string
          impact_estimate: number | null
          payload: Json
          rationale: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_name: string
          category: string
          confidence?: number | null
          created_at?: string
          dedupe_key?: string
          id?: string
          impact_estimate?: number | null
          payload?: Json
          rationale?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_name?: string
          category?: string
          confidence?: number | null
          created_at?: string
          dedupe_key?: string
          id?: string
          impact_estimate?: number | null
          payload?: Json
          rationale?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent: Database["public"]["Enums"]["valid_agent_modes"]
          confidence: number | null
          correlation_id: string | null
          created_at: string
          details: Json
          execution_time_ms: number | null
          findings_count: number | null
          finished_at: string | null
          id: string
          impact_estimate: number | null
          kind: string
          recommendations_count: number | null
          started_at: string
          status: string
          summary: string | null
        }
        Insert: {
          agent: Database["public"]["Enums"]["valid_agent_modes"]
          confidence?: number | null
          correlation_id?: string | null
          created_at?: string
          details?: Json
          execution_time_ms?: number | null
          findings_count?: number | null
          finished_at?: string | null
          id?: string
          impact_estimate?: number | null
          kind: string
          recommendations_count?: number | null
          started_at?: string
          status?: string
          summary?: string | null
        }
        Update: {
          agent?: Database["public"]["Enums"]["valid_agent_modes"]
          confidence?: number | null
          correlation_id?: string | null
          created_at?: string
          details?: Json
          execution_time_ms?: number | null
          findings_count?: number | null
          finished_at?: string | null
          id?: string
          impact_estimate?: number | null
          kind?: string
          recommendations_count?: number | null
          started_at?: string
          status?: string
          summary?: string | null
        }
        Relationships: []
      }
      agent_weights: {
        Row: {
          created_at: string
          criterion: string
          description: string | null
          id: number
          updated_at: string
          updated_by: string | null
          weight: number
        }
        Insert: {
          created_at?: string
          criterion: string
          description?: string | null
          id?: number
          updated_at?: string
          updated_by?: string | null
          weight: number
        }
        Update: {
          created_at?: string
          criterion?: string
          description?: string | null
          id?: number
          updated_at?: string
          updated_by?: string | null
          weight?: number
        }
        Relationships: []
      }
      ai_safety_logs: {
        Row: {
          context: string | null
          created_at: string
          details: Json
          id: string
          kind: string
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          details?: Json
          id?: string
          kind: string
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          details?: Json
          id?: string
          kind?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_tool_events: {
        Row: {
          agent_id: string
          conversation_id: string | null
          correlation_id: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input: Json
          output_summary: Json
          status: string
          tool_name: string
          user_phone: string | null
        }
        Insert: {
          agent_id?: string
          conversation_id?: string | null
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json
          output_summary?: Json
          status?: string
          tool_name: string
          user_phone?: string | null
        }
        Update: {
          agent_id?: string
          conversation_id?: string | null
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json
          output_summary?: Json
          status?: string
          tool_name?: string
          user_phone?: string | null
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
      alert_settings: {
        Row: {
          enable_email: boolean
          enable_errors: boolean
          enable_growth: boolean
          enable_overdue: boolean
          enable_slack: boolean
          enable_sms: boolean
          enable_uptime: boolean
          enable_whatsapp: boolean
          errors_threshold: number
          growth_threshold_pct: number
          id: number
          overdue_orders_threshold: number
          updated_at: string
          updated_by: string | null
          uptime_threshold_pct: number
        }
        Insert: {
          enable_email?: boolean
          enable_errors?: boolean
          enable_growth?: boolean
          enable_overdue?: boolean
          enable_slack?: boolean
          enable_sms?: boolean
          enable_uptime?: boolean
          enable_whatsapp?: boolean
          errors_threshold?: number
          growth_threshold_pct?: number
          id?: number
          overdue_orders_threshold?: number
          updated_at?: string
          updated_by?: string | null
          uptime_threshold_pct?: number
        }
        Update: {
          enable_email?: boolean
          enable_errors?: boolean
          enable_growth?: boolean
          enable_overdue?: boolean
          enable_slack?: boolean
          enable_sms?: boolean
          enable_uptime?: boolean
          enable_whatsapp?: boolean
          errors_threshold?: number
          growth_threshold_pct?: number
          id?: number
          overdue_orders_threshold?: number
          updated_at?: string
          updated_by?: string | null
          uptime_threshold_pct?: number
        }
        Relationships: []
      }
      alert_subscribers: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          min_severity: string
          phone_e164: string
          receive_sms: boolean
          receive_whatsapp: boolean
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          min_severity?: string
          phone_e164: string
          receive_sms?: boolean
          receive_whatsapp?: boolean
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          min_severity?: string
          phone_e164?: string
          receive_sms?: boolean
          receive_whatsapp?: boolean
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      backup_verification_runs: {
        Row: {
          checked: number
          correlation_id: string | null
          created_at: string
          failed: number
          freshness_ok: boolean
          id: string
          passed: number
          ran_at: string
          results: Json
          source: string
        }
        Insert: {
          checked?: number
          correlation_id?: string | null
          created_at?: string
          failed?: number
          freshness_ok?: boolean
          id?: string
          passed?: number
          ran_at?: string
          results?: Json
          source?: string
        }
        Update: {
          checked?: number
          correlation_id?: string | null
          created_at?: string
          failed?: number
          freshness_ok?: boolean
          id?: string
          passed?: number
          ran_at?: string
          results?: Json
          source?: string
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
      branch_inventory: {
        Row: {
          branch_id: string
          id: string
          product_id: string
          qty: number
          reorder_point: number
          reserved_qty: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          id?: string
          product_id: string
          qty?: number
          reorder_point?: number
          reserved_qty?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          id?: string
          product_id?: string
          qty?: number
          reorder_point?: number
          reserved_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_user_assignments: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["branch_role"]
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["branch_role"]
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["branch_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_user_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          manager_user_id: string | null
          metadata: Json
          name: string
          phone: string | null
          type: Database["public"]["Enums"]["branch_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_user_id?: string | null
          metadata?: Json
          name: string
          phone?: string | null
          type: Database["public"]["Enums"]["branch_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_user_id?: string | null
          metadata?: Json
          name?: string
          phone?: string | null
          type?: Database["public"]["Enums"]["branch_type"]
          updated_at?: string
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          created_at: string
          id: string
          product_legacy_id: number
          qty: number
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          product_legacy_id: number
          qty?: number
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          product_legacy_id?: number
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          created_at: string
          description: string | null
          discount_percent: number
          fixed_price: number | null
          id: string
          image_url: string | null
          is_active: boolean
          kind: string
          name: string
          revenue: number
          sales_count: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percent?: number
          fixed_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          name: string
          revenue?: number
          sales_count?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percent?: number
          fixed_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          name?: string
          revenue?: number
          sales_count?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          banner_id: string | null
          condition_tag: string | null
          created_at: string
          description: string | null
          discount_code: string | null
          eligible_count: number
          id: string
          is_active: boolean
          name: string
          redemptions_count: number
          revenue: number
          slug: string
          updated_at: string
        }
        Insert: {
          banner_id?: string | null
          condition_tag?: string | null
          created_at?: string
          description?: string | null
          discount_code?: string | null
          eligible_count?: number
          id?: string
          is_active?: boolean
          name: string
          redemptions_count?: number
          revenue?: number
          slug: string
          updated_at?: string
        }
        Update: {
          banner_id?: string | null
          condition_tag?: string | null
          created_at?: string
          description?: string | null
          discount_code?: string | null
          eligible_count?: number
          id?: string
          is_active?: boolean
          name?: string
          redemptions_count?: number
          revenue?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "marketing_banners"
            referencedColumns: ["id"]
          },
        ]
      }
      confidence_calibration_log: {
        Row: {
          computed_at: string
          correlation: number | null
          drift: number | null
          id: number
          mean_confidence: number | null
          mean_engagement: number | null
          notes: string | null
          sample_size: number
          severity: string
          window_days: number
        }
        Insert: {
          computed_at?: string
          correlation?: number | null
          drift?: number | null
          id?: number
          mean_confidence?: number | null
          mean_engagement?: number | null
          notes?: string | null
          sample_size: number
          severity?: string
          window_days?: number
        }
        Update: {
          computed_at?: string
          correlation?: number | null
          drift?: number | null
          id?: number
          mean_confidence?: number | null
          mean_engagement?: number | null
          notes?: string | null
          sample_size?: number
          severity?: string
          window_days?: number
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          message: string
          name: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          message: string
          name: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          message?: string
          name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      customer_channels: {
        Row: {
          channel: string
          created_at: string
          customer_id: string
          handle: string
          id: string
          phone_number: string | null
          preferences: Json
          updated_at: string
          verified: boolean
        }
        Insert: {
          channel: string
          created_at?: string
          customer_id: string
          handle: string
          id?: string
          phone_number?: string | null
          preferences?: Json
          updated_at?: string
          verified?: boolean
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string
          handle?: string
          id?: string
          phone_number?: string | null
          preferences?: Json
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      customer_notification_preferences: {
        Row: {
          created_at: string
          last_opt_in_at: string | null
          last_opt_out_at: string | null
          opt_out_token: string
          phone: string
          prescription_notifications_enabled: boolean
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          created_at?: string
          last_opt_in_at?: string | null
          last_opt_out_at?: string | null
          opt_out_token?: string
          phone: string
          prescription_notifications_enabled?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          created_at?: string
          last_opt_in_at?: string | null
          last_opt_out_at?: string | null
          opt_out_token?: string
          phone?: string
          prescription_notifications_enabled?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          ai_insight: string | null
          ai_insight_at: string | null
          avg_order_value: number
          cancelled_count: number
          chronic_flags: Json
          days_between_orders: number | null
          dominant_category: string | null
          first_seen: string
          last_order_at: string | null
          name: string | null
          orders_count: number
          phone: string
          top_categories: Json
          total_spent: number
          updated_at: string
        }
        Insert: {
          ai_insight?: string | null
          ai_insight_at?: string | null
          avg_order_value?: number
          cancelled_count?: number
          chronic_flags?: Json
          days_between_orders?: number | null
          dominant_category?: string | null
          first_seen?: string
          last_order_at?: string | null
          name?: string | null
          orders_count?: number
          phone: string
          top_categories?: Json
          total_spent?: number
          updated_at?: string
        }
        Update: {
          ai_insight?: string | null
          ai_insight_at?: string | null
          avg_order_value?: number
          cancelled_count?: number
          chronic_flags?: Json
          days_between_orders?: number | null
          dominant_category?: string | null
          first_seen?: string
          last_order_at?: string | null
          name?: string | null
          orders_count?: number
          phone?: string
          top_categories?: Json
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_scores: {
        Row: {
          computed_at: string
          health_score: number
          phone: string
          risk_score: number
          segment: string
          value_score: number
        }
        Insert: {
          computed_at?: string
          health_score?: number
          phone: string
          risk_score?: number
          segment?: string
          value_score?: number
        }
        Update: {
          computed_at?: string
          health_score?: number
          phone?: string
          risk_score?: number
          segment?: string
          value_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_scores_phone_fkey"
            columns: ["phone"]
            isOneToOne: true
            referencedRelation: "customer_profiles"
            referencedColumns: ["phone"]
          },
        ]
      }
      discount_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          first_order_only: boolean
          id: string
          kind: string
          max_uses: number | null
          min_total: number
          starts_at: string
          uses: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          kind: string
          max_uses?: number | null
          min_total?: number
          starts_at?: string
          uses?: number
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          kind?: string
          max_uses?: number | null
          min_total?: number
          starts_at?: string
          uses?: number
          value?: number
        }
        Relationships: []
      }
      discount_redemptions: {
        Row: {
          amount_off: number
          code_id: string
          customer_phone: string
          id: string
          order_id: string
          redeemed_at: string
        }
        Insert: {
          amount_off?: number
          code_id: string
          customer_phone: string
          id?: string
          order_id: string
          redeemed_at?: string
        }
        Update: {
          amount_off?: number
          code_id?: string
          customer_phone?: string
          id?: string
          order_id?: string
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          payload: Json
          recipient_email: string
          ref_id: string | null
          ref_kind: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          payload?: Json
          recipient_email: string
          ref_id?: string | null
          ref_kind?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          payload?: Json
          recipient_email?: string
          ref_id?: string | null
          ref_kind?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_name?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
      event_consumer_schedule_log: {
        Row: {
          action: string
          actor_user_id: string | null
          batch: number | null
          correlation_id: string
          created_at: string
          error: string | null
          id: string
          job_id: number | null
          job_name: string | null
          schedule: string | null
          status: string
          url: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          batch?: number | null
          correlation_id: string
          created_at?: string
          error?: string | null
          id?: string
          job_id?: number | null
          job_name?: string | null
          schedule?: string | null
          status: string
          url?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          batch?: number | null
          correlation_id?: string
          created_at?: string
          error?: string | null
          id?: string
          job_id?: number | null
          job_name?: string | null
          schedule?: string | null
          status?: string
          url?: string | null
        }
        Relationships: []
      }
      executive_reports: {
        Row: {
          created_at: string
          day: string
          id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          payload: Json
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      health_checks: {
        Row: {
          created_at: string
          details: Json
          duration: number | null
          failed: number
          id: string
          passed: number
          status: string
          total: number
          warnings: number
        }
        Insert: {
          created_at?: string
          details?: Json
          duration?: number | null
          failed?: number
          id?: string
          passed?: number
          status: string
          total?: number
          warnings?: number
        }
        Update: {
          created_at?: string
          details?: Json
          duration?: number | null
          failed?: number
          id?: string
          passed?: number
          status?: string
          total?: number
          warnings?: number
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          key: string
          request_hash: string | null
          response_body: Json | null
          response_status: number | null
          scope: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          key: string
          request_hash?: string | null
          response_body?: Json | null
          response_status?: number | null
          scope: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          key?: string
          request_hash?: string | null
          response_body?: Json | null
          response_status?: number | null
          scope?: string
        }
        Relationships: []
      }
      img_proxy_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          host: string | null
          id: number
          ok: boolean
          status: number
          url: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          host?: string | null
          id?: number
          ok: boolean
          status: number
          url: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          host?: string | null
          id?: number
          ok?: boolean
          status?: number
          url?: string
        }
        Relationships: []
      }
      img_proxy_settings: {
        Row: {
          allowed_hosts: string[]
          id: number
          image_domain: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_hosts?: string[]
          id?: number
          image_domain?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_hosts?: string[]
          id?: number
          image_domain?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      img_rate_limit: {
        Row: {
          count: number
          ip: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          ip: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          ip?: string
          updated_at?: string
          window_start?: string
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
      inventory_alerts: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          message: string | null
          product_id: string | null
          resolved: boolean
          resolved_at: string | null
          severity: string
          type: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          product_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          type: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          product_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audit_log: {
        Row: {
          action: string
          actor: string | null
          correlation_id: string | null
          created_at: string
          id: string
          order_id: string
          payload: Json
          reason: string | null
          status: string
        }
        Insert: {
          action: string
          actor?: string | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          payload?: Json
          reason?: string | null
          status: string
        }
        Update: {
          action?: string
          actor?: string | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          payload?: Json
          reason?: string | null
          status?: string
        }
        Relationships: []
      }
      inventory_manual_adjustments: {
        Row: {
          after_qty: number
          before_qty: number
          created_at: string
          db_user: string | null
          delta: number
          id: string
          performed_by: string | null
          product_id: string
          reason: string | null
          source: string
        }
        Insert: {
          after_qty: number
          before_qty: number
          created_at?: string
          db_user?: string | null
          delta: number
          id?: string
          performed_by?: string | null
          product_id: string
          reason?: string | null
          source?: string
        }
        Update: {
          after_qty?: number
          before_qty?: number
          created_at?: string
          db_user?: string | null
          delta?: number
          id?: string
          performed_by?: string | null
          product_id?: string
          reason?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_manual_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservation_state: {
        Row: {
          correlation_id: string | null
          order_id: string
          released_at: string | null
          reserved_at: string | null
          state: string
          updated_at: string
        }
        Insert: {
          correlation_id?: string | null
          order_id: string
          released_at?: string | null
          reserved_at?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          correlation_id?: string | null
          order_id?: string
          released_at?: string | null
          reserved_at?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_inv_res_state_order"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_shadow_log: {
        Row: {
          branch_code: string | null
          branch_id: string | null
          branch_stock: number | null
          created_at: string
          id: string
          legacy_id: number | null
          legacy_stock: number | null
          note: string | null
          order_id: string | null
          product_id: string | null
          requested_qty: number
          shortfall: number | null
          would_succeed: boolean
        }
        Insert: {
          branch_code?: string | null
          branch_id?: string | null
          branch_stock?: number | null
          created_at?: string
          id?: string
          legacy_id?: number | null
          legacy_stock?: number | null
          note?: string | null
          order_id?: string | null
          product_id?: string | null
          requested_qty: number
          shortfall?: number | null
          would_succeed: boolean
        }
        Update: {
          branch_code?: string | null
          branch_id?: string | null
          branch_stock?: number | null
          created_at?: string
          id?: string
          legacy_id?: number | null
          legacy_stock?: number | null
          note?: string | null
          order_id?: string | null
          product_id?: string | null
          requested_qty?: number
          shortfall?: number | null
          would_succeed?: boolean
        }
        Relationships: []
      }
      inventory_sync_logs: {
        Row: {
          actor_id: string | null
          completed_at: string | null
          errors: string[]
          hidden: number
          id: string
          inserted: number
          metadata: Json
          republished: number
          started_at: string
          status: string
          total_products: number
          updated: number
        }
        Insert: {
          actor_id?: string | null
          completed_at?: string | null
          errors?: string[]
          hidden?: number
          id?: string
          inserted?: number
          metadata?: Json
          republished?: number
          started_at?: string
          status: string
          total_products?: number
          updated?: number
        }
        Update: {
          actor_id?: string | null
          completed_at?: string | null
          errors?: string[]
          hidden?: number
          id?: string
          inserted?: number
          metadata?: Json
          republished?: number
          started_at?: string
          status?: string
          total_products?: number
          updated?: number
        }
        Relationships: []
      }
      inventory_transfers: {
        Row: {
          approved_by: string | null
          correlation_id: string
          created_at: string
          destination_branch_id: string | null
          id: string
          metadata: Json
          notes: string | null
          reason: string | null
          requested_by: string | null
          source_branch_id: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          transfer_type: Database["public"]["Enums"]["transfer_type"]
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          correlation_id: string
          created_at?: string
          destination_branch_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          reason?: string | null
          requested_by?: string | null
          source_branch_id?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          transfer_type: Database["public"]["Enums"]["transfer_type"]
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          correlation_id?: string
          created_at?: string
          destination_branch_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          reason?: string | null
          requested_by?: string | null
          source_branch_id?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          transfer_type?: Database["public"]["Enums"]["transfer_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_destination_branch_id_fkey"
            columns: ["destination_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_source_branch_id_fkey"
            columns: ["source_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          html_content: string
          id: string
          invoice_number: string
          order_id: string | null
          paid_at: string | null
          sent_at: string | null
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          html_content: string
          id?: string
          invoice_number: string
          order_id?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          invoice_number?: string
          order_id?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_accounts: {
        Row: {
          created_at: string
          id: string
          phone_number: string
          points: number
          tier: string
          total_spent_yer: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          phone_number: string
          points?: number
          tier?: string
          total_spent_yer?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          phone_number?: string
          points?: number
          tier?: string
          total_spent_yer?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          phone_number: string
          points: number
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          phone_number: string
          points: number
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          phone_number?: string
          points?: number
          type?: string
        }
        Relationships: []
      }
      marketing_banners: {
        Row: {
          clicks: number
          created_at: string
          cta_href: string | null
          cta_label: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          impressions: number
          is_active: boolean
          placement: string
          sort_order: number
          starts_at: string
          subtitle: string | null
          theme: string
          title: string
          updated_at: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          placement?: string
          sort_order?: number
          starts_at?: string
          subtitle?: string | null
          theme?: string
          title: string
          updated_at?: string
        }
        Update: {
          clicks?: number
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          placement?: string
          sort_order?: number
          starts_at?: string
          subtitle?: string | null
          theme?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          name: string
          sent_to: number
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name: string
          sent_to?: number
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name?: string
          sent_to?: number
          type?: string
        }
        Relationships: []
      }
      marketing_queue: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          campaign_kind: string
          customer_name: string | null
          customer_phone: string
          error: string | null
          generated_at: string
          id: string
          message_text: string | null
          payload: Json
          reason: string | null
          segment: string | null
          sent_at: string | null
          status: string
          wamid: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_kind: string
          customer_name?: string | null
          customer_phone: string
          error?: string | null
          generated_at?: string
          id?: string
          message_text?: string | null
          payload?: Json
          reason?: string | null
          segment?: string | null
          sent_at?: string | null
          status?: string
          wamid?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_kind?: string
          customer_name?: string | null
          customer_phone?: string
          error?: string | null
          generated_at?: string
          id?: string
          message_text?: string | null
          payload?: Json
          reason?: string | null
          segment?: string | null
          sent_at?: string | null
          status?: string
          wamid?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json
          priority: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          priority?: string
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          priority?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
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
      operations_alerts: {
        Row: {
          created_at: string
          dedupe_key: string
          id: string
          kind: string
          ref_id: string | null
          resolved_at: string | null
          severity: string
          status: string
          summary: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string
          id?: string
          kind: string
          ref_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          summary: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string
          id?: string
          kind?: string
          ref_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          summary?: string
        }
        Relationships: []
      }
      operations_alerts_v14: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          created_at: string | null
          dedupe_key: string
          id: string
          message: string
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string | null
          dedupe_key: string
          id?: string
          message: string
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string | null
          dedupe_key?: string
          id?: string
          message?: string
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          branch_id: string | null
          correlation_id: string
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          discount_amount: number
          discount_code: string | null
          id: string
          items: Json
          notes: string | null
          status: string
          subtotal: number | null
          total: number
        }
        Insert: {
          branch_id?: string | null
          correlation_id?: string
          created_at?: string
          customer_address: string
          customer_name: string
          customer_phone: string
          discount_amount?: number
          discount_code?: string | null
          id: string
          items?: Json
          notes?: string | null
          status?: string
          subtotal?: number | null
          total?: number
        }
        Update: {
          branch_id?: string | null
          correlation_id?: string
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          discount_amount?: number
          discount_code?: string | null
          id?: string
          items?: Json
          notes?: string | null
          status?: string
          subtotal?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          id: string
          method: string
          order_id: string | null
          payment_details: Json
          receipt_url: string | null
          status: string
          transaction_ref: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          method: string
          order_id?: string | null
          payment_details?: Json
          receipt_url?: string | null
          status?: string
          transaction_ref?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: string
          order_id?: string | null
          payment_details?: Json
          receipt_url?: string | null
          status?: string
          transaction_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_escalations: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          id: string
          prescription_id: string
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          prescription_id: string
          reason: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          prescription_id?: string
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_escalations_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_extractions: {
        Row: {
          allergies: Json
          attempts: number
          confidence: number | null
          created_at: string
          diagnosis: string | null
          doctor_name: string | null
          error: string | null
          id: string
          interactions: Json
          medications: Json
          model_tier: string
          model_used: string | null
          next_attempt_at: string
          prescription_date: string | null
          prescription_file_id: string
          prescription_id: string
          raw_response: Json | null
          reviewer_approved_at: string | null
          reviewer_approved_by: string | null
          reviewer_edits: Json | null
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          allergies?: Json
          attempts?: number
          confidence?: number | null
          created_at?: string
          diagnosis?: string | null
          doctor_name?: string | null
          error?: string | null
          id?: string
          interactions?: Json
          medications?: Json
          model_tier?: string
          model_used?: string | null
          next_attempt_at?: string
          prescription_date?: string | null
          prescription_file_id: string
          prescription_id: string
          raw_response?: Json | null
          reviewer_approved_at?: string | null
          reviewer_approved_by?: string | null
          reviewer_edits?: Json | null
          source_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          allergies?: Json
          attempts?: number
          confidence?: number | null
          created_at?: string
          diagnosis?: string | null
          doctor_name?: string | null
          error?: string | null
          id?: string
          interactions?: Json
          medications?: Json
          model_tier?: string
          model_used?: string | null
          next_attempt_at?: string
          prescription_date?: string | null
          prescription_file_id?: string
          prescription_id?: string
          raw_response?: Json | null
          reviewer_approved_at?: string | null
          reviewer_approved_by?: string | null
          reviewer_edits?: Json | null
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_extractions_prescription_file_id_fkey"
            columns: ["prescription_file_id"]
            isOneToOne: false
            referencedRelation: "prescription_files"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_files: {
        Row: {
          bucket: string
          created_at: string
          deleted_at: string | null
          id: string
          legacy_blob_id: string | null
          mime_type: string
          object_path: string
          prescription_id: string
          review_status: string
          sha256: string | null
          size_bytes: number
          storage_provider: string
          updated_at: string
          uploaded_by: string | null
          uploaded_via: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          legacy_blob_id?: string | null
          mime_type: string
          object_path: string
          prescription_id: string
          review_status?: string
          sha256?: string | null
          size_bytes: number
          storage_provider?: string
          updated_at?: string
          uploaded_by?: string | null
          uploaded_via?: string
        }
        Update: {
          bucket?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          legacy_blob_id?: string | null
          mime_type?: string
          object_path?: string
          prescription_id?: string
          review_status?: string
          sha256?: string | null
          size_bytes?: number
          storage_provider?: string
          updated_at?: string
          uploaded_by?: string | null
          uploaded_via?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_files_legacy_blob_id_fkey"
            columns: ["legacy_blob_id"]
            isOneToOne: false
            referencedRelation: "prescription_image_blobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_files_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_image_blobs: {
        Row: {
          byte_size: number
          content_bytes: string
          content_type: string
          created_at: string
          id: string
          rx_id: string
          sha256: string
          storage_path: string
        }
        Insert: {
          byte_size: number
          content_bytes: string
          content_type?: string
          created_at?: string
          id?: string
          rx_id: string
          sha256: string
          storage_path: string
        }
        Update: {
          byte_size?: number
          content_bytes?: string
          content_type?: string
          created_at?: string
          id?: string
          rx_id?: string
          sha256?: string
          storage_path?: string
        }
        Relationships: []
      }
      prescription_orders: {
        Row: {
          created_at: string
          extracted_medicines: Json | null
          extracted_text: string | null
          id: string
          image_url: string
          is_valid: boolean | null
          missing_medicines: string[] | null
          pharmacist_notes: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          extracted_medicines?: Json | null
          extracted_text?: string | null
          id?: string
          image_url: string
          is_valid?: boolean | null
          missing_medicines?: string[] | null
          pharmacist_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          extracted_medicines?: Json | null
          extracted_text?: string | null
          id?: string
          image_url?: string
          is_valid?: boolean | null
          missing_medicines?: string[] | null
          pharmacist_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      prescription_reviews: {
        Row: {
          assigned_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          prescription_id: string
          review_notes: string | null
          reviewer_id: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          prescription_id: string
          review_notes?: string | null
          reviewer_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          prescription_id?: string
          review_notes?: string | null
          reviewer_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_reviews_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: true
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
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
      product_classifications: {
        Row: {
          active_ingredient: string | null
          ai_model: string | null
          ai_raw: Json | null
          complementary_legacy_ids: number[]
          conditions: string[]
          confidence: number
          created_at: string
          generic_name: string | null
          id: string
          is_chronic: boolean
          pharmacological_class: string | null
          product_legacy_id: number
          related_legacy_ids: number[]
          requires_prescription: boolean
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["classification_status"]
          therapeutic_category:
            | Database["public"]["Enums"]["therapeutic_category"]
            | null
          updated_at: string
        }
        Insert: {
          active_ingredient?: string | null
          ai_model?: string | null
          ai_raw?: Json | null
          complementary_legacy_ids?: number[]
          conditions?: string[]
          confidence?: number
          created_at?: string
          generic_name?: string | null
          id?: string
          is_chronic?: boolean
          pharmacological_class?: string | null
          product_legacy_id: number
          related_legacy_ids?: number[]
          requires_prescription?: boolean
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["classification_status"]
          therapeutic_category?:
            | Database["public"]["Enums"]["therapeutic_category"]
            | null
          updated_at?: string
        }
        Update: {
          active_ingredient?: string | null
          ai_model?: string | null
          ai_raw?: Json | null
          complementary_legacy_ids?: number[]
          conditions?: string[]
          confidence?: number
          created_at?: string
          generic_name?: string | null
          id?: string
          is_chronic?: boolean
          pharmacological_class?: string | null
          product_legacy_id?: number
          related_legacy_ids?: number[]
          requires_prescription?: boolean
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["classification_status"]
          therapeutic_category?:
            | Database["public"]["Enums"]["therapeutic_category"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      product_gallery_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_gallery_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_image_overrides: {
        Row: {
          dedupe_key: string
          fetched_at: string
          found: boolean
          image_url: string | null
          source: string
          updated_by: string | null
        }
        Insert: {
          dedupe_key: string
          fetched_at?: string
          found?: boolean
          image_url?: string | null
          source?: string
          updated_by?: string | null
        }
        Update: {
          dedupe_key?: string
          fetched_at?: string
          found?: boolean
          image_url?: string | null
          source?: string
          updated_by?: string | null
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
          expiry_date: string | null
          id: string
          image_url: string | null
          inventory_migration_group: string | null
          is_active: boolean
          is_published: boolean
          last_restocked_at: string | null
          legacy_id: number | null
          name: string
          old_price: number | null
          price: number
          reorder_point: number
          reorder_threshold: number
          sort_order: number
          stock_qty: number
          supplier_cost: number | null
          supplier_name: string | null
          track_stock: boolean
          updated_at: string
        }
        Insert: {
          badge?: string | null
          brand?: string | null
          category: string
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          inventory_migration_group?: string | null
          is_active?: boolean
          is_published?: boolean
          last_restocked_at?: string | null
          legacy_id?: number | null
          name: string
          old_price?: number | null
          price?: number
          reorder_point?: number
          reorder_threshold?: number
          sort_order?: number
          stock_qty?: number
          supplier_cost?: number | null
          supplier_name?: string | null
          track_stock?: boolean
          updated_at?: string
        }
        Update: {
          badge?: string | null
          brand?: string | null
          category?: string
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          inventory_migration_group?: string | null
          is_active?: boolean
          is_published?: boolean
          last_restocked_at?: string | null
          legacy_id?: number | null
          name?: string
          old_price?: number | null
          price?: number
          reorder_point?: number
          reorder_threshold?: number
          sort_order?: number
          stock_qty?: number
          supplier_cost?: number | null
          supplier_name?: string | null
          track_stock?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          count: number
          key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      retention_config: {
        Row: {
          archive_enabled: boolean
          email_alerts_enabled: boolean
          email_cooldown_minutes: number
          email_recipients: string[]
          error_logs_archive_days: number
          error_logs_days: number
          id: number
          incidents_archive_days: number
          incidents_days: number
          updated_at: string
          uptime_checks_days: number
        }
        Insert: {
          archive_enabled?: boolean
          email_alerts_enabled?: boolean
          email_cooldown_minutes?: number
          email_recipients?: string[]
          error_logs_archive_days?: number
          error_logs_days?: number
          id?: number
          incidents_archive_days?: number
          incidents_days?: number
          updated_at?: string
          uptime_checks_days?: number
        }
        Update: {
          archive_enabled?: boolean
          email_alerts_enabled?: boolean
          email_cooldown_minutes?: number
          email_recipients?: string[]
          error_logs_archive_days?: number
          error_logs_days?: number
          id?: number
          incidents_archive_days?: number
          incidents_days?: number
          updated_at?: string
          uptime_checks_days?: number
        }
        Relationships: []
      }
      retention_policies: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_deleted: number | null
          last_error: string | null
          last_run_at: string | null
          retain_days: number
          table_name: string
          timestamp_column: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_deleted?: number | null
          last_error?: string | null
          last_run_at?: string | null
          retain_days: number
          table_name: string
          timestamp_column?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_deleted?: number | null
          last_error?: string | null
          last_run_at?: string | null
          retain_days?: number
          table_name?: string
          timestamp_column?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean
          order_id: string | null
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          order_id?: string | null
          product_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          order_id?: string | null
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_attempts: {
        Row: {
          attempt_no: number
          created_at: string
          error_message: string | null
          external_id: string | null
          hmac_valid: boolean | null
          id: string
          idempotent_skip: boolean
          post_id: string
          request_payload: Json | null
          response_body: string | null
          response_status: number | null
          source: string
          status: string
        }
        Insert: {
          attempt_no: number
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          hmac_valid?: boolean | null
          id?: string
          idempotent_skip?: boolean
          post_id: string
          request_payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          source?: string
          status: string
        }
        Update: {
          attempt_no?: number
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          hmac_valid?: boolean | null
          id?: string
          idempotent_skip?: boolean
          post_id?: string
          request_payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_attempts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_stats: {
        Row: {
          collected_at: string
          comments: number
          id: string
          likes: number
          post_id: string
          shares: number
          views: number
        }
        Insert: {
          collected_at?: string
          comments?: number
          id?: string
          likes?: number
          post_id: string
          shares?: number
          views?: number
        }
        Update: {
          collected_at?: string
          comments?: number
          id?: string
          likes?: number
          post_id?: string
          shares?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_post_stats_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          attempt_count: number
          caption: string
          confidence_score: number | null
          created_at: string
          cta: string | null
          error_message: string | null
          external_id: string | null
          generation_version: string | null
          hashtags: string[]
          id: string
          last_attempt_at: string | null
          last_error: string | null
          model_version: string | null
          next_retry_at: string | null
          platform: string
          product_id: string | null
          published_at: string | null
          ranking_version: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          attempt_count?: number
          caption: string
          confidence_score?: number | null
          created_at?: string
          cta?: string | null
          error_message?: string | null
          external_id?: string | null
          generation_version?: string | null
          hashtags?: string[]
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          model_version?: string | null
          next_retry_at?: string | null
          platform: string
          product_id?: string | null
          published_at?: string | null
          ranking_version?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          attempt_count?: number
          caption?: string
          confidence_score?: number | null
          created_at?: string
          cta?: string | null
          error_message?: string | null
          external_id?: string | null
          generation_version?: string | null
          hashtags?: string[]
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          model_version?: string | null
          next_retry_at?: string | null
          platform?: string
          product_id?: string | null
          published_at?: string | null
          ranking_version?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          body: string | null
          channels: string[]
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          kind: string
          payload: Json
          severity: string
          title: string
          whatsapp_attempts: number
          whatsapp_last_error: string | null
          whatsapp_status: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body?: string | null
          channels?: string[]
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind: string
          payload?: Json
          severity?: string
          title: string
          whatsapp_attempts?: number
          whatsapp_last_error?: string | null
          whatsapp_status?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body?: string | null
          channels?: string[]
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: string
          payload?: Json
          severity?: string
          title?: string
          whatsapp_attempts?: number
          whatsapp_last_error?: string | null
          whatsapp_status?: string | null
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
      stock_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          notified_at: string | null
          phone_number: string
          product_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          notified_at?: string | null
          phone_number: string
          product_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          notified_at?: string | null
          phone_number?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_link_audit: {
        Row: {
          after_supplier_cost: number | null
          after_supplier_name: string | null
          batch_id: string
          before_supplier_cost: number | null
          before_supplier_name: string | null
          created_at: string
          id: string
          performed_by: string | null
          product_id: string
          reason: string | null
          rolled_back_at: string | null
          rolled_back_by: string | null
        }
        Insert: {
          after_supplier_cost?: number | null
          after_supplier_name?: string | null
          batch_id?: string
          before_supplier_cost?: number | null
          before_supplier_name?: string | null
          created_at?: string
          id?: string
          performed_by?: string | null
          product_id: string
          reason?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
        }
        Update: {
          after_supplier_cost?: number | null
          after_supplier_name?: string | null
          batch_id?: string
          before_supplier_cost?: number | null
          before_supplier_name?: string | null
          created_at?: string
          id?: string
          performed_by?: string | null
          product_id?: string
          reason?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_link_audit_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_incidents: {
        Row: {
          dedupe_key: string
          evidence: Json
          id: string
          opened_at: string
          resolved_at: string | null
          severity: string
          source: string
          status: string
          summary: string | null
          title: string
        }
        Insert: {
          dedupe_key?: string
          evidence?: Json
          id?: string
          opened_at?: string
          resolved_at?: string | null
          severity?: string
          source: string
          status?: string
          summary?: string | null
          title: string
        }
        Update: {
          dedupe_key?: string
          evidence?: Json
          id?: string
          opened_at?: string
          resolved_at?: string | null
          severity?: string
          source?: string
          status?: string
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      tracking_lookups: {
        Row: {
          count: number
          ip: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          ip: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          ip?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      transfer_audit_log: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["transfer_status"] | null
          id: string
          metadata: Json
          reason: string | null
          to_status: Database["public"]["Enums"]["transfer_status"]
          transfer_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["transfer_status"] | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_status: Database["public"]["Enums"]["transfer_status"]
          transfer_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["transfer_status"] | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_status?: Database["public"]["Enums"]["transfer_status"]
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_audit_log_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_items: {
        Row: {
          id: string
          product_id: string
          qty_picked: number
          qty_received: number
          qty_requested: number
          transfer_id: string
        }
        Insert: {
          id?: string
          product_id: string
          qty_picked?: number
          qty_received?: number
          qty_requested: number
          transfer_id: string
        }
        Update: {
          id?: string
          product_id?: string
          qty_picked?: number
          qty_received?: number
          qty_requested?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      trigger_metrics: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          payload: Json
          status: string
          trigger_name: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          payload?: Json
          status: string
          trigger_name: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          payload?: Json
          status?: string
          trigger_name?: string
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
      user_devices: {
        Row: {
          active: boolean
          created_at: string
          device_name: string | null
          fcm_token: string
          id: string
          platform: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          device_name?: string | null
          fcm_token: string
          id?: string
          platform?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          device_name?: string | null
          fcm_token?: string
          id?: string
          platform?: string | null
          updated_at?: string
          user_id?: string
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
      whatsapp_conversations: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          last_intent: string | null
          last_message: string | null
          last_message_at: string
          metadata: Json
          phone_number: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          last_intent?: string | null
          last_message?: string | null
          last_message_at?: string
          metadata?: Json
          phone_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          last_intent?: string | null
          last_message?: string | null
          last_message_at?: string
          metadata?: Json
          phone_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_delivery_logs: {
        Row: {
          attempts: number
          correlation_id: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          idempotency_key: string | null
          last_attempt_at: string | null
          message_kind: string
          next_retry_at: string | null
          payload: Json
          read_at: string | null
          recipient_phone: string
          ref_id: string | null
          ref_kind: string | null
          sent_at: string | null
          status: string
          template_name: string | null
          wamid: string | null
        }
        Insert: {
          attempts?: number
          correlation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          message_kind: string
          next_retry_at?: string | null
          payload?: Json
          read_at?: string | null
          recipient_phone: string
          ref_id?: string | null
          ref_kind?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string | null
          wamid?: string | null
        }
        Update: {
          attempts?: number
          correlation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          message_kind?: string
          next_retry_at?: string | null
          payload?: Json
          read_at?: string | null
          recipient_phone?: string
          ref_id?: string | null
          ref_kind?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string | null
          wamid?: string | null
        }
        Relationships: []
      }
      whatsapp_escalations: {
        Row: {
          assigned_to: string | null
          conversation_id: string
          created_at: string
          id: string
          payload: Json
          reason: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          payload?: Json
          reason: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          payload?: Json
          reason?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_escalations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          agent_run_id: string | null
          content: string | null
          conversation_id: string
          created_at: string
          direction: string
          error: string | null
          id: string
          intent: string | null
          message_type: string
          status: string
          wa_message_id: string | null
        }
        Insert: {
          agent_run_id?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          error?: string | null
          id?: string
          intent?: string | null
          message_type?: string
          status?: string
          wa_message_id?: string | null
        }
        Update: {
          agent_run_id?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          intent?: string | null
          message_type?: string
          status?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notification_dispatch: {
        Row: {
          attempts: number
          correlation_id: string | null
          created_at: string
          duration_ms: number | null
          event_id: string
          event_name: string
          id: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          order_id: string | null
          prescription_id: string | null
          recipient_phone: string
          rendered_body: string | null
          sent_at: string | null
          status: string
          template_id: string
          updated_at: string
          wamid: string | null
        }
        Insert: {
          attempts?: number
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          event_id: string
          event_name: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          order_id?: string | null
          prescription_id?: string | null
          recipient_phone: string
          rendered_body?: string | null
          sent_at?: string | null
          status?: string
          template_id: string
          updated_at?: string
          wamid?: string | null
        }
        Update: {
          attempts?: number
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          event_id?: string
          event_name?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          order_id?: string | null
          prescription_id?: string | null
          recipient_phone?: string
          rendered_body?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string
          updated_at?: string
          wamid?: string | null
        }
        Relationships: []
      }
      whatsapp_notification_templates: {
        Row: {
          body_template: string
          created_at: string
          description: string | null
          enabled: boolean
          event_name: string
          id: string
          updated_at: string
          updated_by: string | null
          variables: string[]
        }
        Insert: {
          body_template: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          event_name: string
          id: string
          updated_at?: string
          updated_by?: string | null
          variables?: string[]
        }
        Update: {
          body_template?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          event_name?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          variables?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      audit_logs_unified: {
        Row: {
          details: Json | null
          occurred_at: string | null
          source: string | null
          source_id: string | null
        }
        Relationships: []
      }
      pending_admin_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          kind: string | null
          payload: Json | null
          severity: string | null
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          kind?: string | null
          payload?: Json | null
          severity?: string | null
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          kind?: string | null
          payload?: Json | null
          severity?: string | null
          title?: string | null
        }
        Relationships: []
      }
      product_classifications_public: {
        Row: {
          conditions: string[] | null
          id: string | null
          pharmacological_class: string | null
          related_legacy_ids: number[] | null
          requires_prescription: boolean | null
          status: Database["public"]["Enums"]["classification_status"] | null
          updated_at: string | null
        }
        Insert: {
          conditions?: string[] | null
          id?: string | null
          pharmacological_class?: string | null
          related_legacy_ids?: number[] | null
          requires_prescription?: boolean | null
          status?: Database["public"]["Enums"]["classification_status"] | null
          updated_at?: string | null
        }
        Update: {
          conditions?: string[] | null
          id?: string | null
          pharmacological_class?: string | null
          related_legacy_ids?: number[] | null
          requires_prescription?: boolean | null
          status?: Database["public"]["Enums"]["classification_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      unprocessed_agent_events: {
        Row: {
          entity_id: string | null
          entity_type: string | null
          event_name: string | null
          id: string | null
          last_error: string | null
          occurred_at: string | null
          payload: Json | null
          retry_count: number | null
          source: string | null
        }
        Insert: {
          entity_id?: string | null
          entity_type?: string | null
          event_name?: string | null
          id?: string | null
          last_error?: string | null
          occurred_at?: string | null
          payload?: Json | null
          retry_count?: number | null
          source?: string | null
        }
        Update: {
          entity_id?: string | null
          entity_type?: string | null
          event_name?: string | null
          id?: string | null
          last_error?: string | null
          occurred_at?: string | null
          payload?: Json | null
          retry_count?: number | null
          source?: string | null
        }
        Relationships: []
      }
      whatsapp_notification_health: {
        Row: {
          avg_attempts: number | null
          avg_duration_ms: number | null
          cnt: number | null
          dead_cnt: number | null
          event_name: string | null
          hour: string | null
          max_attempts_seen: number | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _agent_kpi_upsert: {
        Args: {
          _agent: string
          _details: Json
          _metric: string
          _score: number
        }
        Returns: undefined
      }
      _agent_rec_upsert: {
        Args: {
          _agent: string
          _category: string
          _confidence: number
          _dedupe: string
          _impact: number
          _payload: Json
          _rationale: string
          _title: string
        }
        Returns: string
      }
      _classif_can_manage: { Args: never; Returns: boolean }
      _intel_can_manage: { Args: never; Returns: boolean }
      _therapeutic_label_ar: { Args: { _cat: string }; Returns: string }
      ack_staff_alert: { Args: { _id: string }; Returns: boolean }
      add_loyalty_points: {
        Args: { _order_id?: string; _phone: string; _spent_yer: number }
        Returns: number
      }
      admin_bundles_report: { Args: never; Returns: Json }
      admin_list_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobid: number
          jobname: string
          schedule: string
        }[]
      }
      admin_list_cron_runs: {
        Args: { _limit?: number }
        Returns: {
          command: string
          database: string
          end_time: string
          job_pid: number
          jobid: number
          jobname: string
          return_message: string
          runid: number
          start_time: string
          status: string
          username: string
        }[]
      }
      admin_revenue_series: { Args: { _days?: number }; Returns: Json }
      admin_stats: { Args: never; Returns: Json }
      agent_events_dlq_stats: { Args: never; Returns: Json }
      agent_runs_list: { Args: { _limit?: number }; Returns: Json }
      agent_workforce_summary: { Args: never; Returns: Json }
      ai_get_branch_availability: {
        Args: { _product_query: string }
        Returns: {
          branch_name: string
          in_stock: boolean
          product_id: string
          product_name: string
        }[]
      }
      ai_get_order_status: {
        Args: { _order_id: string; _phone: string }
        Returns: {
          created_at: string
          id: string
          item_count: number
          status: string
          total: number
        }[]
      }
      ai_get_prescription_status: {
        Args: { _phone: string; _prescription_id: string }
        Returns: {
          created_at: string
          has_review: boolean
          id: string
          status: string
        }[]
      }
      ai_list_branches: {
        Args: never
        Returns: {
          address: string
          code: string
          id: string
          name: string
          phone: string
        }[]
      }
      ai_search_products: {
        Args: { _limit?: number; _query: string }
        Returns: {
          brand: string
          category: string
          description: string
          id: string
          in_stock: boolean
          name: string
          price: number
        }[]
      }
      apply_retention_policies: {
        Args: never
        Returns: {
          deleted: number
          error: string
          table_name: string
        }[]
      }
      approve_classification: {
        Args: { _edits?: Json; _id: string }
        Returns: boolean
      }
      auto_bundle_candidates: {
        Args: { _days?: number }
        Returns: {
          a_id: number
          a_name: string
          avg_combined_price: number
          b_id: number
          b_name: string
          co_count: number
          lift: number
        }[]
      }
      auto_populate_bundle_items: { Args: never; Returns: number }
      bootstrap_owner: { Args: never; Returns: boolean }
      branch_reorder_suggestions: {
        Args: {
          _branch_id: string
          _coverage_days?: number
          _limit?: number
          _lookback_days?: number
          _offset?: number
        }
        Returns: {
          available: number
          branch_id: string
          daily_velocity: number
          movement_qty_30d: number
          on_hand: number
          product_id: string
          product_name: string
          reason: string
          reorder_point: number
          reserved: number
          suggested_restock_qty: number
          urgency: string
        }[]
      }
      campaign_report: { Args: never; Returns: Json }
      cancel_transfer: {
        Args: { _reason?: string; _transfer_id: string }
        Returns: string
      }
      check_img_rate_limit: {
        Args: { _ip: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
      check_tracking_rate_limit: {
        Args: { _ip: string; _max?: number; _window_seconds?: number }
        Returns: boolean
      }
      chronic_overdue: {
        Args: { _grace?: number }
        Returns: {
          chronic_flags: Json
          days_between: number
          days_since: number
          dominant_category: string
          last_order_at: string
          name: string
          phone: string
          total_spent: number
        }[]
      }
      claim_agent_events: {
        Args: { _limit?: number; _worker?: string }
        Returns: {
          entity_id: string
          entity_type: string
          event_name: string
          id: string
          occurred_at: string
          payload: Json
          retry_count: number
          source: string
        }[]
      }
      claim_customer_rx_notifications: {
        Args: { _limit?: number }
        Returns: {
          attempts: number
          correlation_id: string | null
          created_at: string
          duration_ms: number | null
          event_id: string
          event_name: string
          id: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          order_id: string | null
          prescription_id: string | null
          recipient_phone: string
          rendered_body: string | null
          sent_at: string | null
          status: string
          template_id: string
          updated_at: string
          wamid: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "whatsapp_notification_dispatch"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      clean_old_telemetry: {
        Args: never
        Returns: {
          deleted_decisions: number
          deleted_feedback: number
        }[]
      }
      cleanup_idempotency_keys: { Args: never; Returns: number }
      commit_transfer_receipt: {
        Args: { _transfer_id: string }
        Returns: string
      }
      conditions_catalog: {
        Args: never
        Returns: {
          chronic_count: number
          condition: string
          product_count: number
          sample_image: string
        }[]
      }
      consume_rate_limit: {
        Args: { _key: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
      create_backup: { Args: { _kind?: string }; Returns: string }
      create_scheduled_backup: { Args: { _kind: string }; Returns: string }
      cto_health: { Args: never; Returns: Json }
      current_inventory_write_mode: { Args: never; Returns: string }
      customer_notification_get_status: {
        Args: { _token: string }
        Returns: Json
      }
      customer_notification_set_optout: {
        Args: { _opt_out: boolean; _token: string }
        Returns: Json
      }
      customers_for_enrichment: {
        Args: { _limit?: number }
        Returns: {
          chronic_flags: Json
          dominant_category: string
          health_score: number
          last_order_at: string
          name: string
          orders_count: number
          phone: string
          segment: string
          top_categories: Json
          total_spent: number
          value_score: number
        }[]
      }
      declining_products: {
        Args: never
        Returns: {
          drop_pct: number
          legacy_id: number
          name: string
          revenue_prev: number
          revenue_this: number
          units_prev: number
          units_this: number
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      detect_stale_transfers: {
        Args: { _stale_minutes?: number }
        Returns: {
          alerts_created: number
          alerts_updated: number
        }[]
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      emit_agent_event: {
        Args: {
          _entity_id?: string
          _entity_type?: string
          _event_name: string
          _payload?: Json
          _source?: string
        }
        Returns: string
      }
      emit_order_event: {
        Args: {
          _correlation_id?: string
          _event_name: string
          _meta?: Json
          _order_id: string
        }
        Returns: string
      }
      emit_prescription_event: {
        Args: {
          _actor_id?: string
          _actor_type?: string
          _event_name: string
          _metadata?: Json
          _order_id?: string
          _prescription_id: string
          _source?: string
        }
        Returns: string
      }
      enqueue_chronic_refill_action: {
        Args: {
          _customer_phone: string
          _discount_code: string
          _message_arabic: string
          _tier: string
        }
        Returns: string
      }
      enqueue_chronic_refills: {
        Args: { _discount_pct?: number; _limit?: number }
        Returns: Json
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      exec_dashboard: { Args: never; Returns: Json }
      executive_alerts: { Args: never; Returns: Json }
      fail_agent_event: {
        Args: {
          _error: string
          _event_id: string
          _max_retries?: number
          _processed_by: string
        }
        Returns: Json
      }
      generate_agent_actions: { Args: never; Returns: number }
      generate_invoice_number: { Args: never; Returns: string }
      generate_marketing_campaigns: { Args: never; Returns: Json }
      get_agent_alerts: {
        Args: never
        Returns: {
          agent: string
          alert_key: string
          message: string
          payload: Json
          severity: string
        }[]
      }
      get_backup_schedule: { Args: never; Returns: Json }
      get_event_consumer_schedule: { Args: never; Returns: Json }
      get_order_history_public: {
        Args: { _client_ip?: string; _id: string; _phone_last4: string }
        Returns: {
          created_at: string
          note: string
          status: string
        }[]
      }
      get_order_public: {
        Args: { _client_ip?: string; _id: string; _phone_last4: string }
        Returns: {
          created_at: string
          customer_name: string
          id: string
          items: Json
          status: string
          total: number
        }[]
      }
      has_branch_access: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
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
      inventory_intel: { Args: never; Returns: Json }
      inventory_pilot_report: { Args: never; Returns: Json }
      inventory_readiness_report: { Args: never; Returns: Json }
      inventory_report: { Args: never; Returns: Json }
      is_branch_manager_of: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_owner_or_admin: { Args: { _user_id: string }; Returns: boolean }
      latest_executive_report: { Args: never; Returns: Json }
      list_approved_classifications_public: { Args: never; Returns: Json }
      list_bundles_public: { Args: never; Returns: Json }
      list_classifications_admin: {
        Args: { _category?: string; _limit?: number; _status?: string }
        Returns: Json
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
      log_inventory_shadow: {
        Args: { _legacy_id: number; _order_id: string; _requested_qty: number }
        Returns: undefined
      }
      mark_customer_rx_notification_failed: {
        Args: { _base_seconds?: number; _error: string; _id: string }
        Returns: Json
      }
      mark_customer_rx_notification_sent: {
        Args: {
          _duration_ms: number
          _id: string
          _rendered_body: string
          _wamid: string
        }
        Returns: undefined
      }
      mark_event_processed: {
        Args: { _error?: string; _event_id: string; _processed_by?: string }
        Returns: boolean
      }
      marketing_queue_approve: { Args: { _id: string }; Returns: boolean }
      marketing_queue_list: {
        Args: { _limit?: number; _status?: string }
        Returns: Json
      }
      marketing_queue_mark_sent: {
        Args: { _error?: string; _id: string; _wamid?: string }
        Returns: boolean
      }
      marketing_queue_skip: { Args: { _id: string }; Returns: boolean }
      monitor_cron_failures: { Args: never; Returns: Json }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      pharmacy_chronic_legacy_ids: { Args: never; Returns: Json }
      pharmacy_homepage_sections: { Args: never; Returns: Json }
      pharmacy_related_products: { Args: { _legacy_id: number }; Returns: Json }
      pharmacy_search: { Args: { _q: string }; Returns: Json }
      pharmacy_taxonomy_stats: { Args: never; Returns: Json }
      place_order:
        | {
            Args: { _customer: Json; _id: string; _items: Json }
            Returns: Json
          }
        | {
            Args: {
              _customer: Json
              _discount_code?: string
              _id: string
              _items: Json
            }
            Returns: Json
          }
      prescription_file_count: {
        Args: { _prescription_id: string }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      rebuild_customer_intel: { Args: never; Returns: Json }
      recompute_loyalty_tier: { Args: { _phone: string }; Returns: string }
      reconcile_inventory_mismatch: { Args: never; Returns: Json }
      redeem_loyalty_points: {
        Args: { _phone: string; _points: number }
        Returns: number
      }
      reject_classification: { Args: { _id: string }; Returns: boolean }
      release_order_stock: {
        Args: { _actor?: string; _order_id: string; _reason?: string }
        Returns: Json
      }
      release_transfer_reservation: {
        Args: { _reason?: string; _transfer_id: string }
        Returns: string
      }
      reserve_order_stock: {
        Args: { _actor?: string; _order_id: string; _reason?: string }
        Returns: Json
      }
      reserve_transfer_stock: {
        Args: { _transfer_id: string }
        Returns: string
      }
      revenue_by_condition: {
        Args: { _days?: number }
        Returns: {
          condition: string
          orders_count: number
          revenue: number
        }[]
      }
      rotate_cron_secret: {
        Args: { _base_url?: string; _secret: string }
        Returns: Json
      }
      run_all_agents_now: { Args: never; Returns: Json }
      run_bi_worker: { Args: never; Returns: Json }
      run_ceo_worker: { Args: never; Returns: Json }
      run_cto_worker: { Args: never; Returns: Json }
      run_cx_worker: { Args: never; Returns: Json }
      run_inventory_worker: { Args: never; Returns: Json }
      run_marketing_worker: { Args: never; Returns: Json }
      run_operations_worker: { Args: never; Returns: Json }
      run_retention_policy: { Args: never; Returns: Json }
      run_sales_worker: { Args: never; Returns: Json }
      sales_opportunities: { Args: never; Returns: Json }
      save_customer_ai_insight: {
        Args: { _insight: string; _phone: string }
        Returns: undefined
      }
      schedule_event_consumer: {
        Args: {
          _batch?: number
          _cron_secret: string
          _project_host?: string
          _schedule?: string
        }
        Returns: Json
      }
      set_inventory_pilot: {
        Args: { _group?: string; _legacy_ids: number[] }
        Returns: Json
      }
      submit_prescription: {
        Args: { _customer: Json; _id: string; _image_urls: string[] }
        Returns: Json
      }
      top_selling_products: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          current_price: number
          current_stock: number
          orders_count: number
          product_name: string
          revenue_yer: number
          units_sold: number
        }[]
      }
      track_banner_event: {
        Args: { _banner_id: string; _event: string }
        Returns: boolean
      }
      upsert_classification: { Args: { _payload: Json }; Returns: string }
      validate_discount: {
        Args: { _code: string; _customer_phone?: string; _subtotal: number }
        Returns: Json
      }
      verify_prescription_image_coverage: { Args: never; Returns: Json }
      weekly_exec_report_build: { Args: never; Returns: Json }
    }
    Enums: {
      action_execution_status:
        | "PENDING_APPROVAL"
        | "EXECUTED"
        | "SKIPPED"
        | "FAILED"
      action_target_pipeline:
        | "PRESCRIPTIONS"
        | "ORDERS"
        | "MARKETING_QUEUE"
        | "INVENTORY"
      app_role: "admin" | "user" | "owner"
      branch_role: "manager" | "staff" | "viewer"
      branch_type: "WAREHOUSE" | "BRANCH" | "OFFICE"
      classification_status: "pending" | "approved" | "rejected"
      therapeutic_category:
        | "diabetes"
        | "hypertension"
        | "cardiology"
        | "allergy"
        | "asthma"
        | "gi"
        | "antibiotics"
        | "neurology"
        | "dermatology"
        | "pediatrics"
        | "womens_health"
        | "vitamins"
        | "pain"
        | "respiratory"
        | "ophthalmology"
        | "urology"
        | "hormonal"
        | "oncology"
        | "mental_health"
        | "other"
      transfer_status:
        | "REQUESTED"
        | "APPROVED"
        | "RESERVED"
        | "PICKING"
        | "PACKED"
        | "DISPATCHED"
        | "IN_TRANSIT"
        | "RECEIVED"
        | "COMPLETED"
        | "CANCELLED"
        | "REJECTED"
      transfer_type: "WH_TO_BRANCH" | "BRANCH_TO_BRANCH" | "BRANCH_TO_WH"
      valid_agent_modes:
        | "pharmacist"
        | "inventory"
        | "procurement"
        | "refill"
        | "marketing"
        | "import_excel_classifier"
        | "bi"
        | "ceo"
        | "cto"
        | "cx"
        | "operations"
        | "sales"
        | "whatsapp"
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
      action_execution_status: [
        "PENDING_APPROVAL",
        "EXECUTED",
        "SKIPPED",
        "FAILED",
      ],
      action_target_pipeline: [
        "PRESCRIPTIONS",
        "ORDERS",
        "MARKETING_QUEUE",
        "INVENTORY",
      ],
      app_role: ["admin", "user", "owner"],
      branch_role: ["manager", "staff", "viewer"],
      branch_type: ["WAREHOUSE", "BRANCH", "OFFICE"],
      classification_status: ["pending", "approved", "rejected"],
      therapeutic_category: [
        "diabetes",
        "hypertension",
        "cardiology",
        "allergy",
        "asthma",
        "gi",
        "antibiotics",
        "neurology",
        "dermatology",
        "pediatrics",
        "womens_health",
        "vitamins",
        "pain",
        "respiratory",
        "ophthalmology",
        "urology",
        "hormonal",
        "oncology",
        "mental_health",
        "other",
      ],
      transfer_status: [
        "REQUESTED",
        "APPROVED",
        "RESERVED",
        "PICKING",
        "PACKED",
        "DISPATCHED",
        "IN_TRANSIT",
        "RECEIVED",
        "COMPLETED",
        "CANCELLED",
        "REJECTED",
      ],
      transfer_type: ["WH_TO_BRANCH", "BRANCH_TO_BRANCH", "BRANCH_TO_WH"],
      valid_agent_modes: [
        "pharmacist",
        "inventory",
        "procurement",
        "refill",
        "marketing",
        "import_excel_classifier",
        "bi",
        "ceo",
        "cto",
        "cx",
        "operations",
        "sales",
        "whatsapp",
      ],
    },
  },
} as const
