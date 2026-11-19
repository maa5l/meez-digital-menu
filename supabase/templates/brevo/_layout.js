/** غلاف HTML موحّد لرسائل Meez عبر Brevo */
export function wrapEmail({ title, bodyHtml, footerNote }) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
  <body style="margin:0;padding:24px;background:#f7f3ec;font-family:Arial,Tahoma,sans-serif;color:#1f1a16;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;">
      <div style="text-align:center;margin-bottom:18px;">
        <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</div>
      </div>
      <h2 style="margin:0 0 12px;font-size:22px;text-align:center;">${title}</h2>
      <div style="font-size:15px;line-height:1.7;color:#3a342f;">
        ${bodyHtml}
      </div>
      <p style="margin:24px 0 0;color:#8a8178;font-size:12px;text-align:center;">
        ${footerNote || "هذه رسالة تلقائية من منصة Meez للمنيو الرقمي."}
      </p>
    </div>
  </body>
</html>`;
}
