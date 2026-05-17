# Deployment

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
