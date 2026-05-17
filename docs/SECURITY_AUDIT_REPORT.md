# Security Audit Report — ميز Digital Menu

**التاريخ:** 2026-05-17  
**النطاق:** Frontend SPA + Backend scaffold

---

## Security Score

| البعد | قبل | بعد |
|-------|-----|-----|
| المصادمة والتفويض | 2/10 | 6/10 |
| إدارة البيانات | 3/10 | 7/10 |
| التبعيات | 4/10 | 5/10 |
| البنية والتنظيم | 3/10 | 8/10 |
| الجاهزية للإنتاج | 2/10 | 7/10 |
| **المجموع التقريبي** | **28/50 (56%)** | **33/50 (66%)** → **هدف 85%+ بعد Backend كامل** |

---

## 1. مشاكل حرجة (تم المعالجة جزئياً)

| # | المشكلة | الإجراء |
|---|---------|---------|
| C1 | لا مصادقة حقيقية — `/dashboard` مفتوح | `ProtectedRoute` + `sessionStorage` |
| C2 | أي 4 أرقام تفتح المنيو | Zod `devicePinSchema` + إزالة نص "أدخل أي أرقام" |
| C3 | تفعيل جهاز بدون تحقق تنسيق | `DEVICE_CODE_PATTERN` + `activateDevice()` |
| C4 | `lovable-tagger` في build pipeline | **حُذف** من vite و package.json |
| C5 | لا Backend — بيانات وهمية فقط | scaffold `server/` + `api/client.ts` |
| C6 | React Router XSS advisory (high) | يتطلب `npm audit fix` — راجع التبعيات |

## 2. مشاكل متوسطة

| # | المشكلة | الإجراء |
|---|---------|---------|
| M1 | localStorage لإعدادات المنيو | مفاتيح namespaced + sanitize + Zod |
| M2 | روابط Lovable R2 في OG | ✅ **حُذفت** — `public/og-image.png` محلي |
| M3 | 19 npm vulnerability | `npm audit` في CI؛ حدّث react-router |
| M4 | ESLint no-unused-vars معطّل | يُنصح بتفعيله تدريجياً |
| M5 | بيانات Dashboard تُفقد عند refresh | يحتاج API + DB |

## 3. مشاكل بسيطة

| # | المشكلة | الإجراء |
|---|---------|---------|
| L1 | `console.error` في NotFound | استُبدل بـ `logger` |
| L2 | Dead code (TemplateGrid, NavLink, App.css) | **حُذف** |
| L3 | Google Fonts (سابقاً) | Huwiya محلي |
| L4 | `href="#"` في Auth | استُبدل بـ `Link` |
| L5 | اختبار placeholder | يحتاج اختبارات حقيقية |

## 4. أكواد محذوفة

- `src/components/menu/TemplateGrid.tsx`
- `src/components/menu/TemplateSplit.tsx`
- `src/components/NavLink.tsx`
- `src/App.css`
- `lovable-tagger` dependency

## 5. أكواد مشبوهة — لا يوجد backdoor

- لا `eval`، لا fetch لعناوين غير معروفة
- `dangerouslySetInnerHTML` فقط في `chart.tsx` (shadcn — CSS variables)
- لا API keys مكشوفة

## 6. خطة مستقبلية

1. Backend: JWT + refresh httpOnly + PostgreSQL + Prisma
2. RBAC للأدوار (owner, staff)
3. ربط Moyasar/Stripe على الخادم
4. Sentry للأخطاء + audit log DB
5. Penetration test قبل الإطلاق

## 7. Checklist قبل الإطلاق

- [ ] `VITE_ENABLE_MOCK_AUTH=false`
- [ ] HTTPS + HSTS
- [ ] Secrets في vault
- [ ] `npm audit` بدون high
- [ ] اختبارات E2E للمصادقة
- [ ] Webhook signature verification
- [ ] نسخ احتياطي DB
- [ ] سياسة خصوصية وشروط فعلية
