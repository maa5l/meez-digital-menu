# Deployment

## Vercel (الواجهة — موصى به)

التطبيق يتصل بـ **Supabase** من المتصفح؛ لا حاجة لنشر `backend/` (FastAPI) على Vercel مع الواجهة الحالية.

1. استورد المستودع من GitHub.
2. **Application Preset:** اختر **Vite** (وليس Services).
3. **Root Directory:** `./`
4. **Environment Variables** (Production):

| المتغير | مثال |
|---------|------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | مفتاح anon من Supabase |
| `VITE_APP_URL` | `https://your-app.vercel.app` |
| `VITE_ENABLE_MOCK_AUTH` | `false` |

5. اضغط **Deploy**.

ملف `vercel.json` في الجذر يوجّه كل المسارات إلى `index.html` (React Router).

> إذا ظهرت رسالة «vercel.json required for multiple services»، غيّر الإعداد من **Services** إلى **Vite**.

## Docker (Frontend)

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 \
  --build-arg VITE_APP_URL=https://app.example.com \
  -t meez-frontend .
docker run -p 80:80 meez-frontend
```

## Backend

```bash
cd server && npm ci && npm run build && npm start
```

## HTTPS

- فرض HTTPS على Nginx/Load Balancer.
- HSTS: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`

## Rollback

- احتفظ بآخر 3 صور Docker tagged.
- `kubectl rollout undo` أو استبدال الـ image tag السابق.

## Health

- Frontend: `GET /health`
- API: `GET /api/v1/health`
