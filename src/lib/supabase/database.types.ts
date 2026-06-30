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
          last_activity_at: string | null;
          internal_notes: string | null;
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
          last_activity_at?: string | null;
          internal_notes?: string | null;
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
          last_activity_at?: string | null;
          internal_notes?: string | null;
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
          status: Database["public"]["Enums"]["subscription_status"];
          screen_count: number;
          device_limit: number | null;
          billing_cycle: string;
          price_per_screen_monthly: number;
          price_per_screen_yearly: number;
          trial_started_at: string | null;
          trial_ends_at: string | null;
          subscription_started_at: string | null;
          subscription_ends_at: string | null;
          activated_by: string | null;
          activated_at: string | null;
          manual_activation: boolean;
          notes: string | null;
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
          status?: Database["public"]["Enums"]["subscription_status"];
          screen_count?: number;
          device_limit?: number | null;
          billing_cycle?: string;
          price_per_screen_monthly?: number;
          price_per_screen_yearly?: number;
          trial_started_at?: string | null;
          trial_ends_at?: string | null;
          subscription_started_at?: string | null;
          subscription_ends_at?: string | null;
          activated_by?: string | null;
          activated_at?: string | null;
          manual_activation?: boolean;
          notes?: string | null;
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
          status?: Database["public"]["Enums"]["subscription_status"];
          screen_count?: number;
          device_limit?: number | null;
          billing_cycle?: string;
          price_per_screen_monthly?: number;
          price_per_screen_yearly?: number;
          trial_started_at?: string | null;
          trial_ends_at?: string | null;
          subscription_started_at?: string | null;
          subscription_ends_at?: string | null;
          activated_by?: string | null;
          activated_at?: string | null;
          manual_activation?: boolean;
          notes?: string | null;
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
      admin_users: {
        Row: {
          user_id: string;
          role: Database["public"]["Enums"]["admin_role"];
          full_name: string | null;
          email: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          role?: Database["public"]["Enums"]["admin_role"];
          full_name?: string | null;
          email: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          role?: Database["public"]["Enums"]["admin_role"];
          full_name?: string | null;
          email?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          target_owner_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          action: string;
          target_owner_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          action?: string;
          target_owner_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      subscription_history: {
        Row: {
          id: string;
          owner_id: string;
          previous_status: Database["public"]["Enums"]["subscription_status"] | null;
          new_status: Database["public"]["Enums"]["subscription_status"];
          previous_device_limit: number | null;
          new_device_limit: number | null;
          previous_subscription_ends_at: string | null;
          new_subscription_ends_at: string | null;
          changed_by: string | null;
          change_source: string;
          notes: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          previous_status?: Database["public"]["Enums"]["subscription_status"] | null;
          new_status: Database["public"]["Enums"]["subscription_status"];
          previous_device_limit?: number | null;
          new_device_limit?: number | null;
          previous_subscription_ends_at?: string | null;
          new_subscription_ends_at?: string | null;
          changed_by?: string | null;
          change_source?: string;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          previous_status?: Database["public"]["Enums"]["subscription_status"] | null;
          new_status?: Database["public"]["Enums"]["subscription_status"];
          previous_device_limit?: number | null;
          new_device_limit?: number | null;
          previous_subscription_ends_at?: string | null;
          new_subscription_ends_at?: string | null;
          changed_by?: string | null;
          change_source?: string;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
      };
      device_activations: {
        Row: {
          code: string;
          owner_id: string;
          device_id: string;
          menu_type: "products" | "crops" | null;
          activated_at: string;
          device_name: string | null;
          status: Database["public"]["Enums"]["device_license_status"];
          linked_at: string;
          last_seen_at: string | null;
          created_at: string;
        };
        Insert: {
          code: string;
          owner_id: string;
          device_id?: string;
          menu_type?: "products" | "crops" | null;
          activated_at?: string;
          device_name?: string | null;
          status?: Database["public"]["Enums"]["device_license_status"];
          linked_at?: string;
          last_seen_at?: string | null;
          created_at?: string;
        };
        Update: {
          code?: string;
          owner_id?: string;
          device_id?: string;
          menu_type?: "products" | "crops" | null;
          activated_at?: string;
          device_name?: string | null;
          status?: Database["public"]["Enums"]["device_license_status"];
          linked_at?: string;
          last_seen_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
        Args: { p_session_id: string; p_code: string };
        Returns: boolean;
      };
      get_device_pairing_session_code: {
        Args: { p_session_id: string };
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
      get_kiosk_state: {
        Args: { p_code: string };
        Returns: Json;
      };
      get_kiosk_venue: {
        Args: { p_code: string };
        Returns: Json;
      };
      get_owner_venue: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_owner_venue_updated_at: {
        Args: Record<string, never>;
        Returns: string;
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
        Args: { license: string; device: string; app_env?: string };
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
      get_my_admin_profile: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_get_dashboard_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_list_customers: {
        Args: {
          p_search?: string | null;
          p_status?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Json;
      };
      admin_get_customer: {
        Args: { p_owner_id: string };
        Returns: Json;
      };
      admin_update_subscription: {
        Args: {
          p_owner_id: string;
          p_action: string;
          p_device_limit?: number | null;
          p_subscription_ends_at?: string | null;
          p_notes?: string | null;
          p_internal_notes?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      admin_role: "super_admin" | "admin" | "support";
      subscription_status: "trial" | "active" | "expired" | "suspended" | "canceled";
      device_license_status: "active" | "inactive" | "suspended";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type AdminRole = Database["public"]["Enums"]["admin_role"];
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
