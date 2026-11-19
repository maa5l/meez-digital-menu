import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, "server", ".env"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((l) => !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim()];
    }),
);

const key = env.BREVO_API_KEY;
const to = env.ADMIN_ALERT_EMAIL || "mohammed.m.harmoush@gmail.com";
const dir = path.join(root, "supabase", "templates", "brevo");

function render(html, params) {
  let out = html;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{{params.${k}}}`).join(v).split(`{{${k}}}`).join(v);
  }
  return out;
}

async function send(subject, file, params, tag) {
  const html = render(fs.readFileSync(path.join(dir, file), "utf8"), params);
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": key,
    },
    body: JSON.stringify({
      sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
      to: [{ email: to, name: "Mohammed Harmoush" }],
      subject,
      htmlContent: html,
      tags: [tag],
    }),
  });
  const text = await res.text();
  console.log(tag, "status=" + res.status, text.slice(0, 160));
}

const now = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Riyadh" }).slice(0, 16);

await send(
  "تنبيه منصة Meez: تفعيل بريد الإدارة",
  "admin-alert.html",
  {
    title: "تفعيل بريد الإدارة",
    event_label: "إعداد النظام",
    details_html:
      `<div><strong>البريد:</strong> ${to}</div>` +
      "<div>ستصلك تنبيهات فورية عند: تسجيل جديد، إيقاف/إلغاء منصة، تفعيل أو تمديد اشتراك.</div>" +
      "<div>وتقرير دوري كل 24 ساعة بالملخص.</div>",
    occurred_at: now,
    admin_url: "https://bymeez.com/admin",
  },
  "admin_alert",
);

await send(
  "تقرير Meez الدوري — آخر 24 ساعة",
  "admin-digest.html",
  {
    hours: "24",
    generated_at: now,
    new_registrations: "0",
    expiring_soon: "0",
    expired_or_stopped: "0",
    renewal_events: "0",
    registrations_html:
      '<div style="color:#8a8178">لا تسجيلات في هذه الرسالة التجريبية — بعد تطبيق SQL ستُملأ تلقائياً.</div>',
    alerts_html:
      "<div>• توقف المنصة (إيقاف/إلغاء)</div><div>• اشتراكات قاربت على الانتهاء</div>",
    renewals_html: "<div>• تفعيل / تمديد / تأكيد تجديد</div>",
    admin_url: "https://bymeez.com/admin",
  },
  "admin_digest",
);
