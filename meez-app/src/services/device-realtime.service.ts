import type { RealtimeChannel } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/config/env";
import { getSupabase } from "@/services/supabase";
import { logger } from "@/lib/logger";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function removeChannel(channel: RealtimeChannel | null): void {
  if (!channel) return;
  void getSupabase().removeChannel(channel);
}

/** Realtime — التفعيل/الفصل من لوحة التحكم */
export function subscribeDeviceActivationChanges(
  code: string,
  onChange: () => void,
): () => void {
  if (!isSupabaseConfigured()) return () => {};

  const normalized = normalizeCode(code);
  const supabase = getSupabase();

  const channel = supabase
    .channel(`rt:device:${normalized}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "device_activations",
        filter: `code=eq.${normalized}`,
      },
      () => {
        logger.debug("realtime.device_activation", { code: normalized });
        onChange();
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        logger.warn("realtime.device_channel_error", { code: normalized });
      }
    });

  return () => removeChannel(channel);
}
