# Meez SQL Added Objects Report

**Purpose:** Inventory of every database object introduced by the Meez production schema migration pack that was accidentally executed on **Jiilna**.

**Source in this repo (do not execute):**

| File | Role |
|------|------|
| `supabase/scripts/APPLY_ALL_PRODUCTION_SCHEMA.sql` | Combined pack (001–013) |
| `supabase/migrations/202607250001_*.sql` … `202607250014_*.sql` | Individual migrations |

**Scope of this report:** Objects created/altered by **`202607250001` through `202607250014` only.**

**Out of scope:**

- Pre-existing Meez core migrations (`20260517`…`20260724`) unless this pack alters them
- Native Jiilna objects that predated this accidental run
- This file does **not** execute SQL and does **not** modify any database

**Confirmation:**

- This report represents **only** changes introduced by the Meez `20260725*` migration pack (and its combined script).
- **Existing Jiilna objects must not be touched** unless they are listed below as having been *created* or *altered* by this pack.
- Before dropping anything on Jiilna, verify with `to_regclass` / `information_schema` that the object exists **and** was not part of Jiilna beforehand (especially `email_settings`, `set_updated_at`, extensions, `admin_users`, `profiles` columns).

---

## Safety legend

| Label | Meaning |
|-------|---------|
| **SAFE** | Created only for Meez; drop if unused on Jiilna |
| **RISKY** | May overwrite or alter a pre-existing Jiilna object; inspect before drop |
| **CONDITIONAL** | Safe to drop only if the parent Meez-only table/bucket is confirmed Meez-only |

---

## 1. Extensions

| Exact name | Type | SQL statement | Purpose in Meez | Dependencies | Safe to remove from Jiilna? |
|------------|------|---------------|-----------------|--------------|------------------------------|
| `pgcrypto` | Extension | `CREATE EXTENSION IF NOT EXISTS pgcrypto` | UUID/crypto helpers | None | **RISKY** — often already present; do not drop if Jiilna uses it |
| `pg_trgm` | Extension | `CREATE EXTENSION IF NOT EXISTS pg_trgm` | Trigram search indexes | None | **RISKY** — do not drop if Jiilna uses GIN trgm |

---

## 2. Enums / custom types

| Exact name | Type | SQL | Purpose | Dependencies | Safe remove? |
|------------|------|-----|---------|--------------|--------------|
| `public.media_role` | ENUM | `CREATE TYPE … AS ENUM ('original','portrait',…)` | Media role slots | Used by media_* | **SAFE** if no Jiilna deps |
| `public.media_status` | ENUM | `CREATE TYPE …` | Asset lifecycle | media_assets | **SAFE** |
| `public.media_visibility` | ENUM | `CREATE TYPE …` | private/unlisted/public | media_assets | **SAFE** |
| `public.optimization_status` | ENUM | `CREATE TYPE …` | compression/optimization | media_* | **SAFE** |
| `public.publish_status` | ENUM | `CREATE TYPE …` | CMS publish state | CMS tables | **SAFE** |
| `public.locale_code` | ENUM | `CREATE TYPE … ('ar','en')` | i18n | languages, CMS, profiles col | **RISKY** if Jiilna already used same name |
| `public.permission_action` | ENUM | `CREATE TYPE …` | RBAC actions | permissions | **SAFE** |
| `public.venue_member_role` | ENUM | `CREATE TYPE …` | venue staff roles | venue_members | **SAFE** |
| `public.security_event_severity` | ENUM | `CREATE TYPE …` | security/audit severity | security_events, audit_logs col | **SAFE** / **RISKY** if name collision |
| `public.document_status` | ENUM | `CREATE TYPE …` | documents status | documents | **SAFE** |
| `public.notification_channel` | ENUM | `CREATE TYPE …` | email/sms/push/… | notification_* | **SAFE** |
| `public.notification_status` | ENUM | `CREATE TYPE …` | outbox status | notification_outbox | **SAFE** |
| `public.catalog_entity_status` | ENUM | `CREATE TYPE …` | catalog entity status | menu_* | **SAFE** |
| `public.admin_role` | ENUM | `CREATE TYPE … ('super_admin','admin','support')` | Platform admin roles | admin_users | **RISKY** if Jiilna already had admin_role |
| `public.device_license_status` | ENUM | `CREATE TYPE …` in 011 | Device license status | device_activations.status | **RISKY** — may already exist on SaaS DBs |

Drop enums only **after** dropping all dependent columns/tables:

```sql
-- Example (after dependents gone):
DROP TYPE IF EXISTS public.media_role CASCADE;
-- …repeat per enum listed above
```

---

## 3. Tables (new)

### 3.1 Media

