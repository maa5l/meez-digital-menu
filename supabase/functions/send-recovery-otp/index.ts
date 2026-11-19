/**
 * يرسل رمز إعادة التعيين عبر Brevo API (يتجاوز SMTP الخاص بـ Auth عند فشله).
 * POST { email }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildRecoveryHtml(otp: string, email: string): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
  <body dir="rtl" style="margin:0;padding:0;background:#f7f3ec;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;">
    <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;background:#f7f3ec;">
      <tr>
        <td align="center" dir="rtl" style="padding:24px;direction:rtl;">
          <table role="presentation" dir="rtl" width="520" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;max-width:520px;width:100%;background:#ffffff;border-radius:20px;">
            <tr>
              <td dir="rtl" style="padding:28px;direction:rtl;text-align:center;">
                <div style="margin-bottom:18px;">
                  <span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</span>
                </div>
                <h2 dir="rtl" style="margin:0 0 12px;font-size:22px;direction:rtl;">إعادة تعيين كلمة المرور</h2>
                <p dir="rtl" style="margin:0 0 20px;color:#6b6259;line-height:1.8;direction:rtl;">طلبت إعادة تعيين كلمة المرور لحساب ${email}. استخدم الرمز التالي:</p>
                <div style="direction:ltr;letter-spacing:10px;font-size:36px;font-weight:800;color:#9b6a2f;margin:18px 0;">${otp}</div>
                <p dir="rtl" style="margin:20px 0 0;color:#8a8178;font-size:13px;direction:rtl;">إذا لم تطلب ذلك، تجاهل الرسالة. الرمز ينتهي خلال دقائق.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const email = String(payload?.email ?? "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) {
      return json(400, { ok: false, error: "invalid_email" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL") ?? "";
    const serviceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SB_SERVICE_ROLE_KEY") ?? "";
    const brevoKey = Deno.env.get("BREVO_API_KEY") ?? "";
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") ?? "notification@bymeez.com";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "bymeez";

    if (!supabaseUrl || !serviceKey) {
      return json(503, { ok: false, error: "supabase_not_configured" });
    }
    if (!brevoKey) {
      return json(503, { ok: false, error: "brevo_not_configured" });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    if (error) {
      // لا نفضح وجود/عدم وجود الحساب
      console.error("generateLink", error.message);
      return json(200, { ok: true });
    }

    const otp = data?.properties?.email_otp;
    if (!otp) {
      console.error("missing_email_otp");
      return json(500, { ok: false, error: "otp_missing" });
    }

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": brevoKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email }],
        subject: `${otp} هو رمز إعادة تعيين كلمة المرور`,
        htmlContent: buildRecoveryHtml(String(otp), email),
        tags: ["password_reset", "recovery"],
      }),
    });

    if (!brevoRes.ok) {
      const text = await brevoRes.text();
      console.error("brevo_fail", brevoRes.status, text.slice(0, 300));
      const ipBlocked =
        brevoRes.status === 401 &&
        /unrecognised IP|authorized_ips|unauthorized/i.test(text);
      return json(502, {
        ok: false,
        error: ipBlocked ? "brevo_ip_blocked" : "email_send_failed",
      });
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error("send_recovery_otp_exception", err);
    return json(500, { ok: false, error: "unexpected_failure" });
  }
});
