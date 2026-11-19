/**
 * يزرع قوالب إشعارات Brevo في notification_templates
 *
 * الاستخدام:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-brevo-notification-templates.mjs
 * أو لتوليد SQL فقط:
 *   node scripts/seed-brevo-notification-templates.mjs --sql
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, "..", "supabase", "templates", "brevo");

const TEMPLATES = [
  {
    key: "password_reset",
    file: "password-reset.html",
    subject: "رمز إعادة تعيين كلمة المرور — Meez",
  },
  {
    key: "welcome",
    file: "welcome.html",
    subject: "أهلاً بك في Meez",
  },
  {
    key: "renewal_reminder",
    file: "renewal-reminder.html",
    subject: "تذكير: اشتراكك ينتهي قريباً — Meez",
  },
  {
    key: "renewal_confirmed",
    file: "renewal-confirmed.html",
    subject: "تم تأكيد تجديد اشتراكك — Meez",
  },
  {
    key: "subscription_confirmed",
    file: "subscription-confirmed.html",
    subject: "تم تأكيد اشتراكك — Meez",
  },
  {
    key: "subscription_extended",
    file: "subscription-extended.html",
    subject: "تم تمديد اشتراكك — Meez",
  },
  {
    key: "admin_alert",
    file: "admin-alert.html",
    subject: "تنبيه منصة Meez: {{params.title}}",
  },
  {
    key: "admin_digest",
    file: "admin-digest.html",
    subject: "تقرير Meez الدوري — آخر {{params.hours}} ساعة",
  },
];

function sqlEscape(s) {
  return s.replace(/'/g, "''");
}

function buildSql() {
  const lines = [
    "-- Seed Brevo notification templates (ar / email)",
    "BEGIN;",
  ];
  for (const t of TEMPLATES) {
    const body = readFileSync(join(templatesDir, t.file), "utf8").trim();
    lines.push(`
INSERT INTO public.notification_templates (template_key, channel, locale, subject, body, is_active)
VALUES (
  '${t.key}',
  'email',
  'ar',
  '${sqlEscape(t.subject)}',
  $brevo$${body}$brevo$,
  true
)
ON CONFLICT (template_key, channel, locale) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  is_active = true,
  updated_at = now();`);
  }
  lines.push("COMMIT;");
  return lines.join("\n");
}

async function upsertViaApi() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY مطلوبان");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  for (const t of TEMPLATES) {
    const body = readFileSync(join(templatesDir, t.file), "utf8").trim();
    const { error } = await sb.from("notification_templates").upsert(
      {
        template_key: t.key,
        channel: "email",
        locale: "ar",
        subject: t.subject,
        body,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "template_key,channel,locale" },
    );
    if (error) {
      console.error("فشل", t.key, error.message);
      process.exit(1);
    }
    console.log("OK", t.key);
  }
}

const asSql = process.argv.includes("--sql");
if (asSql) {
  const out = join(__dirname, "..", "supabase", "scripts", "seed-brevo-templates-now.sql");
  writeFileSync(out, buildSql(), "utf8");
  console.log("كتب:", out);
} else {
  upsertViaApi().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
