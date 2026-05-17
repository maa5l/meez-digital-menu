# Security Policy

## الإبلاغ عن الثغرات

راسلنا على: security@meez.app (استبدل بالبريد الفعلي).

## مبادئ الحماية

- **لا أسرار في Frontend** — مفاتيح الدفع والـ JWT secrets على الخادم فقط.
- **sessionStorage للجلسة** — لا تخزين tokens في `localStorage`.
- **التحقق من المدخلات** — Zod schemas في `src/validations/`.
- **تنظيف البيانات** — `src/security/sanitize.ts`.
- **مسارات محمية** — `ProtectedRoute` لـ `/dashboard/*`.
- **Rate limiting** — عميل + خادم (`express-rate-limit`).
- **CSP + Helmet** — `index.html` + `nginx.conf` + `server` Helmet.

## إدارة الأسرار

1. انسخ `.env.example` إلى `.env.local` (Frontend) و `server/.env` (Backend).
2. لا ترفع ملفات `.env` إلى Git.
3. استخدم GitHub Secrets / Vault في CI/CD.

## PCI

- لا تمرّر أرقام البطاقات عبر Frontend.
- استخدم Stripe/Moyasar hosted fields أو tokenization.

## التحديثات

```bash
npm audit
npm audit fix
```

راجع `docs/SECURITY_AUDIT_REPORT.md` للتفاصيل.
