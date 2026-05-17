# Environment Setup

## المتطلبات

- Node.js 22+
- npm 10+

## Frontend

```bash
cp .env.example .env.local
npm ci
npm run dev
```

| المتغير | الوصف |
|---------|--------|
| `VITE_API_BASE_URL` | عنوان API |
| `VITE_ENABLE_MOCK_AUTH` | `true` للتطوير، `false` للإنتاج |
| `VITE_LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` |

## Backend

```bash
cd server
cp ../.env.example .env
# عدّل PORT, DATABASE_URL, JWT_*, CORS_ORIGIN
npm ci && npm run dev
```

## بيئات

| البيئة | Frontend | API | Mock Auth |
|--------|----------|-----|-----------|
| development | localhost:8080 | localhost:3001 | نعم (افتراضي) |
| staging | staging.app | staging.api | لا |
| production | app.domain | api.domain | لا |
