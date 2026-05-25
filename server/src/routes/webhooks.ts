import { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getSupabaseAdmin } from "../lib/supabase-admin.js";

export const webhooksRouter = Router();

const billingEventSchema = z.object({
  event: z.enum([
    "payment.success",
    "payment.failed",
    "subscription.updated",
    "subscription.renewed",
    "subscription.canceled",
    "subscription.cancelled",
    "subscription.expired",
    "invoice.payment_failed",
  ]),
  owner_id: z.string().uuid(),
  screen_count: z.number().int().min(1).optional(),
  billing_cycle: z.enum(["monthly", "yearly"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

function verifySignature(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const sig = signature.replace(/^sha256=/, "");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}

webhooksRouter.post("/billing", async (req, res, next) => {
  try {
    const secret = process.env.BILLING_WEBHOOK_SECRET;
    if (!secret) {
      res.status(503).json({ error: "webhook_not_configured" });
      return;
    }

    const rawBody =
      (req as { rawBody?: string }).rawBody ??
      (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
    const signature = req.header("x-meez-signature") ?? req.header("x-webhook-signature");

    if (!verifySignature(rawBody, signature, secret)) {
      res.status(401).json({ error: "invalid_signature" });
      return;
    }

    const parsed = billingEventSchema.safeParse(
      typeof req.body === "object" ? req.body : JSON.parse(rawBody),
    );
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
      return;
    }

    const { event, owner_id, screen_count, billing_cycle, metadata } = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("process_billing_webhook", {
      p_owner_id: owner_id,
      p_event: event,
      p_payload: {
        screen_count,
        billing_cycle,
        ...metadata,
      },
    });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ ok: true, result: data });
  } catch (err) {
    next(err);
  }
});
