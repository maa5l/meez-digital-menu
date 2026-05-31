export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          venue_name: string | null;
          phone: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          venue_name?: string | null;
          phone?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          venue_name?: string | null;
          phone?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      venues: {
        Row: {
          owner_id: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venues_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          owner_id: string;
          status: string;
          screen_count: number;
          billing_cycle: string;
          price_per_screen_monthly: number;
          price_per_screen_yearly: number;
          trial_ends_at: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          grace_ends_at: string | null;
          canceled_at: string | null;
          external_customer_id: string | null;
          external_subscription_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          status?: string;
          screen_count?: number;
          billing_cycle?: string;
          price_per_screen_monthly?: number;
          price_per_screen_yearly?: number;
          trial_ends_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          grace_ends_at?: string | null;
          canceled_at?: string | null;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          status?: string;
          screen_count?: number;
          billing_cycle?: string;
          price_per_screen_monthly?: number;
          price_per_screen_yearly?: number;
          trial_ends_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          grace_ends_at?: string | null;
          canceled_at?: string | null;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          owner_id: string | null;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      device_activations: {
        Row: {
          code: string;
          owner_id: string;
          menu_type: "products" | "crops" | null;
          activated_at: string;
          device_name: string | null;
          status: string;
          linked_at: string;
          last_seen_at: string | null;
        };
        Insert: {
          code: string;
          owner_id: string;
          menu_type?: "products" | "crops" | null;
          activated_at?: string;
          device_name?: string | null;
          status?: string;
          linked_at?: string;
          last_seen_at?: string | null;
        };
        Update: {
          code?: string;
          owner_id?: string;
          menu_type?: "products" | "crops" | null;
          activated_at?: string;
          device_name?: string | null;
          status?: string;
          linked_at?: string;
          last_seen_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "device_activations_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      device_pairing_sessions: {
        Row: {
          id: string;
          owner_id: string;
          code: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          code?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          code?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "device_pairing_sessions_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_profile: {
        Args: {
          p_full_name?: string | null;
          p_venue_name?: string | null;
          p_phone?: string | null;
        };
        Returns: undefined;
      };
      ensure_venue_for_owner: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      create_device_pairing_session: {
        Args: Record<string, never>;
        Returns: string;
      };
      claim_device_pairing_session: {
        Args: { session_id: string; code: string };
        Returns: undefined;
      };
      get_device_pairing_session_code: {
        Args: { session_id: string };
        Returns: string;
      };
      create_device_verification_code: {
        Args: { p_code: string };
        Returns: string;
      };
      validate_device_verification_code: {
        Args: { p_code: string };
        Returns: boolean;
      };
      verify_login_verification_code: {
        Args: { p_code: string; p_email: string };
        Returns: boolean;
      };
      verify_owner_verification_code: {
        Args: { p_code: string };
        Returns: boolean;
      };
      consume_verification_code: {
        Args: { p_code: string; p_owner_id?: string | null };
        Returns: undefined;
      };
      get_venue_for_device: {
        Args: { device_code: string };
        Returns: Json;
      };
      get_venue_updated_at_for_device: {
        Args: { device_code: string };
        Returns: string;
      };
      is_device_activated: {
        Args: { device_code: string };
        Returns: boolean;
      };
      get_device_menu_type: {
        Args: { device_code: string };
        Returns: string;
      };
      check_kiosk_access: {
        Args: { p_device_code: string };
        Returns: Json;
      };
      activate_device_with_license: {
        Args: {
          license: string;
          device: string;
          app_env?: string;
        };
        Returns: Json;
      };
      register_device_with_license: {
        Args: {
          p_code: string;
          p_menu_type?: string | null;
          p_device_name?: string | null;
          p_app_env?: string;
        };
        Returns: Json;
      };
      deactivate_device: {
        Args: { p_code: string };
        Returns: Json;
      };
      deactivate_all_my_devices: {
        Args: Record<string, never>;
        Returns: Json;
      };
      update_venue_data: {
        Args: { p_data: Json };
        Returns: Json;
      };
      get_dashboard_preview_venue: {
        Args: Record<string, never>;
        Returns: Json;
      };
      write_client_audit_log: {
        Args: { p_action: string; p_metadata?: Json };
        Returns: string;
      };
      list_owner_devices: {
        Args: Record<string, never>;
        Returns: Json;
      };
      record_device_heartbeat: {
        Args: { p_device_code: string };
        Returns: boolean;
      };
      get_owner_subscription: {
        Args: Record<string, never>;
        Returns: Json;
      };
      ensure_subscription_for_owner: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      resolve_subscription_access: {
        Args: { p_owner_id: string };
        Returns: Json;
      };
      confirm_subscription_payment: {
        Args: {
          p_screen_count: number;
          p_billing_cycle: string;
          p_card_last4?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
