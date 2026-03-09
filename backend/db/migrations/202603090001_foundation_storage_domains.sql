-- Migration-safe storage foundation for plans, roles, places, reviews, media,
-- creator assets, business claims, and entitlements.
-- Additive-only migration: does not remove legacy tables.

-- =====================================================
-- PLANS + ENTITLEMENT DEFINITIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS plan_definitions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  audience_type TEXT NOT NULL,
  family_key TEXT NOT NULL,
  tier_key TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  display_name TEXT NOT NULL,
  description TEXT,
  billing_interval TEXT NOT NULL DEFAULT 'NONE',
  price_amount_cents INTEGER NOT NULL DEFAULT 0,
  price_currency TEXT NOT NULL DEFAULT 'USD',
  is_billable BOOLEAN NOT NULL DEFAULT FALSE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  is_saleable BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  trial_days INTEGER,
  replacement_plan_id TEXT REFERENCES plan_definitions(id),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deprecated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_plan_definitions_audience_status ON plan_definitions (audience_type, status);
CREATE INDEX IF NOT EXISTS idx_plan_definitions_family_version ON plan_definitions (family_key, version DESC);

CREATE TABLE IF NOT EXISTS entitlement_definitions (
  id TEXT PRIMARY KEY,
  entitlement_key TEXT NOT NULL UNIQUE,
  value_type TEXT NOT NULL,
  default_value_json JSONB NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deprecated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS plan_entitlements (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plan_definitions(id) ON DELETE CASCADE,
  entitlement_definition_id TEXT NOT NULL REFERENCES entitlement_definitions(id),
  value_json JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'PLAN',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, entitlement_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_entitlements_plan_status ON plan_entitlements (plan_id, status);

CREATE TABLE IF NOT EXISTS plan_upgrade_paths (
  id TEXT PRIMARY KEY,
  from_plan_id TEXT NOT NULL REFERENCES plan_definitions(id) ON DELETE CASCADE,
  to_plan_id TEXT NOT NULL REFERENCES plan_definitions(id) ON DELETE CASCADE,
  path_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_plan_id, to_plan_id, path_type)
);

-- =====================================================
-- ROLE DEFINITIONS + ASSIGNMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS role_definitions (
  id TEXT PRIMARY KEY,
  role_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'GLOBAL',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_definition_id TEXT NOT NULL REFERENCES role_definitions(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  grant_source TEXT NOT NULL DEFAULT 'SYSTEM',
  granted_by_user_id TEXT REFERENCES users(id),
  granted_reason TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_role_assignments_active_unique
  ON user_role_assignments (user_id, role_definition_id)
  WHERE status IN ('ACTIVE', 'PENDING');

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_status ON user_role_assignments (user_id, status);

-- Backfill compatibility: preserve existing user_roles grants into new assignment table.
INSERT INTO role_definitions (id, role_key, display_name)
SELECT CONCAT('role:', LOWER(role)), role, INITCAP(LOWER(REPLACE(role, '_', ' ')))
FROM user_roles
ON CONFLICT (role_key) DO NOTHING;

INSERT INTO user_role_assignments (id, user_id, role_definition_id, status, grant_source, granted_at)
SELECT
  CONCAT('ura:', user_id, ':', LOWER(role)),
  user_id,
  CONCAT('role:', LOWER(role)),
  'ACTIVE',
  'LEGACY_BACKFILL',
  assigned_at
FROM user_roles
ON CONFLICT DO NOTHING;

-- =====================================================
-- PLACES + SOURCE ATTRIBUTION + CATEGORY MAPPING
-- =====================================================
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  canonical_slug TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  visibility_status TEXT NOT NULL DEFAULT 'PUBLIC',
  moderation_status TEXT NOT NULL DEFAULT 'CLEAR',
  claim_status TEXT NOT NULL DEFAULT 'UNCLAIMED',
  name TEXT NOT NULL,
  normalized_name TEXT,
  description TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  country_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone_e164 TEXT,
  website_url TEXT,
  hero_media_asset_id TEXT,
  quality_score NUMERIC(5,2),
  freshness_checked_at TIMESTAMPTZ,
  last_ingested_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  suppressed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_places_status_visibility ON places (status, visibility_status);
CREATE INDEX IF NOT EXISTS idx_places_name_city ON places (normalized_name, city);
CREATE INDEX IF NOT EXISTS idx_places_geo ON places (latitude, longitude);

CREATE TABLE IF NOT EXISTS place_source_records (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_place_id TEXT NOT NULL,
  source_status TEXT NOT NULL DEFAULT 'ACTIVE',
  source_url TEXT,
  source_payload_json JSONB,
  source_refreshed_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_place_id)
);

CREATE INDEX IF NOT EXISTS idx_place_source_records_place_provider ON place_source_records (place_id, provider, source_status);

CREATE TABLE IF NOT EXISTS place_category_mappings (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  taxonomy_provider TEXT NOT NULL,
  category_key TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  confidence NUMERIC(5,4),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (place_id, taxonomy_provider, category_key)
);

CREATE INDEX IF NOT EXISTS idx_place_category_mappings_primary ON place_category_mappings (place_id, is_primary);

-- =====================================================
-- REVIEWS + MEDIA CORE
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id),
  author_user_id TEXT REFERENCES users(id),
  author_profile_type TEXT NOT NULL,
  author_profile_id TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'USER_SUBMITTED',
  review_kind TEXT NOT NULL DEFAULT 'TEXT',
  status TEXT NOT NULL DEFAULT 'PUBLISHED',
  moderation_status TEXT NOT NULL DEFAULT 'PENDING',
  visibility_status TEXT NOT NULL DEFAULT 'PUBLIC',
  trust_status TEXT NOT NULL DEFAULT 'STANDARD',
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  rating NUMERIC(3,2),
  body_text TEXT,
  edit_window_ends_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  hidden_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reviews_place_status_created ON reviews (place_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_author_created ON reviews (author_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  media_type TEXT NOT NULL,
  owner_user_id TEXT REFERENCES users(id),
  uploader_user_id TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  moderation_status TEXT NOT NULL DEFAULT 'PENDING',
  processing_status TEXT NOT NULL DEFAULT 'UPLOADED',
  visibility_status TEXT NOT NULL DEFAULT 'PUBLIC',
  storage_provider TEXT NOT NULL,
  storage_bucket TEXT,
  storage_key TEXT NOT NULL,
  source_provider TEXT,
  source_media_id TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  width_px INTEGER,
  height_px INTEGER,
  duration_ms INTEGER,
  checksum_sha256 TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  UNIQUE (storage_provider, storage_key)
);

CREATE INDEX IF NOT EXISTS idx_media_assets_type_status ON media_assets (media_type, status, moderation_status);
CREATE INDEX IF NOT EXISTS idx_media_assets_owner ON media_assets (owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS media_asset_derivatives (
  id TEXT PRIMARY KEY,
  media_asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  derivative_type TEXT NOT NULL,
  storage_provider TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT,
  width_px INTEGER,
  height_px INTEGER,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'READY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (media_asset_id, derivative_type)
);

CREATE TABLE IF NOT EXISTS media_attachments (
  id TEXT PRIMARY KEY,
  media_asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  role_key TEXT NOT NULL DEFAULT 'PRIMARY',
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_by_user_id TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  UNIQUE (media_asset_id, target_type, target_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_media_attachments_target ON media_attachments (target_type, target_id, status, display_order);

CREATE TABLE IF NOT EXISTS review_media_links (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  media_asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (review_id, media_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_review_media_links_review ON review_media_links (review_id, status, display_order);

-- =====================================================
-- CREATOR ASSETS + LINKS
-- =====================================================
CREATE TABLE IF NOT EXISTS creator_profile_links (
  id TEXT PRIMARY KEY,
  creator_profile_id TEXT NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  label TEXT,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (creator_profile_id, link_type, url)
);

CREATE TABLE IF NOT EXISTS creator_assets (
  id TEXT PRIMARY KEY,
  creator_profile_id TEXT NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  media_asset_id TEXT REFERENCES media_assets(id) ON DELETE RESTRICT,
  asset_type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  visibility_status TEXT NOT NULL DEFAULT 'PUBLIC',
  moderation_status TEXT NOT NULL DEFAULT 'PENDING',
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_assets_profile_status ON creator_assets (creator_profile_id, status, visibility_status);

-- =====================================================
-- BUSINESS CLAIMS + PLACE MANAGEMENT
-- =====================================================
CREATE TABLE IF NOT EXISTS business_claims (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id),
  business_profile_id TEXT NOT NULL REFERENCES business_profiles(id),
  submitted_by_user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  verification_status TEXT NOT NULL DEFAULT 'PENDING',
  evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviewer_notes TEXT,
  decision_reason TEXT,
  decided_by_user_id TEXT REFERENCES users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_business_claims_place_status ON business_claims (place_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_claims_business_status ON business_claims (business_profile_id, status, submitted_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_claims_one_pending_per_business_place
  ON business_claims (place_id, business_profile_id)
  WHERE status IN ('PENDING', 'UNDER_REVIEW');

CREATE TABLE IF NOT EXISTS business_place_relationships (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id),
  business_profile_id TEXT NOT NULL REFERENCES business_profiles(id),
  source_claim_id TEXT REFERENCES business_claims(id),
  relationship_type TEXT NOT NULL DEFAULT 'OWNER',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (place_id, business_profile_id, relationship_type, started_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_place_relationships_one_active_owner
  ON business_place_relationships (place_id)
  WHERE status = 'ACTIVE' AND relationship_type = 'OWNER';

-- =====================================================
-- ENTITLEMENT GRANTS (PLAN + MANUAL + PROMO)
-- =====================================================
CREATE TABLE IF NOT EXISTS entitlement_grants (
  id TEXT PRIMARY KEY,
  entitlement_definition_id TEXT NOT NULL REFERENCES entitlement_definitions(id),
  principal_type TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_ref_id TEXT,
  plan_id TEXT REFERENCES plan_definitions(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  value_json JSONB NOT NULL,
  quota_period TEXT,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by_user_id TEXT REFERENCES users(id),
  created_by_user_id TEXT REFERENCES users(id),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entitlement_grants_principal_status
  ON entitlement_grants (principal_type, principal_id, status, effective_from);
CREATE INDEX IF NOT EXISTS idx_entitlement_grants_definition_principal
  ON entitlement_grants (entitlement_definition_id, principal_type, principal_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlement_grants_active_source_unique
  ON entitlement_grants (entitlement_definition_id, principal_type, principal_id, source_type, COALESCE(source_ref_id, ''))
  WHERE status IN ('ACTIVE', 'SCHEDULED');

-- Optional link after media_assets exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'places' AND constraint_name = 'fk_places_hero_media'
  ) THEN
    ALTER TABLE places
      ADD CONSTRAINT fk_places_hero_media
      FOREIGN KEY (hero_media_asset_id)
      REFERENCES media_assets(id)
      ON DELETE SET NULL;
  END IF;
END $$;