| Exact name | Type | SQL | Purpose | Dependencies | Safe remove? |
|------------|------|-----|---------|--------------|--------------|
| `public.media_folders` | Table | `CREATE TABLE IF NOT EXISTS` | Media folder tree | `profiles` | **SAFE** |
| `public.media_assets` | Table | `CREATE TABLE IF NOT EXISTS` | Media metadata (replaces Base64 plan) | `profiles`, folders, auth.users | **SAFE** |
| `public.media_variants` | Table | `CREATE TABLE IF NOT EXISTS` | Responsive/format variants | media_assets | **SAFE** |
| `public.media_tags` | Table | `CREATE TABLE IF NOT EXISTS` | Media tags | profiles | **SAFE** |
| `public.media_tag_links` | Table | `CREATE TABLE IF NOT EXISTS` | Tag M2M | media_assets, media_tags | **SAFE** |
| `public.media_collections` | Table | `CREATE TABLE IF NOT EXISTS` | Collections | profiles | **SAFE** |
| `public.media_collection_items` | Table | `CREATE TABLE IF NOT EXISTS` | Collection M2M | collections, assets | **SAFE** |
| `public.media_usage` | Table | `CREATE TABLE IF NOT EXISTS` | Polymorphic media links | media_assets, profiles | **SAFE** |
| `public.media_versions` | Table | `CREATE TABLE IF NOT EXISTS` | Version history | media_assets | **SAFE** |

### 3.2 Catalog

| Exact name | Type | SQL | Purpose | Dependencies | Safe remove? |
|------------|------|-----|---------|--------------|--------------|
| `public.menu_categories` | Table | `CREATE TABLE IF NOT EXISTS` | Normalized categories | profiles | **SAFE** |
| `public.menu_crops` | Table | `CREATE TABLE IF NOT EXISTS` | Normalized crops | profiles | **SAFE** |
| `public.menu_products` | Table | `CREATE TABLE IF NOT EXISTS` | Normalized products | profiles, categories, crops | **SAFE** |
| `public.product_option_groups` | Table | `CREATE TABLE IF NOT EXISTS` | Product options | menu_products, profiles | **SAFE** |
| `public.product_options` | Table | `CREATE TABLE IF NOT EXISTS` | Option values | option_groups | **SAFE** |
| `public.product_variants` | Table | `CREATE TABLE IF NOT EXISTS` | SKU variants | menu_products, profiles | **SAFE** |
| `public.allergens` | Table | `CREATE TABLE IF NOT EXISTS` | Allergen catalog | — | **SAFE** |
| `public.product_allergens` | Table | `CREATE TABLE IF NOT EXISTS` | Product↔allergen | menu_products, allergens | **SAFE** |
| `public.venue_theme_settings` | Table | `CREATE TABLE IF NOT EXISTS` | Theme settings companion | profiles | **SAFE** |

### 3.3 CMS / marketing

| Exact name | Type | SQL | Purpose | Dependencies | Safe remove? |
|------------|------|-----|---------|--------------|--------------|
| `public.landing_pages` | Table | `CREATE TABLE IF NOT EXISTS` | Landing pages CMS | auth.users | **SAFE** |
| `public.pages` | Table | `CREATE TABLE IF NOT EXISTS` | Static/dynamic pages | auth.users | **SAFE** |
| `public.page_blocks` | Table | `CREATE TABLE IF NOT EXISTS` | Page blocks | pages | **SAFE** |
| `public.homepage_sections` | Table | `CREATE TABLE IF NOT EXISTS` | Homepage sections | media_assets | **SAFE** |
| `public.hero_sections` | Table | `CREATE TABLE IF NOT EXISTS` | Heroes | media_assets | **SAFE** |
| `public.sliders` | Table | `CREATE TABLE IF NOT EXISTS` | Sliders | — | **SAFE** |
| `public.slider_slides` | Table | `CREATE TABLE IF NOT EXISTS` | Slides | sliders, media_assets | **SAFE** |
| `public.banners` | Table | `CREATE TABLE IF NOT EXISTS` | Banners | media_assets | **SAFE** |
| `public.cms_announcements` | Table | `CREATE TABLE IF NOT EXISTS` | CMS announcements (≠ kiosk pairing) | — | **SAFE** |
| `public.faq_categories` | Table | `CREATE TABLE IF NOT EXISTS` | FAQ categories | — | **SAFE** |
| `public.faqs` | Table | `CREATE TABLE IF NOT EXISTS` | FAQs | faq_categories | **SAFE** |
| `public.testimonials` | Table | `CREATE TABLE IF NOT EXISTS` | Testimonials | media_assets | **SAFE** |
| `public.partners` | Table | `CREATE TABLE IF NOT EXISTS` | Partners | media_assets | **SAFE** |
| `public.team_members` | Table | `CREATE TABLE IF NOT EXISTS` | Team | media_assets | **SAFE** |
| `public.blog_categories` | Table | `CREATE TABLE IF NOT EXISTS` | Blog categories | — | **SAFE** |
| `public.blogs` | Table | `CREATE TABLE IF NOT EXISTS` | Blog posts | blog_categories, media_assets | **SAFE** |
| `public.news` | Table | `CREATE TABLE IF NOT EXISTS` | News | — | **SAFE** |
| `public.popups` | Table | `CREATE TABLE IF NOT EXISTS` | Popups | media_assets | **SAFE** |
| `public.seo_metadata` | Table | `CREATE TABLE IF NOT EXISTS` | SEO metadata | media_assets | **SAFE** |

