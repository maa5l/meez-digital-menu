import { appEnv, resolveAppOrigin } from "@/config/env";
import type { BillingCycle } from "@/config/billing";
import { priceForScreens } from "@/config/billing";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { notifySubscriptionUpdated } from "@/hooks/useSubscription";
import type { CardPaymentInput } from "@/validations/payment.schema";

const PREPARE_TIMEOUT_MS = 12_000;

export type CheckoutSession =
  | {
      mode: "mock";
      amount_sar: number;
      screen_count: number;
      billing_cycle: BillingCycle;
      session_id: string;
      offline?: boolean;
    }
  | {
      mode: "moyasar";
      publishable_key: string;
      amount_halalas: number;
      amount_sar: number;
      description: string;
      callback_url: string;
      metadata: Record<string, string>;
      screen_count: number;
      billing_cycle: BillingCycle;
    };

export type PrepareCheckoutResult =
  | { ok: true; session: CheckoutSession }
  | { ok: false; error: string };

function localMockSession(screenCount: number, billingCycle: BillingCycle, offline = false): CheckoutSession {
  return {
    mode: "mock",
    amount_sar: priceForScreens(screenCount, billingCycle),
    screen_count: screenCount,
    billing_cycle: billingCycle,
    session_id: `mock-${Date.now()}`,
    offline,
  };
}

function apiBase(): string | null {
  const base = appEnv.apiBaseUrl?.replace(/\/$/, "");
  return base || null;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("سجّل الدخول أولاً");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function fetchPrepareFromApi(
  screenCount: number,
  billingCycle: BillingCycle,
): Promise<PrepareCheckoutResult | null> {
  const base = apiBase();
  if (!base || !isSupabaseConfigured()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREPARE_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/billing/checkout/prepare`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        screen_count: screenCount,
        billing_cycle: billingCycle,
      }),
      signal: controller.signal,
    });

    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      logger.warn("billing.prepare_api_error", { status: res.status, error: json.error });
      return null;
    }

    const amount = priceForScreens(screenCount, billingCycle);

    if (json.mode === "mock") {
      return {
        ok: true,
        session: {
          mode: "mock",
          amount_sar: Number(json.amount_sar ?? amount),
          screen_count: screenCount,
          billing_cycle: billingCycle,
          session_id: String(json.session_id ?? `mock-${Date.now()}`),
        },
      };
    }

    if (json.mode === "moyasar" && json.publishable_key) {
      return {
        ok: true,
        session: {
          mode: "moyasar",
          publishable_key: String(json.publishable_key),
          amount_halalas: Number(json.amount_halalas),
          amount_sar: Number(json.amount_sar),
          description: String(json.description),
          callback_url: String(json.callback_url),
          metadata: (json.metadata as Record<string, string>) ?? {},
          screen_count: screenCount,
          billing_cycle: billingCycle,
        },
      };
    }

    return null;
  } catch (err) {
    logger.warn("billing.prepare_api_unreachable", {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** تحضير جلسة دفع — يعمل محلياً حتى بدون خادم Express */
export async function prepareCheckout(
  screenCount: number,
  billingCycle: BillingCycle,
): Promise<PrepareCheckoutResult> {
  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    return { ok: true, session: localMockSession(screenCount, billingCycle) };
  }

  const fromApi = await fetchPrepareFromApi(screenCount, billingCycle);
  if (fromApi?.ok) return fromApi;

  return {
    ok: true,
    session: localMockSession(screenCount, billingCycle, true),
  };
}

/** تعطيل تأكيد الدفع من العميل — service_role / Express فقط */
async function confirmViaSupabase(): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: "payment_confirm_requires_server" };
}

async function confirmViaApi(
  screenCount: number,
  billingCycle: BillingCycle,
  card: CardPaymentInput,
): Promise<{ ok: boolean; error?: string }> {
  const base = apiBase();
  if (!base) return { ok: false, error: "no_api" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREPARE_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/billing/checkout/confirm`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        mode: "mock",
        screen_count: screenCount,
        billing_cycle: billingCycle,
        card_last4: card.cardNumber.slice(-4),
        cardholder_name: card.cardholderName,
      }),
      signal: controller.signal,
    });

    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      return { ok: false, error: typeof json.error === "string" ? json.error : "confirm_failed" };
    }

    notifySubscriptionUpdated();
    return { ok: true };
  } catch {
    return { ok: false, error: "api_unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

/** تأكيد الدفع — نموذج البطاقة */
export async function confirmMockCardPayment(
  screenCount: number,
  billingCycle: BillingCycle,
  card: CardPaymentInput,
): Promise<{ ok: boolean; error?: string }> {
  const last4 = card.cardNumber.slice(-4);

  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    logger.audit("billing.mock_card_confirmed", { screenCount, billingCycle, last4 });
    notifySubscriptionUpdated();
    return { ok: true };
  }

  const viaApi = await confirmViaApi(screenCount, billingCycle, card);
  if (viaApi.ok) return viaApi;

  return confirmViaSupabase();
}

/** بعد العودة من Moyasar */
export async function confirmMoyasarReturn(
  paymentId: string,
  screenCount: number,
  billingCycle: BillingCycle,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "not_configured" };

  const base = apiBase();
  if (base) {
    try {
      const res = await fetch(`${base}/billing/checkout/confirm`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          mode: "moyasar",
          payment_id: paymentId,
          screen_count: screenCount,
          billing_cycle: billingCycle,
        }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (res.ok) {
        notifySubscriptionUpdated();
        return { ok: true };
      }
      logger.warn("billing.moyasar_confirm_api_failed", { error: json.error });
    } catch {
      /* fallback below */
    }
  }

  return { ok: false, error: "moyasar_confirm_requires_api" };
}

export function billingReturnUrl(screens: number, cycle: BillingCycle): string {
  const params = new URLSearchParams({
    payment: "return",
    screens: String(screens),
    cycle,
  });
  return `${resolveAppOrigin()}/dashboard/subscription/pay?${params.toString()}`;
}

export function billingPayUrl(screens: number, cycle: BillingCycle): string {
  const params = new URLSearchParams({
    screens: String(screens),
    cycle,
  });
  return `/dashboard/subscription/pay?${params.toString()}`;
}
