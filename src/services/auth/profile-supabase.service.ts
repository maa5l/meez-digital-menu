import type { User } from "@supabase/supabase-js";
import { appEnv } from "@/config/env";
import { getSupabase } from "@/lib/supabase/client";
import { getSession } from "@/security/session";
import { loadVenueData } from "@/lib/venue-store";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";
import { logger } from "@/lib/logger";
import type { UserProfile, UserProfileUpdate } from "@/types/profile";

const PROFILE_SELECT =
  "id, email, full_name, venue_name, role, created_at, updated_at" as const;

function profileErrorMessage(error: { message?: string; code?: string }): string {
  const msg = error.message ?? "خطأ غير معروف";
  if (error.code === "PGRST204" && msg.includes("phone")) {
    return "عمود phone غير موجود. نفّذ supabase/FIX_PROFILES_PHONE.sql في Supabase SQL Editor.";
  }
  if (msg.includes("relation") && msg.includes("profiles")) {
    return "جدول profiles غير موجود. نفّذ supabase/FIX_PROFILES.sql في SQL Editor.";
  }
  if (error.code === "42501" || msg.toLowerCase().includes("row-level security")) {
    return "صلاحيات profiles ناقصة. نفّذ supabase/FIX_PROFILES.sql في SQL Editor.";
  }
  if (error.code === "PGRST202" || msg.includes("ensure_profile")) {
    return "دالة ensure_profile غير موجودة. نفّذ supabase/FIX_PROFILES_PHONE.sql في SQL Editor.";
  }
  if (appEnv.isDev) return `${msg}${error.code ? ` (${error.code})` : ""}`;
  return "تعذّر حفظ الملف الشخصي. نفّذ supabase/FIX_PROFILES_PHONE.sql ثم أعد المحاولة.";
}

function isMissingPhoneColumn(error: { message?: string; code?: string }): boolean {
  return error.code === "PGRST204" && (error.message?.includes("phone") ?? false);
}

function mapProfileRow(
  row: {
    id: string;
    email: string;
    full_name: string | null;
    venue_name: string | null;
    role: string;
    created_at?: string;
    updated_at?: string;
  },
  phone: string | null = null,
): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    venueName: row.venue_name,
    phone,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function readPhoneFromAuthMetadata(): Promise<string | null> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error) return null;
  const raw = data.user?.user_metadata?.phone;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

async function callEnsureProfile(args: {
  p_full_name: string | null;
  p_venue_name: string | null;
  p_phone: string | null;
}): Promise<{ ok: boolean; error?: { message?: string; code?: string } }> {
  const supabase = getSupabase();

  const withPhone = await supabase.rpc("ensure_profile", args);
  if (!withPhone.error) return { ok: true };

  if (!isMissingPhoneColumn(withPhone.error) && withPhone.error.code !== "PGRST202") {
    return { ok: false, error: withPhone.error };
  }

  const legacy = await supabase.rpc("ensure_profile", {
    p_full_name: args.p_full_name,
    p_venue_name: args.p_venue_name,
  });
  if (!legacy.error) return { ok: true };
  return { ok: false, error: legacy.error };
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
  const phone = (meta.phone as string | undefined)?.trim() ?? "";

  const rpc = await callEnsureProfile({
    p_full_name: fullName || null,
    p_venue_name: venue || null,
    p_phone: phone || null,
  });

  if (rpc.ok) {
    logger.audit("profile.ensured", { userId: user.id, via: "rpc" });
    return;
  }

  if (rpc.error) {
    logger.warn("profile.rpc_failed", { userId: user.id, message: rpc.error.message });
  }

  const supabase = getSupabase();
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
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
    if (updateError) throw new Error(profileErrorMessage(updateError));
  } else {
    const { error: insertError } = await supabase.from("profiles").insert(row);
    if (insertError?.code === "23505") {
      const { error: retryUpdate } = await supabase.from("profiles").update(row).eq("id", user.id);
      if (retryUpdate) throw new Error(profileErrorMessage(retryUpdate));
    } else if (insertError) {
      throw new Error(profileErrorMessage(insertError));
    }
  }

  if (phone) {
    await supabase.auth.updateUser({ data: { phone } });
  }

  logger.audit("profile.ensured", { userId: user.id, via: "table" });
}

/** يضمن صف venues مرتبط بالحساب */
export async function ensureVenueRecordForOwner(): Promise<void> {
  if (!shouldUseVenueDatabase()) return;

  const { error } = await getSupabase().rpc("ensure_venue_for_owner");
  if (error) {
    logger.warn("venue.ensure_rpc_failed", { message: error.message });
  }
}

/** جلب ملف المستخدم من قاعدة البيانات */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!shouldUseVenueDatabase()) {
    const session = getSession();
    if (!session || session.userId !== userId) return null;
    const venue = loadVenueData(userId);
    return {
      id: userId,
      email: session.email,
      fullName: null,
      venueName: venue.menuSettings.featuredTitle?.trim() || null,
      phone: null,
      role: session.role,
    };
  }

  const { data, error } = await getSupabase()
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logger.error("profile.fetch_failed", { userId, message: error.message });
    throw new Error(profileErrorMessage(error));
  }

  if (!data) return null;
  const phone = await readPhoneFromAuthMetadata();
  return mapProfileRow(data, phone);
}

/** تحديث التفاصيل في profiles + metadata في Auth */
export async function updateUserProfile(
  userId: string,
  patch: UserProfileUpdate,
): Promise<UserProfile> {
  const fullName = patch.fullName?.trim();
  const venueName = patch.venueName?.trim();
  const phone = patch.phone?.trim();

  if (!shouldUseVenueDatabase()) {
    const session = getSession();
    if (!session || session.userId !== userId) {
      throw new Error("يجب تسجيل الدخول أولاً");
    }
    return {
      id: userId,
      email: session.email,
      fullName: fullName ?? null,
      venueName: venueName ?? null,
      phone: phone ?? null,
      role: session.role,
    };
  }

  const supabase = getSupabase();

  const rpc = await callEnsureProfile({
    p_full_name: fullName ?? null,
    p_venue_name: venueName ?? null,
    p_phone: phone ?? null,
  });

  if (!rpc.ok && rpc.error) {
    const updates: Record<string, string | null> = {};
    if (fullName !== undefined) updates.full_name = fullName || null;
    if (venueName !== undefined) updates.venue_name = venueName || null;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", userId);
      if (updateError) throw new Error(profileErrorMessage(updateError));
    }
  }

  const meta: Record<string, string> = {};
  if (fullName) meta.full_name = fullName;
  if (venueName) meta.venue_name = venueName;
  if (phone !== undefined) meta.phone = phone;

  if (Object.keys(meta).length > 0) {
    const { error: authError } = await supabase.auth.updateUser({ data: meta });
    if (authError) {
      logger.warn("profile.auth_metadata_failed", { message: authError.message });
    }
  }

  const profile = await fetchUserProfile(userId);
  if (!profile) throw new Error("تعذّر تحميل الملف بعد الحفظ");
  logger.audit("profile.updated", { userId });
  return profile;
}