### 3.4 Settings / i18n / notifications

| Exact name | Type | SQL | Purpose | Dependencies | Safe remove? |
|------------|------|-----|---------|--------------|--------------|
| `public.system_config` | Table | `CREATE TABLE IF NOT EXISTS` | Key/value system config | auth.users | **SAFE** if Meez-only |
| `public.website_settings` | Table | `CREATE TABLE IF NOT EXISTS` | Website singleton | auth.users | **RISKY** if Jiilna already had this name |
| `public.branding` | Table | `CREATE TABLE IF NOT EXISTS` | Branding singleton | media_assets | **RISKY** if name collision |
| `public.theme_settings` | Table | `CREATE TABLE IF NOT EXISTS` | Marketing/dashboard tokens | — | **SAFE** / **RISKY** if collision |
| `public.email_settings` | Table | `CREATE TABLE IF NOT EXISTS` | Email provider settings | — | **RISKY** — Jiilna likely already had `email_settings` (smtp_server); `IF NOT EXISTS` kept legacy + ALTER added cols |
| `public.sms_settings` | Table | `CREATE TABLE IF NOT EXISTS` | SMS settings | — | **RISKY** if pre-existing |
| `public.storage_settings` | Table | `CREATE TABLE IF NOT EXISTS` | Storage defaults | — | **SAFE** / **RISKY** |
| `public.analytics_settings` | Table | `CREATE TABLE IF NOT EXISTS` | Analytics provider | — | **SAFE** / **RISKY** |
| `public.maintenance_settings` | Table | `CREATE TABLE IF NOT EXISTS` | Maintenance mode | — | **SAFE** / **RISKY** |
| `public.feature_flags` | Table | `CREATE TABLE IF NOT EXISTS` | Feature flags | auth.users | **SAFE** |
| `public.languages` | Table | `CREATE TABLE IF NOT EXISTS` | Locale list | locale_code | **SAFE** / **RISKY** if collision |
| `public.translations` | Table | `CREATE TABLE IF NOT EXISTS` | Translation strings | locale_code | **SAFE** |
| `public.notification_templates` | Table | `CREATE TABLE IF NOT EXISTS` | Notification templates | enums | **SAFE** |
| `public.notification_outbox` | Table | `CREATE TABLE IF NOT EXISTS` | Notification queue | profiles | **SAFE** |
| `public.push_tokens` | Table | `CREATE TABLE IF NOT EXISTS` | Push device tokens | profiles | **SAFE** |

### 3.5 Security / documents / admin bootstrap

| Exact name | Type | SQL | Purpose | Dependencies | Safe remove? |
|------------|------|-----|---------|--------------|--------------|
| `public.admin_users` | Table | `CREATE TABLE IF NOT EXISTS` (001) | Platform admins for `is_platform_admin()` | auth.users, admin_role | **RISKY** if Jiilna already had admins |
| `public.venue_members` | Table | `CREATE TABLE IF NOT EXISTS` | Multi-user venue RBAC | profiles | **SAFE** |
| `public.permissions` | Table | `CREATE TABLE IF NOT EXISTS` | Permission catalog | permission_action | **SAFE** |
| `public.role_permissions` | Table | `CREATE TABLE IF NOT EXISTS` | Role↔permission | permissions, venue_member_role | **SAFE** |
| `public.api_keys` | Table | `CREATE TABLE IF NOT EXISTS` | API keys | profiles | **SAFE** |
| `public.user_sessions` | Table | `CREATE TABLE IF NOT EXISTS` | App session inventory | auth.users | **SAFE** / **RISKY** if collision |
| `public.login_history` | Table | `CREATE TABLE IF NOT EXISTS` | Login audit | auth.users | **SAFE** / **RISKY** |
| `public.security_events` | Table | `CREATE TABLE IF NOT EXISTS` | Security events | auth.users, profiles | **SAFE** |
| `public.activity_logs` | Table | `CREATE TABLE IF NOT EXISTS` | Owner activity log | profiles, auth.users | **SAFE** |
| `public.document_categories` | Table | `CREATE TABLE IF NOT EXISTS` | Doc categories | profiles | **SAFE** |
| `public.documents` | Table | `CREATE TABLE IF NOT EXISTS` | Document vault | profiles, categories | **SAFE** |
| `public.document_versions` | Table | `CREATE TABLE IF NOT EXISTS` | Doc versions | documents | **SAFE** |
| `public.attachments` | Table | `CREATE TABLE IF NOT EXISTS` | Polymorphic attachments | profiles, documents, media_assets | **SAFE** |

---

## 4. Columns added to pre-existing tables (ALTER)

These are **RISKY** on Jiilna: only remove if confirmed they were added by this pack and Jiilna does not need them.

### `public.profiles` (009)

