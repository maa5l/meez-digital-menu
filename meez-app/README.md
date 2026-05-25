# تطبيق ميز (Meez Kiosk App)

تطبيق **آيباد/iOS** مستقل لشاشة التفعيل فقط (ما كان `/pair` في المنصة):

1. انترو بشعار ميز  
2. عرض رمز `QM-XXXX`  
3. عند التفعيل من لوحة التحكم → فتح المنيو على عنوان الويب

## التطوير (متصفح)

```bash
cd meez-app
cp .env.example .env.local
# عدّل .env.local — انسخ مفاتيح Supabase من المشروع الرئيسي
npm install
npm run dev
```

يفتح على: **http://localhost:8081**

## البناء لـ App Store (يتطلب Mac)

```bash
cd meez-app
npm install
npm run build
npx cap add ios    # أول مرة فقط
npm run cap:sync
npm run cap:ios    # يفتح Xcode
```

### في Xcode

1. اختر Team (Apple Developer Account)  
2. **Bundle ID:** `com.meez.kiosk` (أو غيّره في `capacitor.config.ts`)  
3. **Deployment Target:** iPad فقط إن رغبت (Device → iPad)  
4. أيقونة التطبيق: Assets.xcassets → AppIcon (1024×1024)  
5. Product → Archive → Distribute → App Store Connect  

### متغيرات البيئة للإنتاج

| المتغير | الوصف |
|---------|--------|
| `VITE_SUPABASE_URL` | نفس مشروع Supabase لمنصة قائمة |
| `VITE_SUPABASE_ANON_KEY` | المفتاح العام |
| `VITE_MENU_WEB_URL` | عنوان المنصة، مثال `https://app.meez.com` |

بعد التفعيل يفتح: `{VITE_MENU_WEB_URL}/menu?code=QM-XXXX`

## Guided Access (موصى به للمقهى)

على الآيباد: **الإعدادات → إمكانية الوصول → Guided Access** لتثبيت التطبيق على شاشة التفعيل/المنيو.

## هيكل المجلد

```
meez-app/
├── src/           # React — شاشة التفعيل فقط
├── ios/           # يُنشأ بعد cap add ios
├── capacitor.config.ts
└── dist/          # مخرجات البناء (يُحمّل داخل التطبيق الأصلي)
```

## الفرق عن المشروع الرئيسي

| المشروع الرئيسي | تطبيق ميز |
|-----------------|-----------|
| SPA كامل (لوحة + منيو + landing) | شاشة pair فقط |
| `/pair` مسار ضمن الموقع | تطبيق iOS مستقل |
| مناسب للمتصفح | مناسب لـ App Store |
