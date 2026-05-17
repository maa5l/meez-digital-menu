# Architecture

## نظرة عامة

مشروع **Frontend SPA** (Vite + React) مع **Backend scaffold** (`server/`) جاهز للتوسع.

```
┌─────────────┐     HTTPS      ┌──────────────┐     ┌──────────┐
│   Browser   │ ◄────────────► │  Nginx/CDN   │     │ Postgres │
│  React SPA  │                │  API (Node)  │ ◄──►│  (مستقبل)│
└─────────────┘                └──────────────┘     └──────────┘
```

## هيكلة Frontend

```
src/
├── app/           # Routes, providers
├── components/    # UI + landing + menu + dashboard
├── config/        # env, constants
├── constants/     # storage keys
├── hooks/
├── lib/           # logger, errors, utils
├── middleware/    # ProtectedRoute
├── pages/
├── payment/       # PCI-aware scaffolding
├── security/      # sanitize, session, storage
├── services/      # api client, device activation
├── types/
└── validations/   # Zod schemas
```

## فصل الطبقات

| الطبقة | المسؤولية |
|--------|-----------|
| Pages | عرض UI |
| Hooks | حالة مشتركة |
| Services | منطق أعمال + API |
| Validations | تحقق المدخلات |
| Security | جلسة، تخزين، تنظيف |

## Backend (قيد الإنشاء)

`server/` — Express + Helmet + CORS + Rate limit + `/api/v1/health`.

## الدفع

`src/payment/` — مزودون (Stripe, Moyasar) كـ stubs؛ التنفيذ الحقيقي على الخادم.
