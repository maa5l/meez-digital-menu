# Archived SQL scripts

These files were one-off fixes applied before migrations were consolidated.
**Do not run on a database that already has migrations through `20260614150000`.**

Use `supabase/migrations/` as the only source of truth for schema changes.

| File | Replaced by |
|------|-------------|
| `FIX_PROFILES.sql` | `20260517120000_accounts_and_profiles.sql` |
| `FIX_PROFILES_PHONE.sql` | `20260520130000_profiles_phone_and_venue_link.sql` |
| `FIX_VERIFICATION_CODE.sql` | `20260520140000_verification_code_flow.sql` |
| `patches/v2_remaining_part1_rate_limit.sql` | `20260613180000_security_hardening_v2.sql` |
