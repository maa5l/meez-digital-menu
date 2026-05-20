-- جلسات ربط الآيباد: الرمز يُسجَّل من الجهاز فقط بعد فتح رابط QR

CREATE TABLE IF NOT EXISTS public.device_pairing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  code TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT device_pairing_sessions_code_format CHECK (
    code IS NULL OR code ~ '^QM-[A-HJ-NP-Z2-9]{4}$'
  )
);

CREATE INDEX IF NOT EXISTS device_pairing_sessions_owner_idx
  ON public.device_pairing_sessions (owner_id, created_at DESC);

ALTER TABLE public.device_pairing_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pairing_sessions_select_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_select_own"
  ON public.device_pairing_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "pairing_sessions_insert_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_insert_own"
  ON public.device_pairing_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "pairing_sessions_delete_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_delete_own"
  ON public.device_pairing_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.create_device_pairing_session()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.device_pairing_sessions (owner_id)
  VALUES (auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_device_pairing_session(
  p_session_id UUID,
  p_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN FALSE;
  END IF;

  UPDATE public.device_pairing_sessions
  SET code = v_code
  WHERE id = p_session_id
    AND code IS NULL
    AND expires_at > NOW();

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_device_pairing_session_code(p_session_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT code
  FROM public.device_pairing_sessions
  WHERE id = p_session_id
    AND owner_id = auth.uid()
    AND expires_at > NOW()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.create_device_pairing_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_device_pairing_session(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_pairing_session_code(UUID) TO authenticated;
