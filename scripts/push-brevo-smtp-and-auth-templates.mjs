/**
 * يربط Supabase Auth بـ Brevo SMTP ويدفع قوالب OTP (بما فيها إعادة التعيين).
 *
 * المطلوب في البيئة:
 *   SUPABASE_ACCESS_TOKEN   — من https://supabase.com/dashboard/account/tokens
 *   BREVO_SMTP_USER         — Login الظاهر في Brevo → SMTP & API → SMTP
 *   BREVO_SMTP_KEY          — مفتاح SMTP (ليس API key)
 *   BREVO_SENDER_EMAIL      — notification@bymeez.com
 *   BREVO_SENDER_NAME       — bymeez
 *
 * الاستخدام:
 *   node scripts/push-brevo-smtp-and-auth-templates.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "zzrbqiqygiqwudozexis";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!(k in process.env) || !process.env[k]) process.env[k] = v;
  }
}

loadEnvFile(join(root, "server", ".env"));
loadEnvFile(join(root, ".env.local"));
loadEnvFile(join(root, ".env"));

function readTemplate(name) {
  return readFileSync(join(root, "supabase", "templates", name), "utf8");
}

const smtpUser = process.env.BREVO_SMTP_USER?.trim();
const smtpKey = process.env.BREVO_SMTP_KEY?.trim() || process.env.BREVO_SMTP_PASS?.trim();
const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || "notification@bymeez.com";
const senderName = process.env.BREVO_SENDER_NAME?.trim() || "bymeez";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || TOKEN;

const payload = {
  site_url: process.env.VITE_APP_URL ?? process.env.APP_URL ?? "https://bymeez.com",
  external_email_enabled: true,
  mailer_autoconfirm: true,
  mailer_otp_length: 6,
  mailer_otp_exp: 600,
  rate_limit_email_sent: 30,
  rate_limit_otp: 60,
  mailer_subjects_magic_link: "{{ .Token }} هو رمز تسجيل الدخول",
  mailer_subjects_confirmation: "{{ .Token }} هو رمز تأكيد حسابك",
  mailer_subjects_recovery: "{{ .Token }} هو رمز إعادة تعيين كلمة المرور",
  mailer_templates_magic_link_content: readTemplate("magic_link.html"),
  mailer_templates_confirmation_content: readTemplate("confirmation.html"),
  mailer_templates_recovery_content: readTemplate("recovery.html"),
};

if (smtpUser && smtpKey) {
  Object.assign(payload, {
    smtp_host: process.env.BREVO_SMTP_HOST?.trim() || "smtp-relay.brevo.com",
    smtp_port: process.env.BREVO_SMTP_PORT?.trim() || "587",
    smtp_user: smtpUser,
    smtp_pass: smtpKey,
    smtp_admin_email: senderEmail,
    smtp_sender_name: senderName,
  });
}

async function main() {
  if (!accessToken) {
    console.error(
      "SUPABASE_ACCESS_TOKEN مطلوب.\n" +
        "أنشئه من: https://supabase.com/dashboard/account/tokens",
    );
    process.exit(1);
  }
  if (!smtpUser || !smtpKey) {
    console.warn(
      "تحذير: BREVO_SMTP_USER / BREVO_SMTP_KEY غير موجودين — سيتم دفع القوالب فقط بدون SMTP.",
    );
    console.warn(
      "من Brevo → SMTP & API → SMTP انسخ Login ومفتاح SMTP (ليس API key).",
    );
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error("فشل تحديث Auth:", res.status, body);
    process.exit(1);
  }

  console.log("OK project=", PROJECT_REF);
  console.log("- recovery template pushed (RTL)");
  console.log("- SMTP configured=", Boolean(smtpUser && smtpKey));
  console.log("- sender=", senderName, `<${senderEmail}>`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
