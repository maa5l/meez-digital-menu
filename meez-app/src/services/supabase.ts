import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appEnv, isSupabaseConfigured } from "@/config/env";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }
  if (!client) {
    client = createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey);
  }
  return client;
}