| Column | SQL | Purpose | Safe remove? |
|--------|-----|---------|--------------|
| `preferred_locale` | `ADD COLUMN IF NOT EXISTS … locale_code` | User locale | **RISKY** |
| `timezone` | `ADD COLUMN IF NOT EXISTS` | Timezone | **RISKY** |
| `avatar_media_id` | `ADD COLUMN IF NOT EXISTS` | Avatar FK toward media_assets | **RISKY** |
| `is_active` | `ADD COLUMN IF NOT EXISTS boolean DEFAULT true` | Active flag | **RISKY** |
| Constraint `profiles_phone_format_chk` | `ADD CONSTRAINT` / 014 `NOT VALID` | Phone format | **RISKY** |
| Constraint `profiles_avatar_media_fkey` | FK to media_assets | Avatar FK | **CONDITIONAL** |

### `public.venues` (009) — only if table existed

| Column | Purpose | Safe remove? |
|--------|---------|--------------|
| `catalog_schema_version` | Catalog migration marker | **RISKY** |
| `media_migrated_at` | Media migration marker | **RISKY** |
| `normalized_catalog_at` | Catalog cutover marker | **RISKY** |

### `public.device_activations` (009 + 011) — only if table existed

| Column | Purpose | Safe remove? |
|--------|---------|--------------|
| `app_version`, `os_name`, `os_version`, `last_ip` | Device metadata | **RISKY** |
| `status` (`device_license_status`) | License status | **RISKY** — may break Jiilna device logic if they adopted it |

### `public.audit_logs` (007) — only if table existed

| Column | Purpose | Safe remove? |
|--------|---------|--------------|
| `actor_id`, `entity_type`, `entity_id`, `ip`, `user_agent`, `severity` | Richer audit | **RISKY** |

### Settings tables ALTERs (006)

If Jiilna already had `email_settings` / similar, the pack ran `ADD COLUMN IF NOT EXISTS` for Meez columns (`provider`, `config`, `is_enabled`, etc.). **Do not DROP the whole table.** Only drop Meez-added columns after verifying they did not exist before.

---

## 5. Functions / RPCs

| Exact name | Type | SQL | Purpose | Dependencies | Safe remove? |
|------------|------|-----|---------|--------------|--------------|
| `public.set_updated_at()` | Trigger fn | `CREATE OR REPLACE FUNCTION` | Sets `updated_at` | Used by many triggers | **RISKY** — may have replaced Jiilna’s function |
| `public.is_platform_admin()` | Function | `CREATE OR REPLACE` | Admin gate for RLS | admin_users | **SAFE** if unused by Jiilna |
| `public.current_owner_id()` | Function | `CREATE OR REPLACE` | Returns `auth.uid()` | — | **SAFE** / **RISKY** if name collision |
| `public.get_system_config(text,jsonb)` | Function | `CREATE OR REPLACE` | Read system_config | system_config | **SAFE** |
| `public.get_trial_days()` | Function | `CREATE OR REPLACE` (+014 harden) | Trial length SSOT | get_system_config | **SAFE** |
| `public.write_activity_log(...)` | Function | `CREATE OR REPLACE` (+014) | Write activity_logs | activity_logs | **SAFE** |
| `public.register_media_asset(...)` | Function | `CREATE OR REPLACE` (+014 path check) | Register Storage upload | media_assets | **SAFE** |
| `public.soft_delete_media_asset(uuid)` | Function | `CREATE OR REPLACE` | Soft-delete media | media_assets | **SAFE** |
| `public.venue_product_count(uuid)` | Function | `CREATE OR REPLACE` (+014 authz) | Count products in venues.data | venues | **RISKY** if Jiilna had same name / no venues |
| `public.owner_product_count(uuid)` | Function | `CREATE OR REPLACE` (+014) | Prefer menu_products count | menu_products, venue_product_count | **SAFE** |
| `public.refresh_admin_platform_stats()` | Function | `CREATE OR REPLACE` | Refresh matview | mv_admin_platform_stats, is_platform_admin | **SAFE** |

---

## 6. Triggers

| Exact name | Table | SQL | Purpose | Safe remove? |
|------------|-------|-----|---------|--------------|
| `media_folders_updated_at` | media_folders | `CREATE TRIGGER … set_updated_at` | Touch updated_at | **SAFE** with table |
| `media_assets_updated_at` | media_assets | same | same | **SAFE** |
| `media_variants_updated_at` | media_variants | same | same | **SAFE** |
| `media_collections_updated_at` | media_collections | same | same | **SAFE** |
| `menu_categories_updated_at` | menu_categories | same | same | **SAFE** |
| `menu_crops_updated_at` | menu_crops | same | same | **SAFE** |
| `menu_products_updated_at` | menu_products | same | same | **SAFE** |
| `product_option_groups_updated_at` | product_option_groups | same | same | **SAFE** |
| `product_variants_updated_at` | product_variants | same | same | **SAFE** |
| `venue_theme_settings_updated_at` | venue_theme_settings | same | same | **SAFE** |
| `venue_members_updated_at` | venue_members | same | same | **SAFE** |
| `documents_updated_at` | documents | same | same | **SAFE** |

---

## 7. Views / materialized views

