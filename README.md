# قائمة — منيو رقمي

منصة منيو رقمي تفاعلي للمطاعم والمقاهي (React + Vite + TypeScript).

## التشغيل

```bash
cp .env.example .env.local
npm install
npm run dev
```

## أوامر

| الأمر | الوصف |
|-------|--------|
| `npm run dev` | خادم التطوير |
| `npm run build` | بناء الإنتاج |
| `npm run lint` | فحص الكود |
| `npm run test` | الاختبارات |

## تطبيق الآيباد (App Store)

مشروع مستقل لشاشة التفعيل فقط: [`meez-app/`](meez-app/) — تطبيق **ميز** لـ iOS (Capacitor).

```bash
cd meez-app && npm install && npm run dev   # http://localhost:8081
```

## التوثيق

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)
- [`meez-app/README.md`](meez-app/README.md)
- [`SECURITY.md`](SECURITY.md)
