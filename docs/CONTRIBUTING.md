# Contributing

## قبل الـ PR

```bash
npm run lint
npm run test
npm run build
npm audit
```

## قواعد الأمان

- لا تضف أسراراً في الكود.
- استخدم `src/validations/` لكل مدخل مستخدم.
- لا تستخدم `dangerouslySetInnerHTML` إلا مع تنظيف صارم.
- مسارات Dashboard تتطلب `ProtectedRoute`.

## Commits

رسائل واضحة بالعربية أو الإنجليزية، مثال: `fix(auth): validate email with zod`.
