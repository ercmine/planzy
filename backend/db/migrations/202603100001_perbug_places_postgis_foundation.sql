-- Perbug owned places platform foundation.
-- Adds canonical place storage, source identities, source attribution,
-- category normalization, and PostGIS nearby-query primitives.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS place_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  parent_category_id TEXT REFERENCES place_categories(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_categories_status ON place_categories (status);

CREATE TABLE IF NOT EXISTS source_category_mappings (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_value TEXT,
  category_id TEXT NOT NULL REFERENCES place_categories(id),
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0.7500,
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_name, source_key, source_value, category_id)
);

CREATE INDEX IF NOT EXISTS idx_source_category_mappings_lookup
  ON source_category_mappings (source_name, source_key, source_value, status, priority);

CREATE TABLE IF NOT EXISTS place_import_batches (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'RUNNING',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canonical_places (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  visibility_status TEXT NOT NULL DEFAULT 'PUBLIC',
  primary_name TEXT NOT NULL,
  normalized_name TEXT,
  secondary_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  description TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  country_code TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geo_point GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  phone_e164 TEXT,
  website_url TEXT,
  price_level SMALLINT,
  quality_score NUMERIC(5,2),
  source_freshness_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CHECK (latitude BETWEEN -90 AND 90),
  CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS idx_canonical_places_status_visibility
  ON canonical_places (status, visibility_status);
CREATE INDEX IF NOT EXISTS idx_canonical_places_city_region_country
  ON canonical_places (city, region, country_code);
CREATE INDEX IF NOT EXISTS idx_canonical_places_normalized_name
  ON canonical_places (normalized_name);
CREATE INDEX IF NOT EXISTS idx_canonical_places_geo_point_gist
  ON canonical_places USING GIST (geo_point);

CREATE TABLE IF NOT EXISTS canonical_place_categories (
  id TEXT PRIMARY KEY,
  canonical_place_id TEXT NOT NULL REFERENCES canonical_places(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES place_categories(id),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  confidence NUMERIC(5,4),
  source TEXT NOT NULL DEFAULT 'NORMALIZED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (canonical_place_id, category_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_place_categories_one_primary
  ON canonical_place_categories (canonical_place_id)
  WHERE is_primary;
CREATE INDEX IF NOT EXISTS idx_canonical_place_categories_category_lookup
  ON canonical_place_categories (category_id, canonical_place_id);

CREATE TABLE IF NOT EXISTS place_source_records (
  id TEXT PRIMARY KEY,
  canonical_place_id TEXT NOT NULL REFERENCES canonical_places(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  source_version TEXT,
  source_url TEXT,
  raw_name TEXT,
  raw_tags_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  source_category_keys TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  source_record_updated_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  import_batch_id TEXT REFERENCES place_import_batches(id),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_name, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_place_source_records_canonical
  ON place_source_records (canonical_place_id, source_name);
CREATE INDEX IF NOT EXISTS idx_place_source_records_batch
  ON place_source_records (import_batch_id, source_name);

CREATE TABLE IF NOT EXISTS place_source_attributions (
  id TEXT PRIMARY KEY,
  canonical_place_id TEXT NOT NULL REFERENCES canonical_places(id) ON DELETE CASCADE,
  place_source_record_id TEXT REFERENCES place_source_records(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_label TEXT NOT NULL,
  source_url TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_place_source_attributions_dedupe
  ON place_source_attributions (canonical_place_id, source_name, COALESCE(place_source_record_id, ''));


CREATE UNIQUE INDEX IF NOT EXISTS idx_place_source_attributions_primary
  ON place_source_attributions (canonical_place_id)
  WHERE is_primary;

CREATE INDEX IF NOT EXISTS idx_place_source_attributions_source
  ON place_source_attributions (source_name, canonical_place_id);
