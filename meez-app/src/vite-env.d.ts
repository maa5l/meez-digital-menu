/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_MENU_WEB_URL: string;
  readonly VITE_PUBLIC_SITE_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
