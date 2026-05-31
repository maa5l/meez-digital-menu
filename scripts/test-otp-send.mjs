/**
 * اختبار مباشر لـ POST /auth/v1/otp — يعرض الاستجابة الكاملة من Supabase.
 * الاستخدام: node scripts/test-otp-send.mjs [email]
 */
const email = process.argv[2] ?? "bioio2256@gmail.com";
const url = process.env.VITE_SUPABASE_URL ?? "https://feorprugthydhyytvebe.supabase.co";
const key =
  process.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlb3JwcnVndGh5ZGh5eXR2ZWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDQ5NjQsImV4cCI6MjA5NDU4MDk2NH0.WCO8laounfYSrr0qiGMXBX6R0hzH9klcdlpgt7LcU2w";

const body = { email, create_user: false };

console.log("POST", `${url}/auth/v1/otp`);
console.log("Body:", JSON.stringify(body));

const res = await fetch(`${url}/auth/v1/otp`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = text;
}

console.log("\n--- Response ---");
console.log("Status:", res.status, res.statusText);
console.log("Retry-After:", res.headers.get("retry-after") ?? "(none)");
console.log("Body:", JSON.stringify(json, null, 2));

if (res.status === 200) {
  console.log("\n✓ نجح الطلب — تحقق من البريد (وSpam)");
} else if (res.status === 429) {
  console.log("\n✗ Rate limit — لا يُرسل بريد. انتظر أو ارفع الحد في Dashboard → Auth → Rate Limits");
}
