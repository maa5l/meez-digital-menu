import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isBrevoConfigured, sendBrevoEmail } from "./brevo.js";

type OutboxRow = {
  id: string;
  owner_id: string | null;
  channel: string;
  template_key: string | null;
  to_address: string;
  subject: string | null;
  body: string;
  status: string;
  attempts: number;
  metadata: Record<string, unknown> | null;
};

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name}_missing`);
  return v;
}

export function getServiceSupabase(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function renderPlaceholders(input: string, params: Record<string, string>): string {
  let out = input;
  for (const [key, value] of Object.entries(params)) {
    out = out.split(`{{params.${key}}}`).join(value);
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

function metadataParams(meta: Record<string, unknown> | null): Record<string, string> {
  if (!meta || typeof meta !== "object") return {};
  const raw = (meta.params && typeof meta.params === "object" ? meta.params : meta) as Record<
    string,
    unknown
  >;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = String(v);
    }
  }
  return out;
}

export async function processNotificationOutbox(limit = 25): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  brevoConfigured: boolean;
}> {
  const brevoConfigured = isBrevoConfigured();
  if (!brevoConfigured) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0, brevoConfigured: false };
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("notification_outbox")
    .select(
      "id, owner_id, channel, template_key, to_address, subject, body, status, attempts, metadata",
    )
    .eq("channel", "email")
    .in("status", ["pending", "queued", "failed"])
    .lte("scheduled_at", new Date().toISOString())
    .lt("attempts", 5)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as OutboxRow[];

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.to_address?.includes("@")) {
      skipped += 1;
      await sb
        .from("notification_outbox")
        .update({
          status: "failed",
          last_error: "invalid_to_address",
          attempts: row.attempts + 1,
        })
        .eq("id", row.id);
      continue;
    }

    await sb
      .from("notification_outbox")
      .update({ status: "queued", attempts: row.attempts + 1 })
      .eq("id", row.id);

    const params = metadataParams(row.metadata);
    const subject = renderPlaceholders(row.subject || "Meez", params);
    const html = renderPlaceholders(row.body, params);
    const toName =
      typeof row.metadata?.to_name === "string"
        ? row.metadata.to_name
        : params.venue_name || params.full_name || null;

    const result = await sendBrevoEmail({
      toEmail: row.to_address,
      toName,
      subject,
      htmlContent: html,
      tags: row.template_key ? [row.template_key] : ["meez"],
      params,
    });

    if (result.ok) {
      sent += 1;
      await sb
        .from("notification_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
          metadata: {
            ...(row.metadata ?? {}),
            brevo_message_id: result.messageId,
          },
        })
        .eq("id", row.id);
    } else {
      failed += 1;
      await sb
        .from("notification_outbox")
        .update({
          status: "failed",
          last_error: result.error.slice(0, 500),
        })
        .eq("id", row.id);
    }
  }

  return {
    processed: rows.length,
    sent,
    failed,
    skipped,
    brevoConfigured,
  };
}

export async function enqueueRenewalReminders(daysAhead = 7): Promise<{
  enqueued: number;
}> {
  const sb = getServiceSupabase();
  const { data, error } = await sb.rpc("enqueue_renewal_reminders", {
    p_days_ahead: daysAhead,
  });
  if (error) throw new Error(error.message);
  const enqueued = typeof data === "number" ? data : Number((data as { enqueued?: number })?.enqueued ?? 0);
  return { enqueued: Number.isFinite(enqueued) ? enqueued : 0 };
}