| Exact name | Type | SQL | Purpose | Dependencies | Safe remove? |
|------------|------|-----|---------|--------------|--------------|
| `public.v_owner_catalog_counts` | View | `CREATE OR REPLACE VIEW` | Per-owner counts | profiles, menu_*, media_*, device_activations | **SAFE** |
| `public.v_media_ready` | View | `CREATE OR REPLACE VIEW` | Ready media + variants | media_assets, media_variants | **SAFE** |
| `public.mv_admin_platform_stats` | Materialized view | `DROP` + `CREATE MATERIALIZED VIEW` | Admin rollup | profiles, subscriptions?, device_activations?, media_assets | **SAFE** (derived); **RISKY** deps if subscriptions/devices are Jiilna’s |

---

## 8. Indexes (Meez-named)

All created with `CREATE INDEX IF NOT EXISTS` / unique indexes. Drop with owning tables (CASCADE) or individually.

### Media
`media_folders_owner_parent_name_uidx`, `media_folders_owner_idx`, `media_assets_bucket_path_uidx`, `media_assets_owner_role_idx`, `media_assets_owner_status_idx`, `media_assets_folder_idx`, `media_assets_featured_idx`, `media_assets_hash_idx`, `media_variants_unique_slot_uidx`, `media_variants_asset_idx`, `media_tags_owner_slug_uidx`, `media_usage_unique_slot_uidx`, `media_usage_entity_idx`, `media_usage_media_idx`, `media_usage_primary_uidx`, `media_assets_owner_created_idx`, `media_assets_alt_trgm_idx`, `media_usage_owner_entity_idx`

### Catalog
`menu_categories_owner_legacy_uidx`, `menu_categories_owner_sort_idx`, `menu_crops_owner_legacy_uidx`, `menu_crops_owner_sort_idx`, `menu_crops_name_trgm_idx`, `menu_products_owner_legacy_uidx`, `menu_products_owner_category_idx`, `menu_products_crop_idx`, `menu_products_name_trgm_idx`, `product_variants_owner_sku_uidx`, `menu_products_owner_status_sort_idx`, `menu_crops_owner_status_sort_idx`, `menu_categories_owner_status_idx`, `menu_products_name_en_trgm_idx`

### CMS / settings / security / docs
`page_blocks_page_sort_idx`, `seo_metadata_entity_locale_uidx`, `website_settings_singleton_uidx`, `branding_singleton_uidx`, `email_settings_singleton_uidx`, `sms_settings_singleton_uidx`, `storage_settings_singleton_uidx`, `analytics_settings_singleton_uidx`, `maintenance_settings_singleton_uidx`, `translations_ns_locale_idx`, `notification_outbox_status_sched_idx`, `venue_members_user_idx`, `api_keys_hash_uidx`, `api_keys_owner_idx`, `user_sessions_user_idx`, `login_history_user_idx`, `login_history_created_idx`, `security_events_severity_idx`, `security_events_owner_idx`, `activity_logs_owner_idx`, `activity_logs_actor_idx`, `activity_logs_entity_idx`, `document_categories_owner_idx`, `documents_owner_idx`, `documents_bucket_path_uidx`, `attachments_entity_idx`, `admin_users_role_idx`, `admin_users_email_idx`, `blogs_status_published_idx`, `faqs_published_sort_idx`, `banners_placement_status_idx`, `mv_admin_platform_stats_singleton`, `audit_logs_entity_idx` (on audit_logs), `profiles_phone_trgm_idx`, `profiles_venue_name_trgm_idx`

**Safe remove?** **SAFE** with Meez-only tables; **RISKY** for indexes on shared tables (`profiles_*`, `audit_logs_entity_idx`, settings singleton indexes on pre-existing tables).

---

## 9. RLS policies

### 9.1 Owner CRUD pattern (`*_select_own|insert_own|update_own|delete_own`)

Applied on (010):  
`media_folders`, `media_assets`, `media_tags`, `media_collections`, `media_usage`, `menu_categories`, `menu_crops`, `menu_products`, `product_option_groups`, `product_variants`, `venue_theme_settings`, `push_tokens`, `api_keys`, `venue_members`, `document_categories`, `documents`, `attachments`, `notification_outbox`, `activity_logs`

### 9.2 Special table policies

| Policy name | Table | Purpose | Safe remove? |
|-------------|-------|---------|--------------|
| `media_variants_select_own` / `media_variants_mutate_own` | media_variants | Via parent asset | **SAFE** |
| `media_versions_select_own` / `media_versions_mutate_own` | media_versions | Via parent | **SAFE** |
| `media_tag_links_via_media` | media_tag_links | Via media | **SAFE** |
| `media_collection_items_via_collection` | media_collection_items | Via collection | **SAFE** |
| `product_options_via_group` | product_options | Via group | **SAFE** |
| `product_allergens_via_product` | product_allergens | Via product | **SAFE** |
| `allergens_read_all` / `allergens_admin_write` | allergens | Catalog read/admin write | **SAFE** |
| `*_public_read` / `*_admin_write` | CMS tables list in 010 | Public + admin CMS | **SAFE** (014 replaces some public_read) |
| `page_blocks_*` / `slider_slides_*` | page_blocks, slider_slides | CMS children | **SAFE** |
| `*_admin_all` | system_config family, permissions, etc. | Admin-only settings | **SAFE** |
| `system_config_read_nonsecret` | system_config | Non-secret read | **SAFE** |
| `user_sessions_own` | user_sessions | Self/admin | **SAFE** |
| `login_history_own` | login_history | Self/admin | **SAFE** |
| `security_events_own` | security_events | Self/owner/admin | **SAFE** |
| `document_versions_via_doc` | document_versions | Via documents | **SAFE** |
| `feature_flags_authenticated_read` | feature_flags | 014 replacement | **SAFE** |
| CMS published-only policies (014) | landing_pages, pages, blogs, … | Tighten anon reads | **SAFE** |

