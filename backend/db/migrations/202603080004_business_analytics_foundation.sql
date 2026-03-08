-- Business analytics events and daily rollups
CREATE TABLE IF NOT EXISTS business_analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  place_id TEXT NOT NULL,
  business_profile_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  session_id TEXT,
  user_id TEXT,
  creator_profile_id TEXT,
  content_id TEXT,
  source_surface TEXT,
  outbound_target TEXT,
  rating NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_analytics_events_scope_time
  ON business_analytics_events (business_profile_id, place_id, occurred_at);

CREATE TABLE IF NOT EXISTS business_place_daily_metrics (
  business_profile_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  metric_date DATE NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  unique_viewers_approx INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  list_adds INTEGER NOT NULL DEFAULT 0,
  outbound_clicks INTEGER NOT NULL DEFAULT 0,
  clicks_website INTEGER NOT NULL DEFAULT 0,
  clicks_phone INTEGER NOT NULL DEFAULT 0,
  clicks_booking INTEGER NOT NULL DEFAULT 0,
  clicks_menu INTEGER NOT NULL DEFAULT 0,
  clicks_directions INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  rating_sum NUMERIC(12,2) NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  review_responses INTEGER NOT NULL DEFAULT 0,
  creator_exposure INTEGER NOT NULL DEFAULT 0,
  creator_clickthrough INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (business_profile_id, place_id, metric_date)
);

CREATE TABLE IF NOT EXISTS business_rollup_daily_metrics (
  business_profile_id TEXT NOT NULL,
  metric_date DATE NOT NULL,
  place_count INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  outbound_clicks INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  creator_clickthrough INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (business_profile_id, metric_date)
);
