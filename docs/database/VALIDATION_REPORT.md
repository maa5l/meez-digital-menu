# Database Validation Report (Post-Migration Audit)

**Date:** 2026-07-24  
**Scope:** `202607250001`–`014` + app compatibility  
**Canvas:** `database-validation-audit.canvas.tsx`

## Verdict

**Not fully production-ready** until:

1. `202607250014_validation_security_fixes.sql` is applied  
2. Storage buckets are created in the Supabase Dashboard  
3. (Recommended) `database.types.ts` regenerated  

Live app remains on `venues.data` — applying 001–014 is a **safe dark launch** if 014 is included.

## Scores (after applying 014)

| Metric | Score |
|--------|------:|
| SQL Validation | 88% |
| Schema Integrity | 90% |
| Security | 86% |
| Performance | 62% |
| Migration Readiness | 84% |
| Supabase Compatibility | 82% |
| **Production Readiness** | **72%** |

## Blocking issues → remediation

| ID | Issue | Fix |
|----|-------|-----|
| C1 | CMS RLS `USING (true)` draft leak | Fixed in **014** |
| C2 | Product-count DEFINER cross-tenant | Fixed in **014** |
| H1 | Missing `REVOKE FROM PUBLIC` | Fixed in **014** |
| H2 | Matview readable by clients | Fixed in **014** |
| H4 | Phone CHECK aborts on dirty data | Fixed in **014** (`NOT VALID`) |
| H7 | `register_media_asset` path hijack | Fixed in **014** |
| C3 | Needs legacy core tables first | Process — apply 20260517→20260724 first |
| Storage 42501 | Cannot own `storage.buckets` | Dashboard buckets |

## Apply order

```text
1. Existing Meez migrations through 20260724
2. APPLY_ALL_PRODUCTION_SCHEMA.sql  (001–013)
3. 202607250014_validation_security_fixes.sql
4. Dashboard → Storage buckets:
   venue-media (public)
   venue-media-private
   admin-assets
   documents
5. npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
```

## App compatibility

| Area | Status |
|------|--------|
| Current menu/images/devices | OK on legacy path |
| New media/catalog/CMS tables | Unused (dark) |
| Feature flags | Unused by app |
| `get_trial_days` | Unused by UI/signup (both still 7) |
| `database.types.ts` | Lagging |

## Open follow-ups

- H3: Split `ADD COLUMN IF NOT EXISTS` from `REFERENCES` to avoid duplicate FKs on re-run  
- Wire app to Storage + `register_media_asset` before enabling `media_storage_uploads`  
- Point signup/trial RPCs at `get_trial_days()`