### 9.3 Storage policies on `storage.objects`

| Policy name | Purpose | Safe remove? |
|-------------|---------|--------------|
| `venue_media_public_read` | Public read venue-media | **CONDITIONAL** |
| `venue_media_owner_insert/update/delete` | Owner path writes | **CONDITIONAL** |
| `venue_media_private_owner_*` | Private bucket | **CONDITIONAL** |
| `admin_assets_public_read` | Public admin assets | **CONDITIONAL** |
| `admin_assets_admin_write/update/delete` | Admin writes | **CONDITIONAL** |
| `documents_owner_*` | Documents bucket | **CONDITIONAL** |

---

## 10. Storage buckets

| Exact name | Type | SQL | Purpose | Safe remove? |
|------------|------|-----|---------|--------------|
| `venue-media` | Bucket | `INSERT INTO storage.buckets … ON CONFLICT DO NOTHING` | Public venue images | **CONDITIONAL** — only if created by this run and unused by Jiilna |
| `venue-media-private` | Bucket | same | Private originals | **CONDITIONAL** |
| `admin-assets` | Bucket | same | Admin marketing assets | **CONDITIONAL** |
| `documents` | Bucket | same | Private documents | **CONDITIONAL** — name collision risk with other apps |

> Note: Insert often failed with `42501 must be owner of relation buckets` on hosted SQL editors; buckets may have been created manually or may not exist.

---

## 11. Seed / configuration inserts

| Target | SQL | Data | Safe remove? |
|--------|-----|------|--------------|
| `public.allergens` | `INSERT … ON CONFLICT DO NOTHING` | gluten, dairy, eggs, nuts, peanuts, soy, sesame, fish, shellfish, mustard | **SAFE** delete rows or drop table |
| `public.languages` | `INSERT … ON CONFLICT` | ar, en | **SAFE** / **RISKY** if Jiilna languages |
| `public.system_config` | `INSERT … ON CONFLICT` | `trial_days=7`, rate_limit.*, `media.max_upload_bytes`, `catalog.dual_write_json` | **SAFE** delete Meez keys |
| `public.feature_flags` | `INSERT … ON CONFLICT` | `media_storage_uploads`, `normalized_catalog`, `cms_admin`, `maintenance_banner` | **SAFE** |
| `public.permissions` + `role_permissions` | `INSERT … ON CONFLICT` | products/crops/devices/theme/media/billing/settings matrix | **SAFE** |
| `public.website_settings` | `INSERT … SELECT … WHERE NOT EXISTS` | site_name Meez | **RISKY** if row is Jiilna’s |
| Singleton seeds | best-effort DO block | storage/maintenance/email/sms/analytics/branding | **RISKY** for email_settings |

Also: `COMMENT ON SCHEMA public` set in 014 — **RISKY** cosmetic overwrite; restore Jiilna comment if needed.

---

## 12. Cleanup reference for Jiilna

### 12.1 Safe removals (Meez-only objects)

Drop in **dependency order** (children first). Policies/indexes/triggers go with tables via CASCADE.

