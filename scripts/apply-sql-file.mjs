/**
 * Apply a SQL file via DATABASE_URL (Supabase Postgres).
 * Usage: node scripts/apply-sql-file.mjs path/to/file.sql
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(path.join(root, "server", "package.json"));
const pg = require("pg");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(path.join(root, "server", ".env"));
loadEnv(path.join(root, ".env.local"));

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("Usage: node scripts/apply-sql-file.mjs <file.sql>");
  process.exit(1);
}

const abs = path.isAbsolute(sqlPath) ? sqlPath : path.join(root, sqlPath);
const sql = fs.readFileSync(abs, "utf8");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 120000,
});

await client.connect();
console.log("connected", path.basename(abs), "bytes=" + sql.length);
try {
  await client.query(sql);
  console.log("OK applied", path.basename(abs));
} catch (err) {
  console.error("FAIL", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
