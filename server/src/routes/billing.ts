import { Router } from "express";
import { z } from "zod";
import { requireSupabaseAuth, type AuthedRequest } from "../middleware/supabaseAuth.js";
import { getSupabaseAdmin } from "../lib/supabase-admin.js";
import { createHmac } from "node:crypto";

export const billingRouter = Router();

const checkoutSchema = z.object({
  screen_count: z.number().int().min(1).max(50),
  billing_cycle: z.enum(["monthly", "yearly"]),
});

const confirmMockSchema = checkoutSchema.extend({
  mode: z.literal("mock"),
  card_last4: z.string().length(4).optional(),
  cardholder_name: z.string().max(80).optional(),
});

const confirmMoyasarSchema = checkoutSchema.extend({
  mode: z.literal("moyasar"),
  payment_id: z.string().min(1),
});

const MONTHLY_PER_SCREEN = 45;
const YEARLY_PER_SCREEN = 450;

function computeAmount(screenCount: number, cycle: "monthly" | "yearly"): number {
  return cycle === "yearly"
    ? screenCount * YEARLY_PER_SCREEN
    : screenCount * MONTHLY_PER_SCREEN;
}

async function activateSubscription(
  ownerId: string,
  screenCount: number,
  billingCycle: "monthly" | "yearly",
  extra: Record<string, unknown> = {},
) {
  const supabase = getSupabaseAdmin();
  const amount = computeAmount(screenCount, billingCycle);
  return supabase.rpc("process_billing_webhook", {
    p_owner_id: ownerId,
    p_event: "payment.success",
    p_payload: {
      screen_count: screenCount,
      billing_cycle: billingCycle,
      amount_sar: amount,
      ...extra,
    },
  });
}

/** تحضير جلسة دفع — لا يخصم */
billingRouter.post("/checkout/prepare", requireSupabaseAuth, async (req: AuthedRequest, res, next) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
      return;
    }

    const ownerId = req.userId!;
    const { screen_count, billing_cycle } = parsed.data;
    const amount = computeAmount(screen_count, billing_cycle);
    const mockPayments = process.env.BILLING_MOCK_PAYMENTS === "true";
    const appUrl = process.env.APP_URL ?? "http://localhost:8080";

    if (mockPayments) {
      res.json({
        ok: true,
        mode: "mock",
        session_id: `mock-${ownerId.slice(0, 8)}-${Date.now()}`,
        amount_sar: amount,
        currency: "SAR",
        screen_count,
        billing_cycle,
      });
      return;
    }

    const publishableKey = process.env.MOYASAR_PUBLISHABLE_KEY;
    if (!publishableKey) {
      res.status(503).json({
        error: "payment_provider_not_configured",
        hint: "Set BILLING_MOCK_PAYMENTS=true for development",
      });
      return;
    }

    const reference = `meez-${ownerId.slice(0, 8)}-${Date.now()}`;
    const callbackParams = new URLSearchParams({
      payment: "return",
      screens: String(screen_count),
      cycle: billing_cycle,
    });

    res.json({
      ok: true,
      mode: "moyasar",
      publishable_key: publishableKey,
      amount_halalas: amount * 100,
      amount_sar: amount,
      currency: "SAR",
      description: `قائمة — ${screen_count} شاشة (${billing_cycle === "yearly" ? "سنوي" : "شهري"})`,
      callback_url: `${appUrl}/dashboard/subscription/pay?${callbackParams.toString()}`,
      metadata: {
        owner_id: ownerId,
        screen_count: String(screen_count),
        billing_cycle,
        reference,
      },
      screen_count,
      billing_cycle,
    });
  } catch (err) {
    next(err);
  }
});

/** تأكيد الدفع بعد إدخال البطاقة أو العودة من Moyasar */
billingRouter.post("/checkout/confirm", requireSupabaseAuth, async (req: AuthedRequest, res, next) => {
  try {
    const ownerId = req.userId!;

    const mockParsed = confirmMockSchema.safeParse(req.body);
    if (mockParsed.success) {
      const { screen_count, billing_cycle, card_last4, cardholder_name } = mockParsed.data;
      const { data, error } = await activateSubscription(ownerId, screen_count, billing_cycle, {
        card_last4,
        cardholder_name,
        mock: true,
      });
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.json({ ok: true, mode: "mock", result: data });
      return;
    }

    const moyasarParsed = confirmMoyasarSchema.safeParse(req.body);
    if (moyasarParsed.success) {
      const secret = process.env.MOYASAR_SECRET_KEY;
      if (!secret) {
        res.status(503).json({ error: "moyasar_secret_not_configured" });
        return;
      }

      const { payment_id, screen_count, billing_cycle } = moyasarParsed.data;
      const payRes = await fetch(`https://api.moyasar.com/v1/payments/${payment_id}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
        },
      });

      if (!payRes.ok) {
        res.status(402).json({ error: "payment_verification_failed" });
        return;
      }

      const payment = (await payRes.json()) as {
        status?: string;
        metadata?: Record<string, string>;
        amount?: number;
      };

      if (payment.status !== "paid") {
        res.status(402).json({ error: "payment_not_paid", status: payment.status });
        return;
      }

      if (payment.metadata?.owner_id && payment.metadata.owner_id !== ownerId) {
        res.status(403).json({ error: "payment_owner_mismatch" });
        return;
      }

      const { data, error } = await activateSubscription(ownerId, screen_count, billing_cycle, {
        payment_id,
        moyasar: true,
      });

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ ok: true, mode: "moyasar", result: data });
      return;
    }

    res.status(400).json({ error: "invalid_payload" });
  } catch (err) {
    next(err);
  }
});

/** @deprecated — استخدم prepare + confirm */
billingRouter.post("/checkout", requireSupabaseAuth, async (req: AuthedRequest, res, next) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_payload" });
      return;
    }
    if (process.env.BILLING_MOCK_PAYMENTS === "true") {
      const { data, error } = await activateSubscription(
        req.userId!,
        parsed.data.screen_count,
        parsed.data.billing_cycle,
        { mock: true, legacy_checkout: true },
      );
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.json({ ok: true, mode: "mock", result: data });
      return;
    }
    res.status(400).json({ error: "use_checkout_prepare", redirect: "/dashboard/subscription/pay" });
  } catch (err) {
    next(err);
  }
});

billingRouter.post("/simulate-payment", requireSupabaseAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (process.env.BILLING_MOCK_PAYMENTS !== "true") {
      res.status(403).json({ error: "mock_disabled" });
      return;
    }

    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_payload" });
      return;
    }

    const secret = process.env.BILLING_WEBHOOK_SECRET ?? "dev-secret";
    const body = JSON.stringify({
      event: "payment.success",
      owner_id: req.userId,
      screen_count: parsed.data.screen_count,
      billing_cycle: parsed.data.billing_cycle,
    });
    const sig = createHmac("sha256", secret).update(body).digest("hex");

    res.json({
      webhook_url: "/api/v1/webhooks/billing",
      signature: `sha256=${sig}`,
      body: JSON.parse(body),
    });
  } catch (err) {
    next(err);
  }
});