```sql
-- ========== SAFE CLEANUP SCRIPT (REFERENCE ONLY — DO NOT RUN BLINDLY) ==========
-- Verify each object exists AND is not required by Jiilna before executing.

BEGIN;

-- Views / matviews
DROP MATERIALIZED VIEW IF EXISTS public.mv_admin_platform_stats CASCADE;
DROP VIEW IF EXISTS public.v_media_ready CASCADE;
DROP VIEW IF EXISTS public.v_owner_catalog_counts CASCADE;

-- Meez RPCs (safe names unless Jiilna redefined them)
DROP FUNCTION IF EXISTS public.refresh_admin_platform_stats() CASCADE;
DROP FUNCTION IF EXISTS public.owner_product_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.register_media_asset(text, text, bigint, public.media_role, integer, integer, text, text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.soft_delete_media_asset(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.write_activity_log(text, text, uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.get_trial_days() CASCADE;
DROP FUNCTION IF EXISTS public.get_system_config(text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.is_platform_admin() CASCADE;
DROP FUNCTION IF EXISTS public.current_owner_id() CASCADE;
-- venue_product_count: RISKY if Jiilna had its own — see section 12.2

-- Documents
DROP TABLE IF EXISTS public.attachments CASCADE;
DROP TABLE IF EXISTS public.document_versions CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.document_categories CASCADE;

-- Security extras (Meez)
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.security_events CASCADE;
DROP TABLE IF EXISTS public.login_history CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.venue_members CASCADE;

-- Notifications / i18n / flags (if unused by Jiilna)
DROP TABLE IF EXISTS public.push_tokens CASCADE;
DROP TABLE IF EXISTS public.notification_outbox CASCADE;
DROP TABLE IF EXISTS public.notification_templates CASCADE;
DROP TABLE IF EXISTS public.translations CASCADE;
DROP TABLE IF EXISTS public.feature_flags CASCADE;
-- languages: CONDITIONAL — see risky section

-- CMS
DROP TABLE IF EXISTS public.seo_metadata CASCADE;
DROP TABLE IF EXISTS public.popups CASCADE;
DROP TABLE IF EXISTS public.news CASCADE;
DROP TABLE IF EXISTS public.blogs CASCADE;
DROP TABLE IF EXISTS public.blog_categories CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;
DROP TABLE IF EXISTS public.testimonials CASCADE;
DROP TABLE IF EXISTS public.faqs CASCADE;
DROP TABLE IF EXISTS public.faq_categories CASCADE;
DROP TABLE IF EXISTS public.cms_announcements CASCADE;
DROP TABLE IF EXISTS public.banners CASCADE;
DROP TABLE IF EXISTS public.slider_slides CASCADE;
DROP TABLE IF EXISTS public.sliders CASCADE;
DROP TABLE IF EXISTS public.hero_sections CASCADE;
DROP TABLE IF EXISTS public.homepage_sections CASCADE;
DROP TABLE IF EXISTS public.page_blocks CASCADE;
DROP TABLE IF EXISTS public.pages CASCADE;
DROP TABLE IF EXISTS public.landing_pages CASCADE;

-- Catalog
DROP TABLE IF EXISTS public.product_allergens CASCADE;
DROP TABLE IF EXISTS public.allergens CASCADE;
DROP TABLE IF EXISTS public.product_options CASCADE;
DROP TABLE IF EXISTS public.product_option_groups CASCADE;
DROP TABLE IF EXISTS public.product_variants CASCADE;
DROP TABLE IF EXISTS public.menu_products CASCADE;
DROP TABLE IF EXISTS public.menu_crops CASCADE;
DROP TABLE IF EXISTS public.menu_categories CASCADE;
DROP TABLE IF EXISTS public.venue_theme_settings CASCADE;

-- Media
DROP TABLE IF EXISTS public.media_versions CASCADE;
DROP TABLE IF EXISTS public.media_usage CASCADE;
DROP TABLE IF EXISTS public.media_collection_items CASCADE;
DROP TABLE IF EXISTS public.media_collections CASCADE;
DROP TABLE IF EXISTS public.media_tag_links CASCADE;
DROP TABLE IF EXISTS public.media_tags CASCADE;
DROP TABLE IF EXISTS public.media_variants CASCADE;
DROP TABLE IF EXISTS public.media_assets CASCADE;
DROP TABLE IF EXISTS public.media_folders CASCADE;

-- Settings singletons that are Meez-only (skip if Jiilna-owned)
DROP TABLE IF EXISTS public.system_config CASCADE;
DROP TABLE IF EXISTS public.storage_settings CASCADE;
DROP TABLE IF EXISTS public.maintenance_settings CASCADE;
DROP TABLE IF EXISTS public.analytics_settings CASCADE;
DROP TABLE IF EXISTS public.sms_settings CASCADE;
DROP TABLE IF EXISTS public.theme_settings CASCADE;
-- website_settings / branding / email_settings / languages: see RISKY

-- Enums (after all dependents dropped)
DROP TYPE IF EXISTS public.media_role CASCADE;
DROP TYPE IF EXISTS public.media_status CASCADE;
DROP TYPE IF EXISTS public.media_visibility CASCADE;
DROP TYPE IF EXISTS public.optimization_status CASCADE;
DROP TYPE IF EXISTS public.publish_status CASCADE;
DROP TYPE IF EXISTS public.permission_action CASCADE;
DROP TYPE IF EXISTS public.venue_member_role CASCADE;
DROP TYPE IF EXISTS public.security_event_severity CASCADE;
DROP TYPE IF EXISTS public.document_status CASCADE;
DROP TYPE IF EXISTS public.notification_channel CASCADE;
DROP TYPE IF EXISTS public.notification_status CASCADE;
DROP TYPE IF EXISTS public.catalog_entity_status CASCADE;
-- locale_code / admin_role / device_license_status: see RISKY

-- Storage policies (only if created by Meez run)
DROP POLICY IF EXISTS "venue_media_public_read" ON storage.objects;
DROP POLICY IF EXISTS "venue_media_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "venue_media_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "venue_media_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "venue_media_private_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "venue_media_private_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "venue_media_private_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "venue_media_private_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "admin_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "admin_assets_admin_write" ON storage.objects;
DROP POLICY IF EXISTS "admin_assets_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "admin_assets_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "documents_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_owner_delete" ON storage.objects;

-- Storage buckets (only if empty and unused)
-- DELETE FROM storage.objects WHERE bucket_id IN (...);
-- DELETE FROM storage.buckets WHERE id IN ('venue-media','venue-media-private','admin-assets','documents');

COMMIT;
```

