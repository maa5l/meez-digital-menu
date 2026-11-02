/**
 * Build restore SQL files from cluster_dump.sql (UTF-8 safe).
 * Usage: node supabase/scripts/restore/build-restore-files.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dumpPath = path.join(__dirname, "cluster_dump.sql");
const text = fs.readFileSync(dumpPath, "utf8");
const lines = text.split(/\r?\n/);

function extractCopies(predicate) {
  /** @type {Record<string, { header: string, rows: string[] }>} */
  const out = {};
  let collecting = false;
  let header = "";
  let table = "";
  /** @type {string[]} */
  let rows = [];
  for (const line of lines) {
    if (line.startsWith("COPY ") && predicate(line)) {
      collecting = true;
      header = line;
      table = line.replace(/^COPY ([^\s(]+).*/, "$1");
      rows = [];
      continue;
    }
    if (!collecting) continue;
    if (line === "\\.") {
      if (rows.length > 0) out[table] = { header, rows };
      collecting = false;
      continue;
    }
    rows.push(line);
  }
  return out;
}

function sqlLiteral(v, { json = false, bool = false } = {}) {
  if (v == null || v === "\\N") return "NULL";
  if (bool) {
    if (v === "t" || v === "true") return "true";
    if (v === "f" || v === "false") return "false";
  }
  const q = `'${String(v).replace(/'/g, "''")}'`;
  return json ? `${q}::jsonb` : q;
}

function isJsonCol(name) {
  return /(_data|metadata|payload|config|settings|data|tokens|identity_data|raw_.*meta_data|structured_data)$/i.test(
    name,
  );
}

function isBoolCol(name) {
  return /^(is_|has_|prefer_|manual_|email_optional)/i.test(name) ||
    ["public", "enabled", "revoked"].includes(name);
}

function writeCopyFile(filePath, title, tables, order) {
  const parts = [`-- ${title}`, "BEGIN;"];
  const seen = new Set();
  for (const t of order) {
    const b = tables[t];
    if (!b) continue;
    seen.add(t);
    parts.push("", `-- ${t} (${b.rows.length} rows)`, b.header, ...b.rows, "\\.");
  }
  for (const t of Object.keys(tables).sort()) {
    if (seen.has(t)) continue;
    const b = tables[t];
    parts.push("", `-- ${t} (${b.rows.length} rows)`, b.header, ...b.rows, "\\.");
  }
  parts.push("COMMIT;", "");
  fs.writeFileSync(filePath, parts.join("\n"), "utf8");
}

function writeInsertFile(filePath, title, tables, order, { skip = [] } = {}) {
  const skipSet = new Set(skip);
  const parts = [`-- ${title}`, "BEGIN;"];
  let count = 0;
  const emit = (t) => {
    const b = tables[t];
    if (!b || skipSet.has(t)) return;
    const cols = b.header.match(/\((.*)\) FROM stdin;/)?.[1];
    if (!cols) throw new Error(`No cols for ${t}`);
    const colArr = cols.split(",").map((c) => c.trim());
    for (const row of b.rows) {
      const vals = row.split("\t");
      if (vals.length !== colArr.length) {
        throw new Error(
          `Col mismatch ${t}: got ${vals.length} want ${colArr.length}`,
        );
      }
      const sqlVals = vals
        .map((v, i) =>
          sqlLiteral(v, {
            json: isJsonCol(colArr[i]) || colArr[i] === "data",
            bool: isBoolCol(colArr[i]),
          }),
        )
        .join(", ");
      parts.push(
        `INSERT INTO ${t} (${cols}) VALUES (${sqlVals}) ON CONFLICT DO NOTHING;`,
      );
      count++;
    }
  };
  const seen = new Set();
  for (const t of order) {
    emit(t);
    seen.add(t);
  }
  for (const t of Object.keys(tables).sort()) {
    if (seen.has(t)) continue;
    emit(t);
  }
  parts.push("COMMIT;", "");
  fs.writeFileSync(filePath, parts.join("\n"), "utf8");
  return count;
}

const auth = extractCopies(
  (l) => l.startsWith("COPY auth.users ") || l.startsWith("COPY auth.identities "),
);
const pub = extractCopies((l) => l.startsWith("COPY public."));

const authOrder = ["auth.users", "auth.identities"];
const publicOrder = [
  "public.allergens",
  "public.permissions",
  "public.languages",
  "public.feature_flags",
  "public.system_config",
  "public.analytics_settings",
  "public.email_settings",
  "public.sms_settings",
  "public.storage_settings",
  "public.maintenance_settings",
  "public.branding",
  "public.website_settings",
  "public.profiles",
  "public.admin_users",
  "public.role_permissions",
  "public.subscriptions",
  "public.subscription_history",
  "public.venues",
  "public.device_activations",
  "public.device_pairing_sessions",
  "public.kiosk_pairing_announcements",
  "public.kiosk_rate_limits",
  "public.admin_logs",
  "public.audit_logs",
];

writeCopyFile(
  path.join(__dirname, "02_AUTH_DATA.sql"),
  "Auth users + identities (psql COPY)",
  auth,
  authOrder,
);
// Keep hand-tuned 02_AUTH_DATA_INSERTS.sql (bcrypt-safe quoting). Do not overwrite.
const authInserts = Object.values(auth).reduce((n, b) => n + b.rows.length, 0);

writeCopyFile(
  path.join(__dirname, "03_PUBLIC_DATA.sql"),
  "Public data (psql COPY). Prefer SET session_replication_role = replica when using psql.",
  pub,
  publicOrder,
);
// Prepend replication role for COPY public file
{
  const p = path.join(__dirname, "03_PUBLIC_DATA.sql");
  const body = fs.readFileSync(p, "utf8");
  fs.writeFileSync(
    p,
    "-- Public data restore\nSET session_replication_role = replica;\n" +
      body.replace(
        "COMMIT;\n",
        "COMMIT;\nSET session_replication_role = DEFAULT;\n",
      ),
    "utf8",
  );
}

const pubInserts = writeInsertFile(
  path.join(__dirname, "03_PUBLIC_DATA_INSERTS.sql"),
  "Public data INSERTs for SQL Editor (skips audit_logs)",
  pub,
  publicOrder,
  { skip: ["public.audit_logs"] },
);

const profileSample = pub["public.profiles"]?.rows?.[0] ?? "";
console.log(
  JSON.stringify(
    {
      authTables: Object.fromEntries(
        Object.entries(auth).map(([k, v]) => [k, v.rows.length]),
      ),
      publicTables: Object.fromEntries(
        Object.entries(pub).map(([k, v]) => [k, v.rows.length]),
      ),
      authInserts,
      pubInserts,
      profileSampleHasArabic: /[\u0600-\u06FF]/.test(profileSample),
      profilePreview: profileSample.slice(0, 120),
    },
    null,
    2,
  ),
);
