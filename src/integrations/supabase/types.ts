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
        Relationships: []
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
          is_published: boolean
          legacy_id: number | null
          name: string
          old_price: number | null
          price: number
          reorder_point: number
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
          is_published?: boolean
          legacy_id?: number | null
          name: string
          old_price?: number | null
          price?: number
          reorder_point?: number
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
          is_published?: boolean
          legacy_id?: number | null
          name?: string
          old_price?: number | null
          price?: number
          reorder_point?: number
          sort_order?: number
          stock_qty?: number
          supplier_cost?: number | null
          supplier_name?: string | null
          track_stock?: boolean
          updated_at?: string
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
      staff_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          body: string | null
          channels: string[]
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
      ack_staff_alert: { Args: { _id: string }; Returns: boolean }
      admin_bundles_report: { Args: never; Returns: Json }
      admin_revenue_series: { Args: { _days?: number }; Returns: Json }
      admin_stats: { Args: never; Returns: Json }
      bootstrap_owner: { Args: never; Returns: boolean }
      campaign_report: { Args: never; Returns: Json }
      check_img_rate_limit: {
        Args: { _ip: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
      check_tracking_rate_limit: {
        Args: { _ip: string; _max?: number; _window_seconds?: number }
        Returns: boolean
      }
      create_backup: { Args: { _kind?: string }; Returns: string }
      create_scheduled_backup: { Args: { _kind: string }; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
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
      inventory_report: { Args: never; Returns: Json }
      list_bundles_public: { Args: never; Returns: Json }
      log_activity: {
        Args: {
          _action: string
          _details?: Json
          _entity_id?: string
          _entity_type?: string
        }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
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
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      run_retention_policy: { Args: never; Returns: Json }
      submit_prescription: {
        Args: { _customer: Json; _id: string; _image_urls: string[] }
        Returns: Json
      }
      track_banner_event: {
        Args: { _banner_id: string; _event: string }
        Returns: boolean
      }
      validate_discount: {
        Args: { _code: string; _customer_phone?: string; _subtotal: number }
        Returns: Json
      }
      verify_prescription_image_coverage: { Args: never; Returns: Json }
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
