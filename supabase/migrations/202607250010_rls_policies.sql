-- =============================================================================
-- 202607250010 — RLS policies for new tables (owner + platform admin)
-- Idempotent via DROP POLICY IF EXISTS + CREATE POLICY
-- =============================================================================

-- Helper: enable RLS on a list of tables
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'media_folders','media_assets','media_variants','media_tags','media_tag_links',
    'media_collections','media_collection_items','media_usage','media_versions',
    'menu_categories','menu_crops','menu_products','product_option_groups',
    'product_options','product_variants','allergens','product_allergens',
    'venue_theme_settings',
    'landing_pages','pages','page_blocks','homepage_sections','hero_sections',
    'sliders','slider_slides','banners','cms_announcements','faq_categories','faqs',
    'testimonials','partners','team_members','blog_categories','blogs','news','popups',
    'seo_metadata',
    'system_config','website_settings','branding','theme_settings','email_settings',
    'sms_settings','storage_settings','analytics_settings','maintenance_settings',
    'feature_flags','languages','translations','notification_templates',
    'notification_outbox','push_tokens',
    'venue_members','permissions','role_permissions','api_keys','user_sessions',
    'login_history','security_events','activity_logs',
    'document_categories','documents','document_versions','attachments'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Generic owner CRUD macro via DO blocks per table with owner_id
DO $$
DECLARE
  t text;
  pol text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'media_folders','media_assets','media_tags','media_collections','media_usage',
    'menu_categories','menu_crops','menu_products','product_option_groups',
    'product_variants','venue_theme_settings','push_tokens','api_keys',
    'venue_members','document_categories','documents','attachments',
    'notification_outbox','activity_logs'
  ]
  LOOP
    pol := t || '_select_own';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_platform_admin())',
      pol, t
    );

    pol := t || '_insert_own';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin())',
      pol, t
    );

    pol := t || '_update_own';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_platform_admin()) WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin())',
      pol, t
    );

    pol := t || '_delete_own';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_platform_admin())',
      pol, t
    );
  END LOOP;
END $$;

-- media_variants: via parent asset ownership
DROP POLICY IF EXISTS media_variants_select_own ON public.media_variants;
CREATE POLICY media_variants_select_own ON public.media_variants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_variants.asset_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS media_variants_mutate_own ON public.media_variants;
CREATE POLICY media_variants_mutate_own ON public.media_variants
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_variants.asset_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_variants.asset_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS media_versions_select_own ON public.media_versions;
CREATE POLICY media_versions_select_own ON public.media_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_versions.media_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS media_versions_mutate_own ON public.media_versions;
CREATE POLICY media_versions_mutate_own ON public.media_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_versions.media_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_versions.media_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS media_tag_links_via_media ON public.media_tag_links;
CREATE POLICY media_tag_links_via_media ON public.media_tag_links
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_tag_links.media_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_tag_links.media_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS media_collection_items_via_collection ON public.media_collection_items;
CREATE POLICY media_collection_items_via_collection ON public.media_collection_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_collections c
      WHERE c.id = media_collection_items.collection_id
        AND (c.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_collections c
      WHERE c.id = media_collection_items.collection_id
        AND (c.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

-- product_options via group/product
DROP POLICY IF EXISTS product_options_via_group ON public.product_options;
CREATE POLICY product_options_via_group ON public.product_options
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.product_option_groups g
      WHERE g.id = product_options.group_id
        AND (g.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.product_option_groups g
      WHERE g.id = product_options.group_id
        AND (g.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS product_allergens_via_product ON public.product_allergens;
CREATE POLICY product_allergens_via_product ON public.product_allergens
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_products p
      WHERE p.id = product_allergens.product_id
        AND (p.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_products p
      WHERE p.id = product_allergens.product_id
        AND (p.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

-- Allergens catalog: readable by all authenticated; admin write
DROP POLICY IF EXISTS allergens_read_all ON public.allergens;
CREATE POLICY allergens_read_all ON public.allergens
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS allergens_admin_write ON public.allergens;
CREATE POLICY allergens_admin_write ON public.allergens
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- CMS / settings: public read for published marketing; admin write
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'landing_pages','pages','homepage_sections','hero_sections','sliders','banners',
    'cms_announcements','faqs','faq_categories','testimonials','partners','team_members',
    'blog_categories','blogs','news','popups','seo_metadata','languages','translations',
    'feature_flags'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      t || '_public_read', t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin())',
      t || '_admin_write', t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS page_blocks_public_read ON public.page_blocks;
CREATE POLICY page_blocks_public_read ON public.page_blocks
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS page_blocks_admin_write ON public.page_blocks;
CREATE POLICY page_blocks_admin_write ON public.page_blocks
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS slider_slides_public_read ON public.slider_slides;
CREATE POLICY slider_slides_public_read ON public.slider_slides
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS slider_slides_admin_write ON public.slider_slides;
CREATE POLICY slider_slides_admin_write ON public.slider_slides
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Platform settings: admin only
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'system_config','website_settings','branding','theme_settings','email_settings',
    'sms_settings','storage_settings','analytics_settings','maintenance_settings',
    'notification_templates','permissions','role_permissions'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin())',
      t || '_admin_all', t
    );
    -- authenticated can read non-secret feature flags / languages already covered
  END LOOP;
END $$;

-- system_config: owners may read non-secret keys
DROP POLICY IF EXISTS system_config_read_nonsecret ON public.system_config;
CREATE POLICY system_config_read_nonsecret ON public.system_config
  FOR SELECT TO authenticated
  USING (is_secret = false OR public.is_platform_admin());

-- Sessions / login / security: self or admin
DROP POLICY IF EXISTS user_sessions_own ON public.user_sessions;
CREATE POLICY user_sessions_own ON public.user_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS login_history_own ON public.login_history;
CREATE POLICY login_history_own ON public.login_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS security_events_own ON public.security_events;
CREATE POLICY security_events_own ON public.security_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR owner_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS document_versions_via_doc ON public.document_versions;
CREATE POLICY document_versions_via_doc ON public.document_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_versions.document_id
        AND (d.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_versions.document_id
        AND (d.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );
