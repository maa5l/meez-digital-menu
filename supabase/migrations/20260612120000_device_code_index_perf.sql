-- فهرس code على device_activations لتسريع check_kiosk_access
CREATE UNIQUE INDEX IF NOT EXISTS device_activations_code_idx
  ON public.device_activations (code);

-- فهرس owner_id على venues (إن لم يكن PK/unique كافياً للـ JOIN)
CREATE INDEX IF NOT EXISTS venues_owner_id_idx
  ON public.venues (owner_id);
