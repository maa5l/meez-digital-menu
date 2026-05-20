import type { User } from "@supabase/supabase-js";
import { appEnv } from "@/config/env";
import { getSupabase } from "@/lib/supabase/client";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";
import { logger } from "@/lib/logger";

function profileErrorMessage(error: { message?: string; code?: string; details?: string }): string {
  const msg = error.message ?? "خطأ غير معروف";
  if (msg.includes("relation") && msg.includes("profiles")) {
    return "جدول profiles غير موجود. نفّذ supabase/FIX_PROFILES.sql في SQL Editor.";
  }
  if (error.code === "42501" || msg.toLowerCase().includes("row-level security")) {
    return "صلاحيات profiles ناقصة. نفّذ supabase/FIX_PROFILES.sql في SQL Editor.";
  }
  if (error.code === "PGRST202" || msg.includes("ensure_profile")) {
    return "دالة ensure_profile غير موجودة. نفّذ supabase/FIX_PROFILES.sql في SQL Editor.";
  }
  if (appEnv.isDev) return `${msg}${error.code ? ` (${error.code})` : ""}`;
  return "تعذّر حفظ الملف الشخصي. نفّذ supabase/FIX_PROFILES.sql في Supabase ثم أعد المحاولة.";
}

/** يضمن وجود صف في profiles */
export async function ensureUserProfile(user: User, venueName?: string): Promise<void> {
  if (!shouldUseVenueDatabase()) return;

  const email = user.email?.trim();
  if (!email) return;

  const meta = user.user_metadata ?? {};
  const fullName = (meta.full_name as string | undefined) ?? "";
  const venue =
    venueName?.trim() ||
    (meta.venue_name as string | undefined)?.trim() ||
    "";

  const supabase = getSupabase();

  // 1) الدالة الآمنة (الأفضل — تتجاوز RLS)
  const { error: rpcError } = await supabase.rpc("ensure_profile", {
    p_full_name: fullName || null,
    p_venue_name: venue || null,
  });

  if (!rpcError) {
    logger.audit("profile.ensured", { userId: user.id, via: "rpc" });
    return;
  }

  logger.warn("profile.rpc_failed", { userId: user.id, message: rpcError.message });

  // 2) احتياط: select ثم update أو insert
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    logger.error("profile.select_failed", { userId: user.id, message: selectError.message });
    throw new Error(profileErrorMessage(selectError));
  }

  const row = {
    id: user.id,
    email,
    full_name: fullName || null,
    venue_name: venue || null,
    role: "owner" as const,
  };

  if (existing) {
    const { error: updateError } = await supabase.from("profiles").update(row).eq("id", user.id);
    if (updateError) {
      logger.error("profile.update_failed", { userId: user.id, message: updateError.message });
      throw new Error(profileErrorMessage(updateError));
    }
  } else {
    const { error: insertError } = await supabase.from("profiles").insert(row);
    if (insertError) {
      // قد يكون الـ trigger أنشأ الصف بين select و insert
      if (insertError.code === "23505") {
        const { error: retryUpdate } = await supabase.from("profiles").update(row).eq("id", user.id);
        if (!retryUpdate) {
          logger.audit("profile.ensured", { userId: user.id, via: "retry_update" });
          return;
        }
        throw new Error(profileErrorMessage(retryUpdate));
      }
      logger.error("profile.insert_failed", { userId: user.id, message: insertError.message });
      throw new Error(profileErrorMessage(insertError));
    }
  }

  logger.audit("profile.ensured", { userId: user.id, via: "table" });
}
