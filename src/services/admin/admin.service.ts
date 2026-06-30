import type { PostgrestError } from "@supabase/supabase-js";
import type {
  AdminCustomer,
  AdminCustomerList,
  AdminDashboardStats,
  AdminProfile,
  AdminRole,
  AdminSubscriptionAction,
} from "@/types/admin";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ROUTES } from "@/config/app";
import { logger } from "@/lib/logger";

function isPostgrestError(err: unknown): err is PostgrestError {
  return Boolean(err && typeof err === "object" && "code" in err && "message" in err);
}

/** رسالة خطأ RPC مفهومة للمستخدم */
export function formatAdminRpcError(err: unknown): string {
  if (isPostgrestError(err)) {
    if (err.code === "PGRST202") {
      return "خدمة الإدارة غير مفعّلة — طبّق migrations على Supabase";
    }
    if (err.message.includes("admin_forbidden")) {
      return "حسابك ليس مديراً — شغّل bootstrap-admin.sql";
    }
    if (err.message.includes("admin_insufficient_role")) {
      return "صلاحياتك لا تسمح بهذا الإجراء";
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "تعذّر تحميل بيانات الإدارة";
}

function parseAdminProfile(raw: unknown): AdminProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!o.is_admin) return null;
  return {
    isAdmin: true,
    userId: String(o.user_id ?? ""),
    role: (o.role as AdminRole) ?? "support",
    email: String(o.email ?? ""),
    fullName: typeof o.full_name === "string" ? o.full_name : null,
  };
}

export async function fetchMyAdminProfile(): Promise<AdminProfile | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await getSupabase().rpc("get_my_admin_profile");
    if (error) {
      // Migration not applied yet — treat as non-admin
      if (error.code === "PGRST202") return null;
      logger.error("admin.profile_failed", { message: error.message, code: error.code });
      return null;
    }
    return parseAdminProfile(data);
  } catch (err) {
    logger.error("admin.profile_network", { message: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats | null> {
  const { data, error } = await getSupabase().rpc("admin_get_dashboard_stats");
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  return {
    totalCustomers: Number(o.total_customers ?? 0),
    activeCustomers: Number(o.active_customers ?? 0),
    trialCustomers: Number(o.trial_customers ?? 0),
    expiredCustomers: Number(o.expired_customers ?? 0),
    suspendedCustomers: Number(o.suspended_customers ?? 0),
    totalDevices: Number(o.total_devices ?? 0),
    newRegistrations7d: Number(o.new_registrations_7d ?? 0),
    recentActivity: Array.isArray(o.recent_activity) ? o.recent_activity : [],
  };
}

function parseCustomer(row: Record<string, unknown>): AdminCustomer {
  return {
    ownerId: String(row.owner_id ?? ""),
    fullName: typeof row.full_name === "string" ? row.full_name : null,
    email: String(row.email ?? ""),
    phone: typeof row.phone === "string" ? row.phone : null,
    venueName: typeof row.venue_name === "string" ? row.venue_name : null,
    registrationDate: typeof row.registration_date === "string" ? row.registration_date : null,
    lastActivityAt: typeof row.last_activity_at === "string" ? row.last_activity_at : null,
    lastLogin: typeof row.last_login === "string" ? row.last_login : null,
    subscriptionStatus: String(row.subscription_status ?? "expired"),
    trialStartedAt: typeof row.trial_started_at === "string" ? row.trial_started_at : null,
    trialEndsAt: typeof row.trial_ends_at === "string" ? row.trial_ends_at : null,
    subscriptionStartedAt:
      typeof row.subscription_started_at === "string" ? row.subscription_started_at : null,
    subscriptionEndsAt:
      typeof row.subscription_ends_at === "string" ? row.subscription_ends_at : null,
    deviceLimit: Number(row.device_limit ?? 0),
    manualActivation: Boolean(row.manual_activation),
    notes: typeof row.notes === "string" ? row.notes : null,
    internalNotes: typeof row.internal_notes === "string" ? row.internal_notes : null,
    deviceCount: Number(row.device_count ?? 0),
    productCount: Number(row.product_count ?? 0),
  };
}

export async function fetchAdminCustomers(
  search?: string,
  status?: string,
  limit = 50,
  offset = 0,
): Promise<AdminCustomerList> {
  const { data, error } = await getSupabase().rpc("admin_list_customers", {
    p_search: search ?? null,
    p_status: status ?? null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    logger.error("admin.customers_failed", { message: error.message, code: error.code });
    throw error;
  }
  if (!data || typeof data !== "object") return { total: 0, customers: [] };
  const o = data as Record<string, unknown>;
  const rows = Array.isArray(o.customers) ? o.customers : [];
  return {
    total: Number(o.total ?? 0),
    customers: rows.map((r) => parseCustomer(r as Record<string, unknown>)),
  };
}

export async function fetchAdminCustomer(ownerId: string): Promise<{
  customer: AdminCustomer;
  history: Record<string, unknown>[];
} | null> {
  const { data, error } = await getSupabase().rpc("admin_get_customer", {
    p_owner_id: ownerId,
  });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (!o.ok) return null;
  const customer = parseCustomer((o.customer ?? {}) as Record<string, unknown>);
  const history = Array.isArray(o.history) ? (o.history as Record<string, unknown>[]) : [];
  return { customer, history };
}

export async function adminUpdateSubscription(
  ownerId: string,
  action: AdminSubscriptionAction,
  options: {
    deviceLimit?: number;
    subscriptionEndsAt?: string;
    notes?: string;
    internalNotes?: string;
  } = {},
): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("admin_update_subscription", {
    p_owner_id: ownerId,
    p_action: action,
    p_device_limit: options.deviceLimit ?? null,
    p_subscription_ends_at: options.subscriptionEndsAt ?? null,
    p_notes: options.notes ?? null,
    p_internal_notes: options.internalNotes ?? null,
  });
  if (error) throw error;
  return Boolean((data as Record<string, unknown>)?.ok);
}

export function adminRoleLabel(role: AdminRole): string {
  switch (role) {
    case "super_admin":
      return "مدير عام";
    case "admin":
      return "مدير";
    case "support":
      return "دعم";
    default:
      return role;
  }
}

export function canAdminMutate(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin";
}

/** بعد تسجيل الدخول — مدير المنصة يُوجَّه إلى /admin */
export async function resolvePostAuthRoute(fallback: string): Promise<string> {
  const admin = await fetchMyAdminProfile();
  return admin?.isAdmin ? ROUTES.admin : fallback;
}
