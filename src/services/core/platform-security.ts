import type { VenueData } from "@/types/venue";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { appEnv } from "@/config/env";
import type { DeviceActivationResult } from "@/types/subscription";

export async function updateVenueDataRpc(
  venue: VenueData,
): Promise<{ ok: boolean; error?: string; updatedAt?: string }> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    return { ok: true };
  }

  const { data, error } = await getSupabase().rpc("update_venue_data", {
    p_data: venue as unknown as Record<string, unknown>,
  });

  if (error) {
    logger.error("core.venue_update_failed", { message: error.message });
    return { ok: false, error: error.message };
  }

  if (!data || typeof data !== "object") return { ok: false, error: "invalid_response" };
  const row = data as Record<string, unknown>;
  const updatedAt =
    typeof row.updated_at === "string"
      ? row.updated_at
      : row.updated_at != null
        ? String(row.updated_at)
        : undefined;
  return {
    ok: Boolean(row.ok),
    error: typeof row.error === "string" ? row.error : undefined,
    updatedAt,
  };
}

export async function fetchDashboardPreviewVenue(): Promise<VenueData | null> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) return null;

  const { data, error } = await getSupabase().rpc("get_dashboard_preview_venue");

  if (error) {
    logger.error("core.preview_fetch_failed", { message: error.message });
    return null;
  }

  if (!data || typeof data !== "object") return null;
  return data as VenueData;
}

export async function registerDeviceWithLicense(
  code: string,
  menuType?: "products" | "crops",
  deviceName?: string,
): Promise<DeviceActivationResult> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    return { ok: true, code: code.trim().toUpperCase() };
  }

  const { data, error } = await getSupabase().rpc("register_device_with_license", {
    p_code: code.trim().toUpperCase(),
    p_menu_type: menuType ?? null,
    p_device_name: deviceName ?? null,
    p_app_env: "production",
  });

  if (error) {
    logger.error("core.device_register_failed", { message: error.message });
    throw error;
  }

  if (!data || typeof data !== "object") return { ok: false, error: "invalid_response" };
  const row = data as Record<string, unknown>;
  return {
    ok: Boolean(row.ok),
    code: typeof row.code === "string" ? row.code : undefined,
    error: typeof row.error === "string" ? row.error : undefined,
  };
}

/** إلغاء تفعيل جميع أجهزة المالك الحالي */
export async function deactivateAllOwnerDevicesRpc(): Promise<{ ok: boolean; count?: number; error?: string }> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    return { ok: true, count: 0 };
  }

  const { data, error } = await getSupabase().rpc("deactivate_all_my_devices");

  if (error) {
    logger.error("core.device_deactivate_all_failed", { message: error.message });
    return { ok: false, error: error.message };
  }

  if (!data || typeof data !== "object") return { ok: false, error: "invalid_response" };
  const row = data as Record<string, unknown>;
  return {
    ok: Boolean(row.ok),
    count: typeof row.count === "number" ? row.count : Number(row.count ?? 0),
    error: typeof row.error === "string" ? row.error : undefined,
  };
}

export async function deactivateDeviceRpc(code: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    return { ok: true };
  }

  const { data, error } = await getSupabase().rpc("deactivate_device", {
    p_code: code.trim().toUpperCase(),
  });

  if (error) {
    logger.error("core.device_deactivate_failed", { message: error.message });
    return { ok: false, error: error.message };
  }

  if (!data || typeof data !== "object") return { ok: false, error: "invalid_response" };
  const row = data as Record<string, unknown>;
  return { ok: Boolean(row.ok), error: typeof row.error === "string" ? row.error : undefined };
}

export async function writeClientAuditLog(
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) return;

  const { error } = await getSupabase().rpc("write_client_audit_log", {
    p_action: action,
    p_metadata: (metadata ?? {}) as Record<string, unknown>,
  });

  if (error) {
    logger.warn("core.audit_log_failed", { action, message: error.message });
  }
}
