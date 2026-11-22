import { Router } from "express";
import {
  enqueueRenewalReminders,
  processNotificationOutbox,
} from "../services/notifications.js";
import { sendAdminAlertDirect, sendAdminDigestDirect } from "../services/admin-alerts.js";
import { isBrevoConfigured } from "../services/brevo.js";

export const notificationsRouter = Router();

function assertCronSecret(req: { header: (n: string) => string | undefined }): void {
  const expected = process.env.NOTIFICATIONS_CRON_SECRET?.trim();
  if (!expected) {
    const err = new Error("notifications_cron_secret_missing");
    (err as Error & { status: number }).status = 503;
    throw err;
  }
  const got = req.header("x-cron-secret") ?? req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (got !== expected) {
    const err = new Error("unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
}

notificationsRouter.get("/status", (_req, res) => {
  res.json({
    ok: true,
    brevoConfigured: isBrevoConfigured(),
    sender: process.env.BREVO_SENDER_EMAIL ? "[set]" : null,
    adminAlertEmail: process.env.ADMIN_ALERT_EMAIL ? "[set]" : "mohammed.m.harmoush@gmail.com",
  });
});

/** Drain pending email outbox via Brevo */
notificationsRouter.post("/process", async (req, res, next) => {
  try {
    assertCronSecret(req);
    const limit = Math.min(Number(req.body?.limit ?? 25) || 25, 100);
    const result = await processNotificationOutbox(limit);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

/** Enqueue renewal reminders then optionally process */
notificationsRouter.post("/reminders", async (req, res, next) => {
  try {
    assertCronSecret(req);
    const daysAhead = Math.min(Math.max(Number(req.body?.daysAhead ?? 7) || 7, 1), 30);
    const process = req.body?.process !== false;
    const enqueued = await enqueueRenewalReminders(daysAhead);
    const processed = process ? await processNotificationOutbox(50) : null;
    res.json({ ok: true, ...enqueued, processed });
  } catch (err) {
    next(err);
  }
});

/** تقرير دوري للإدارة: تسجيلات / توقف / تجديد */
notificationsRouter.post("/admin-digest", async (req, res, next) => {
  try {
    assertCronSecret(req);
    const hours = Math.min(Math.max(Number(req.body?.hours ?? 24) || 24, 1), 168);
    const result = await sendAdminDigestDirect(hours);
    res.json({ ok: result.ok, ...result });
  } catch (err) {
    next(err);
  }
});

/** تنبيه فوري اختباري للإدارة */
notificationsRouter.post("/admin-alert", async (req, res, next) => {
  try {
    assertCronSecret(req);
    const title = String(req.body?.title ?? "تنبيه تجريبي");
    const eventLabel = String(req.body?.eventLabel ?? "اختبار");
    const detailsHtml = String(
      req.body?.detailsHtml ?? "<div>هذا تنبيه تجريبي من خادم Meez.</div>",
    );
    const result = await sendAdminAlertDirect({
      title,
      eventLabel,
      detailsHtml,
      eventKey: String(req.body?.eventKey ?? "test"),
    });
    res.json({ ok: result.ok, ...result });
  } catch (err) {
    next(err);
  }
});

