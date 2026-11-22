/**
 * يعيد صور منتجات S3oody16 من نسخة احتياطية محلية إلى السحابة.
 *
 * Usage (PowerShell):
 *   $env:MEEZ_BACKUP = "C:\Users\Mmh24\Desktop\يراشم\meez-venue-backup-1795120326573.json"
 *   $env:MEEZ_EMAIL = "s3oody16@gmail.com"
 *   $env:MEEZ_PASSWORD = "MeezUser2026!"
 *   node supabase/scripts/restore-s3oody-images-from-backup.mjs
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || "https://zzrbqiqygiqwudozexis.supabase.co";
const anon =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cmJxaXF5Z2lxd3Vkb3pleGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NDY5NTgsImV4cCI6MjEwOTEyMjk1OH0.eqep37Jfb6Tdr9vkBgPzhvPkNho0PH8TsyVifYFF5F4";
const backupPath =
  process.env.MEEZ_BACKUP ||
  "C:/Users/Mmh24/Desktop/يراشم/meez-venue-backup-1795120326573.json";
const email = (process.env.MEEZ_EMAIL || "s3oody16@gmail.com").trim().toLowerCase();
const password = process.env.MEEZ_PASSWORD || "";

if (!password) {
  console.error("ضع كلمة المرور في MEEZ_PASSWORD ثم أعد التشغيل");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(backupPath, "utf8"));
const products = Array.isArray(raw.products) ? raw.products : [];
let withImg = 0;
for (const p of products) {
  const img = p.imageLandscape || p.imagePortrait || p.image || "";
  if (typeof img === "string" && img.startsWith("data:image")) withImg += 1;
}
if (withImg === 0) {
  console.error("النسخة الاحتياطية بلا صور — أوقفنا الاستعادة");
  process.exit(1);
}

// تاريخ أحدث من أي رفع جوال مجرّد من الصور
const payload = {
  ...raw,
  updatedAt: new Date(Date.now() + 60_000).toISOString(),
};
const sb = createClient(url, anon);
const { error: loginError } = await sb.auth.signInWithPassword({ email, password });
if (loginError) {
  console.error("فشل الدخول:", loginError.message);
  process.exit(1);
}

const { data, error } = await sb.rpc("update_venue_data", { p_data: payload });
if (error) {
  console.error("فشل الرفع:", error.message);
  process.exit(1);
}
console.log("نتيجة الرفع:", data);

const verify = await sb.rpc("get_owner_venue");
const remoteProducts = verify.data?.data?.products || [];
let remoteImg = 0;
for (const p of remoteProducts) {
  const img = p.imageLandscape || p.imagePortrait || p.image || "";
  if (typeof img === "string" && img.startsWith("data:image")) remoteImg += 1;
}
console.log(
  JSON.stringify(
    {
      products: remoteProducts.length,
      withImages: remoteImg,
      updated_at: verify.data?.updated_at,
    },
    null,
    2,
  ),
);
if (remoteImg < withImg) {
  console.error("الصور لم تكتمل في السحابة");
  process.exit(1);
}
console.log("✅ تم استعادة الصور");
