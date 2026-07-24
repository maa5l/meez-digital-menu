-- =============================================================================
-- 202607250007 — Security: permissions, members, API keys, login/security logs
-- Enhances existing audit_logs; does NOT drop or recreate it.
-- =============================================================================

-- Venue team members (activates unused profiles.role staff path)
CREATE TABLE IF NOT EXISTS public.venue_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          public.venue_member_role NOT NULL DEFAULT 'staff',
  invited_at    timestamptz NOT NULL DEFAULT now(),
  accepted_at   timestamptz,
  invited_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, user_id),
  CONSTRAINT venue_members_not_self_owner CHECK (owner_id <> user_id OR role = 'owner')
);

CREATE INDEX IF NOT EXISTS venue_members_user_idx
  ON public.venue_members (user_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.permissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource      text NOT NULL, -- products|crops|devices|theme|billing|media|cms
  action        public.permission_action NOT NULL,
  description   text,
  UNIQUE (resource, action)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role          public.venue_member_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

INSERT INTO public.permissions (resource, action, description) VALUES
  ('products', 'create', 'Create products'),
  ('products', 'read', 'Read products'),
  ('products', 'update', 'Update products'),
  ('products', 'delete', 'Delete products'),
  ('crops', 'create', 'Create crops'),
  ('crops', 'read', 'Read crops'),
  ('crops', 'update', 'Update crops'),
  ('crops', 'delete', 'Delete crops'),
  ('devices', 'manage', 'Manage devices'),
  ('theme', 'update', 'Update theme'),
  ('media', 'manage', 'Manage media library'),
  ('billing', 'read', 'View subscription'),
  ('settings', 'manage', 'Manage venue settings')
ON CONFLICT (resource, action) DO NOTHING;

-- Map manager/editor/viewer defaults
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'manager'::public.venue_member_role, p.id FROM public.permissions p
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'editor'::public.venue_member_role, p.id
FROM public.permissions p
WHERE p.resource IN ('products','crops','theme','media')
  AND p.action IN ('create','read','update')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'viewer'::public.venue_member_role, p.id
FROM public.permissions p
WHERE p.action = 'read'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  key_prefix    text NOT NULL,
  key_hash      text NOT NULL,
  scopes        text[] NOT NULL DEFAULT '{}',
  last_used_at  timestamptz,
  expires_at    timestamptz,
  revoked_at    timestamptz,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_keys_prefix_len CHECK (char_length(key_prefix) BETWEEN 4 AND 16)
);

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_uidx ON public.api_keys (key_hash);
CREATE INDEX IF NOT EXISTS api_keys_owner_idx ON public.api_keys (owner_id) WHERE revoked_at IS NULL;

-- App-level session inventory (Supabase Auth remains source of truth for JWTs)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    text,
  ip            inet,
  user_agent    text,
  device_label  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz
);

CREATE INDEX IF NOT EXISTS user_sessions_user_idx
  ON public.user_sessions (user_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.login_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email         text,
  success       boolean NOT NULL,
  fail_reason   text,
  ip            inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_history_user_idx
  ON public.login_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS login_history_created_idx
  ON public.login_history (created_at DESC);

CREATE TABLE IF NOT EXISTS public.security_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type    text NOT NULL,
  severity      public.security_event_severity NOT NULL DEFAULT 'info',
  message       text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip            inet,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_events_severity_idx
  ON public.security_events (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS security_events_owner_idx
  ON public.security_events (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action        text NOT NULL,
  entity_type   text,
  entity_id     uuid,
  summary       text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_owner_idx
  ON public.activity_logs (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_logs_actor_idx
  ON public.activity_logs (actor_id, created_at DESC);

-- Enhance existing audit_logs (additive columns only)
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS ip inet,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS severity public.security_event_severity DEFAULT 'info';

-- FK for subscription_history.changed_by (safe if column exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_history' AND column_name = 'changed_by'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscription_history_changed_by_fkey'
  ) THEN
    ALTER TABLE public.subscription_history
      ADD CONSTRAINT subscription_history_changed_by_fkey
      FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'subscription_history.changed_by FK skipped: %', SQLERRM;
END $$;

DO $$ BEGIN
  CREATE TRIGGER venue_members_updated_at BEFORE UPDATE ON public.venue_members
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.venue_members IS
  'Multi-user venue access; complements profiles.role staff';
COMMENT ON TABLE public.activity_logs IS
  'Owner-facing activity history distinct from security audit_logs';
