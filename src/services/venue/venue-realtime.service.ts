import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function removeChannel(channel: RealtimeChannel | null): void {
  if (!channel) return;
  void getSupabase().removeChannel(channel);
}

/** اشتراك Realtime — تغيّر تفعيل/فصل جهاز بالرمز */
export function subscribeDeviceActivationChanges(
  code: string,
  onChange: () => void,
): () => void {
  if (!shouldUseVenueDatabase()) return () => {};

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

/** اشتراك Realtime — تحديث منيو المالك (منتجات/ألوان) */
export function subscribeVenueChanges(ownerId: string, onChange: () => void): () => void {
  if (!shouldUseVenueDatabase() || !ownerId) return () => {};

  const supabase = getSupabase();

  const channel = supabase
    .channel(`rt:venue:${ownerId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "venues",
        filter: `owner_id=eq.${ownerId}`,
      },
      () => {
        logger.debug("realtime.venue_updated", { ownerId });
        onChange();
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        logger.warn("realtime.venue_channel_error", { ownerId });
      }
    });

  return () => removeChannel(channel);
}
