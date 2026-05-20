import { appEnv } from "@/config/env";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { VenueData } from "@/types/venue";
import { logger } from "@/lib/logger";

export function shouldUseVenueDatabase(): boolean {
  return isSupabaseConfigured() && !appEnv.useLocalMockAuth;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function fetchVenueFromDatabase(ownerId: string): Promise<VenueData | null> {
  if (!shouldUseVenueDatabase()) return null;

  const { data, error } = await getSupabase()
    .from("venues")
    .select("data, updated_at")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    logger.error("venue.fetch_failed", { ownerId, message: error.message });
    throw error;
  }

  if (!data?.data || typeof data.data !== "object") return null;
  return data.data as VenueData;
}

export async function saveVenueToDatabase(ownerId: string, venue: VenueData): Promise<void> {
  if (!shouldUseVenueDatabase()) return;

  const payload: Database["public"]["Tables"]["venues"]["Insert"] = {
    owner_id: ownerId,
    data: venue as unknown as Database["public"]["Tables"]["venues"]["Insert"]["data"],
  };

  const { error } = await getSupabase().from("venues").upsert(payload, { onConflict: "owner_id" });

  if (error) {
    logger.error("venue.save_failed", { ownerId, message: error.message });
    throw error;
  }

  logger.audit("venue.saved_cloud", { ownerId });
}

export async function fetchVenueForDeviceFromDatabase(code: string): Promise<VenueData | null> {
  if (!shouldUseVenueDatabase()) return null;

  const { data, error } = await getSupabase().rpc("get_venue_for_device", {
    device_code: normalizeCode(code),
  });

  if (error) {
    logger.error("venue.device_fetch_failed", { code, message: error.message });
    throw error;
  }

  if (!data || typeof data !== "object") return null;
  return data as VenueData;
}

export async function isDeviceActivatedInDatabase(code: string): Promise<boolean> {
  if (!shouldUseVenueDatabase()) return false;

  const { data, error } = await getSupabase().rpc("is_device_activated", {
    device_code: normalizeCode(code),
  });

  if (error) {
    logger.error("device.activation_check_failed", { code, message: error.message });
    return false;
  }

  return Boolean(data);
}

export async function getDeviceMenuTypeFromDatabase(
  code: string,
): Promise<"products" | "crops" | null> {
  if (!shouldUseVenueDatabase()) return null;

  const { data, error } = await getSupabase().rpc("get_device_menu_type", {
    device_code: normalizeCode(code),
  });

  if (error) {
    logger.error("device.menu_type_failed", { code, message: error.message });
    return null;
  }

  if (data === "products" || data === "crops") return data;
  return null;
}

export async function upsertDeviceActivationInDatabase(
  code: string,
  ownerId: string,
  menuType?: "products" | "crops",
): Promise<void> {
  if (!shouldUseVenueDatabase()) return;

  const { error } = await getSupabase()
    .from("device_activations")
    .upsert(
      {
        code: normalizeCode(code),
        owner_id: ownerId,
        menu_type: menuType ?? null,
        activated_at: new Date().toISOString(),
      },
      { onConflict: "code" },
    );

  if (error) {
    logger.error("device.activation_save_failed", { code, message: error.message });
    throw error;
  }

  logger.audit("device.activation_saved_cloud", { code });
}

export async function removeDeviceActivationFromDatabase(code: string): Promise<void> {
  if (!shouldUseVenueDatabase()) return;

  const { error } = await getSupabase()
    .from("device_activations")
    .delete()
    .eq("code", normalizeCode(code));

  if (error) {
    logger.error("device.activation_delete_failed", { code, message: error.message });
    throw error;
  }
}
