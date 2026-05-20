-- السماح للمستخدم بإنشاء ملفه الشخصي عند أول تسجيل (upsert من التطبيق)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
