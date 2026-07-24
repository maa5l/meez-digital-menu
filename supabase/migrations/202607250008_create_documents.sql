-- =============================================================================
-- 202607250008 — Documents / attachments file management
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.document_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  slug          text,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_categories_owner_idx
  ON public.document_categories (owner_id);

CREATE TABLE IF NOT EXISTS public.documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id     uuid REFERENCES public.document_categories(id) ON DELETE SET NULL,
  title           text NOT NULL,
  description     text,
  mime_type       text NOT NULL,
  file_size       bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  storage_bucket  text NOT NULL DEFAULT 'documents',
  storage_path    text NOT NULL,
  status          public.document_status NOT NULL DEFAULT 'active',
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT documents_path_nonempty CHECK (char_length(storage_path) > 0)
);

CREATE INDEX IF NOT EXISTS documents_owner_idx
  ON public.documents (owner_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS documents_bucket_path_uidx
  ON public.documents (storage_bucket, storage_path)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.document_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number  integer NOT NULL CHECK (version_number > 0),
  storage_bucket  text NOT NULL,
  storage_path    text NOT NULL,
  mime_type       text NOT NULL,
  file_size       bigint NOT NULL DEFAULT 0,
  change_note     text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type     text NOT NULL,
  entity_id       uuid NOT NULL,
  document_id     uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  media_id        uuid REFERENCES public.media_assets(id) ON DELETE CASCADE,
  label           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attachments_has_target CHECK (document_id IS NOT NULL OR media_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS attachments_entity_idx
  ON public.attachments (entity_type, entity_id);

DO $$ BEGIN
  CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.documents IS
  'Private document vault (PDFs/contracts) in Storage bucket documents';
