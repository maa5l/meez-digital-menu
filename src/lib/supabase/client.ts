import { createClient } from "@supabase/supabase-js";
import { appEnv } from "@/config/env";

export type Database = Record<string, never>;

let client: ReturnType<typeof createClient<Database>> | null = null;

/**
 * عميل Supabase — يُنشأ عند توفر URL ومفتاح anon/publishable.
 */
export function getSupabase() {
  if (!appEnv.supabaseUrl || !appEnv.supabaseAnonKey) {
    throw new Error(
      "Supabase غير مضبوط. أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في .env.local",
    );
  }

  if (!client) {
    client = createClient<Database>(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey);
}
