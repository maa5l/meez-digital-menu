-- تشغيل مرة واحدة على Supabase المحلي فقط (supabase db reset / SQL Editor محلي)
-- لا تُنفَّذ على مشروع الإنتاج

ALTER ROLE authenticator SET app.environment TO 'development';
ALTER ROLE anon SET app.environment TO 'development';
ALTER ROLE authenticated SET app.environment TO 'development';

NOTIFY pgrst, 'reload config';