### 12.2 Risky removals (inspect first)

| Object | Risk | Recommended check |
|--------|------|-------------------|
| `public.set_updated_at()` | May be Jiilna’s shared trigger helper | Compare function body/OID history; restore from Jiilna backup if overwritten |
| `public.venue_product_count(uuid)` | May not exist before; may reference missing `venues` | Drop only if unused |
| `public.admin_users` / `admin_role` | May be real Jiilna admins | `SELECT count(*) FROM admin_users` |
| `public.email_settings` / ALTER columns | Jiilna likely had this table | **Do not DROP TABLE**; only remove Meez-added columns if proven |
| `public.website_settings`, `branding`, `languages` | Name collisions | Inspect row data (`site_name='Meez'` → Meez seed) |
| `public.locale_code` enum | May be referenced by Jiilna columns | Do not CASCADE drop until clear |
| `public.device_license_status` + `device_activations.status` | Alters shared device table | Do not drop status if Jiilna devices use it |
| Columns on `profiles` / `venues` / `audit_logs` | Shared core tables | Drop columns only after confirming unused |
| Indexes `profiles_phone_trgm_idx`, `profiles_venue_name_trgm_idx`, `audit_logs_entity_idx` | On shared tables | Drop only if created by pack and unused |
| Constraint `profiles_phone_format_chk` | May block Jiilna phones | `ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_format_chk` |
| Extensions `pgcrypto`, `pg_trgm` | Shared | **Never drop** without Jiilna approval |
| `COMMENT ON SCHEMA public` | Overwrote schema comment | Restore prior comment manually |
| Storage buckets named `documents` | High collision risk | Delete only if empty and confirmed Meez |

```sql
-- ========== RISKY CLEANUP SNIPPETS (REFERENCE ONLY) ==========

-- Only if confirmed Meez-added and unused:
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferred_locale;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS timezone;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_media_id;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_format_chk;
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_media_fkey;

-- ALTER TABLE public.venues DROP COLUMN IF EXISTS catalog_schema_version;
-- ALTER TABLE public.venues DROP COLUMN IF EXISTS media_migrated_at;
-- ALTER TABLE public.venues DROP COLUMN IF EXISTS normalized_catalog_at;

-- ALTER TABLE public.device_activations DROP COLUMN IF EXISTS app_version;
-- ALTER TABLE public.device_activations DROP COLUMN IF EXISTS os_name;
-- ALTER TABLE public.device_activations DROP COLUMN IF EXISTS os_version;
-- ALTER TABLE public.device_activations DROP COLUMN IF EXISTS last_ip;
-- -- status: do not drop without device audit

-- ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS actor_id;
-- ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS entity_type;
-- ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS entity_id;
-- ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS ip;
-- ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS user_agent;
-- ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS severity;

-- DROP FUNCTION IF EXISTS public.venue_product_count(uuid) CASCADE;
-- DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;  -- DANGEROUS

-- DROP TABLE IF EXISTS public.admin_users CASCADE;  -- DANGEROUS if real admins
-- DROP TYPE IF EXISTS public.admin_role CASCADE;
-- DROP TYPE IF EXISTS public.locale_code CASCADE;
-- DROP TYPE IF EXISTS public.device_license_status CASCADE;
```

### 12.3 Do NOT touch (native Jiilna)

- Any table/function/policy **not listed** in this report  
- Jiilna Auth users, roles, and non-Meez Storage buckets  
- Pre-existing `email_settings` rows/business columns (`smtp_server`, etc.)  
- Extensions already required by Jiilna  

---

## 13. Verification queries (read-only) for Jiilna

```sql
-- Which Meez tables exist?
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'media_assets','menu_products','system_config','feature_flags',
    'landing_pages','activity_logs','documents','venue_members'
  )
ORDER BY 1;

-- Meez enums present?
SELECT typname FROM pg_type
WHERE typname IN (
  'media_role','catalog_entity_status','publish_status','venue_member_role'
);

-- Meez functions present?
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'register_media_asset','get_trial_days','is_platform_admin','owner_product_count'
  );

-- Storage buckets
SELECT id, public FROM storage.buckets
WHERE id IN ('venue-media','venue-media-private','admin-assets','documents');

-- Meez seed markers
SELECT key, value FROM public.system_config
WHERE key IN ('trial_days','catalog.dual_write_json')
  AND to_regclass('public.system_config') IS NOT NULL;
```

---

## 14. Final confirmation

1. **This report covers only** the Meez migration pack `202607250001`–`202607250014` (and `APPLY_ALL_PRODUCTION_SCHEMA.sql`).  
2. **Existing Jiilna objects must not be dropped** unless they appear above as Meez-created and you confirm they were not Jiilna’s beforehand.  
3. Prefer **SAFE** section first; treat **RISKY** items as audit tasks, not automatic deletes.  
4. No SQL from this document has been executed by the authoring agent.

---

*Generated from repository sources in `meez-digital-menu`. File: `MEEZ_SQL_ADDED_OBJECTS_REPORT.md`.*
