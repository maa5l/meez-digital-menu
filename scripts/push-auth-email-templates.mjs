/**
 * يدفع قوالب البريد OTP إلى مشروع Supabase المستضاف.
 * يتطلب: SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens)
 *
 * الاستخدام:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/push-auth-email-templates.mjs
 * أو:
 *   npm run supabase:auth:push
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "feorprugthydhyytvebe";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, "..", "supabase", "templates");

function readTemplate(name) {
  return readFileSync(join(templatesDir, name), "utf8");
}

const payload = {
  site_url: process.env.VITE_APP_URL ?? "http://localhost:8080",
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

async function main() {
  if (!TOKEN) {
    console.error(
      "SUPABASE_ACCESS_TOKEN مطلوب.\n" +
        "أنشئ token من: https://supabase.com/dashboard/account/tokens\n" +
        "ثم شغّل: SUPABASE_ACCESS_TOKEN=sbp_... npm run supabase:auth:push",
    );
    process.exit(1);
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error("فشل تحديث إعدادات Auth:", res.status, body);
    process.exit(1);
  }

  console.log("تم تحديث قوالب البريد OTP بنجاح لمشروع:", PROJECT_REF);
  console.log("- magic_link → رمز 6 أرقام");
  console.log("- confirmation → رمز 6 أرقام");
  console.log("- recovery → رمز 6 أرقام");
  console.log("- rate_limit_email_sent → 30/ساعة");
  console.log("- rate_limit_otp → 60/ساعة");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
