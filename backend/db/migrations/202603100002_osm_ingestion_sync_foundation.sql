-- OSM ingestion/sync operational tables and freshness tracking.

CREATE TABLE IF NOT EXISTS place_import_runs (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  mode TEXT NOT NULL,
  region_slug TEXT NOT NULL,
  region_label TEXT,
  import_version TEXT,
  source_checksum TEXT,
  cursor TEXT,
  status TEXT NOT NULL DEFAULT 'RUNNING',
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_place_import_runs_lookup
  ON place_import_runs (source_name, region_slug, started_at DESC);

ALTER TABLE place_source_records
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stale_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_import_run_id TEXT REFERENCES place_import_runs(id);

CREATE INDEX IF NOT EXISTS idx_place_source_records_seen_stale
  ON place_source_records (source_name, last_seen_at, stale_at);

ALTER TABLE canonical_places
  ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_import_run_id TEXT REFERENCES place_import_runs(id);

CREATE INDEX IF NOT EXISTS idx_canonical_places_last_refreshed
  ON canonical_places (last_refreshed_at DESC);
