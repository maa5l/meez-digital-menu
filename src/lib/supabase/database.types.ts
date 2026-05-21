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
      device_activations: {
        Row: {
          code: string;
          owner_id: string;
          menu_type: "products" | "crops" | null;
          activated_at: string;
        };
        Insert: {
          code: string;
          owner_id: string;
          menu_type?: "products" | "crops" | null;
          activated_at?: string;
        };
        Update: {
          code?: string;
          owner_id?: string;
          menu_type?: "products" | "crops" | null;
          activated_at?: string;
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
      get_venue_for_device: {
        Args: { device_code: string };
        Returns: Json;
      };
      is_device_activated: {
        Args: { device_code: string };
        Returns: boolean;
      };
      get_device_menu_type: {
        Args: { device_code: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
