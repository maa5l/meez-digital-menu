import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isBrevoConfigured, sendBrevoEmail } from "./brevo.js";
import { getServiceSupabase, processNotificationOutbox } from "./notifications.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function adminEmails(): string[] {
  const raw =
    process.env.ADMIN_ALERT_EMAIL?.trim() ||
    process.env.ADMIN_ALERT_EMAILS?.trim() ||
    "mohammed.m.harmoush@gmail.com";
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

function render(html: string, params: Record<string, string>): string {
  let out = html;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{{params.${k}}}`).join(v).split(`{{${k}}}`).join(v);
  }
  return out;
}

function loadTemplate(name: string): string {
  return readFileSync(
    join(__dirname, "../../../supabase/templates/brevo", name),
    "utf8",
  );
}

export async function sendAdminAlertDirect(input: {
  title: string;
  eventLabel: string;
  detailsHtml: string;
  eventKey?: string;
}): Promise<{ ok: boolean; sent: number; error?: string }> {
  if (!isBrevoConfigured()) return { ok: false, sent: 0, error: "brevo_not_configured" };

  const emails = adminEmails();
  const now = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Riyadh" }).slice(0, 16);
  const appUrl = (process.env.APP_URL || process.env.VITE_APP_URL || "https://bymeez.com").replace(
    /\/$/,
    "",
  );
  const html = render(loadTemplate("admin-alert.html"), {
    title: input.title,
    event_label: input.eventLabel,
    details_html: input.detailsHtml,
    occurred_at: now,
    admin_url: `${appUrl}/admin`,
  });

  let sent = 0;
  let lastError: string | undefined;
  for (const email of emails) {
    const result = await sendBrevoEmail({
      toEmail: email,
      toName: "Meez Admin",
      subject: `تنبيه منصة Meez: ${input.title}`,
      htmlContent: html,
      tags: ["admin_alert", input.eventKey || "alert"],
    });
    if (result.ok) sent += 1;
    else lastError = result.error;
  }
  return { ok: sent > 0, sent, error: lastError };
}

export async function sendAdminDigestDirect(hours = 24): Promise<{
  ok: boolean;
  sent: number;
  source: "rpc_outbox" | "direct";
  error?: string;
}> {
  // Prefer DB digest into outbox when service role works
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb.rpc("enqueue_admin_digest", { p_hours: hours });
    if (!error) {
      const processed = await processNotificationOutbox(20);
      return {
        ok: true,
        sent: processed.sent,
        source: "rpc_outbox",
      };
    }
  } catch {
    /* fall through to direct */
  }

  if (!isBrevoConfigured()) {
    return { ok: false, sent: 0, source: "brevo_not_configured", source: "direct" };
  }

  const appUrl = (process.env.APP_URL || process.env.VITE_APP_URL || "https://bymeez.com").replace(
    /\/$/,
    "",
  );
  const now = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Riyadh" }).slice(0, 16);
  const html = render(loadTemplate("admin-digest.html"), {
    hours: String(hours),
    generated_at: now,
    new_registrations: "—",
    expiring_soon: "—",
    expired_or_stopped: "—",
    renewal_events: "—",
    registrations_html:
      "<div style=\"color:#8a8178\">فعّل SUPABASE_SERVICE_ROLE_KEY لملء الأرقام من قاعدة البيانات. هذا تأكيد تفعيل بريد الإدارة.</div>",
    alerts_html:
      "<div>يشمل: توقف المنصة، إيقاف/إلغاء اشتراك، اشتراكات قاربت على الانتهاء.</div>",
    renewals_html:
      "<div>يشمل: تفعيل، تمديد، تأكيد تجديد، وطلبات التجديد المسجّلة.</div>",
    admin_url: `${appUrl}/admin`,
  });

  let sent = 0;
  let lastError: string | undefined;
  for (const email of adminEmails()) {
    const result = await sendBrevoEmail({
      toEmail: email,
      toName: "Meez Admin",
      subject: `تقرير Meez الدوري — آخر ${hours} ساعة`,
      htmlContent: html,
      tags: ["admin_digest"],
    });
    if (result.ok) sent += 1;
    else lastError = result.error;
  }

  return { ok: sent > 0, sent, source: lastError, source: "direct" };
}
