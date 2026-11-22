/**
 * Brevo (Sendinblue) transactional email client.
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 */

export type BrevoSendInput = {
  toEmail: string;
  toName?: string | null;
  subject: string;
  htmlContent: string;
  tags?: string[];
  params?: Record<string, string>;
};

export type BrevoSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; status?: number };

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function isBrevoConfigured(): boolean {
  return Boolean(env("BREVO_API_KEY") && env("BREVO_SENDER_EMAIL"));
}

export async function sendBrevoEmail(input: BrevoSendInput): Promise<BrevoSendResult> {
  const apiKey = env("BREVO_API_KEY");
  const senderEmail = env("BREVO_SENDER_EMAIL");
  const senderName = env("BREVO_SENDER_NAME") ?? "Meez";

  if (!apiKey || !senderEmail) {
    return { ok: false, error: "brevo_not_configured" };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: input.toEmail, name: input.toName || undefined }],
      subject: input.subject,
      htmlContent: input.htmlContent,
      tags: input.tags,
      params: input.params,
    }),
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const message =
      typeof json.message === "string"
        ? json.message
        : typeof json.error === "string"
          ? json.error
          : text || `brevo_http_${res.status}`;
    return { ok: false, error: message, status: res.status };
  }

  const messageId =
    typeof json.messageId === "string" ? json.messageId : `brevo_${Date.now()}`;
  return { ok: true, messageId };
}
