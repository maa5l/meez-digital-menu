-- Storage buckets (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('venue-media', 'venue-media', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml']),
  ('venue-media-private', 'venue-media-private', false, 20971520, ARRAY['image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml']),
  ('admin-assets', 'admin-assets', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml','application/pdf']),
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
