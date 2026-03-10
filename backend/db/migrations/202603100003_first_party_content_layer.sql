-- First-party Perbug content layer anchored on canonical places.

CREATE TABLE IF NOT EXISTS place_reviews (
  id TEXT PRIMARY KEY,
  canonical_place_id TEXT NOT NULL REFERENCES canonical_places(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL,
  author_profile_id TEXT,
  body TEXT NOT NULL,
  rating NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'PUBLISHED',
  visibility TEXT NOT NULL DEFAULT 'PUBLIC',
  trusted_review BOOLEAN NOT NULL DEFAULT FALSE,
  quality_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  verified_visit_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_place_reviews_place_status ON place_reviews (canonical_place_id, status, visibility);

CREATE TABLE IF NOT EXISTS place_creator_videos (
  id TEXT PRIMARY KEY,
  canonical_place_id TEXT NOT NULL REFERENCES canonical_places(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL,
  media_asset_id TEXT NOT NULL,
  thumbnail_asset_id TEXT,
  title TEXT,
  caption TEXT,
  duration_sec INTEGER,
  status TEXT NOT NULL DEFAULT 'PUBLISHED',
  visibility TEXT NOT NULL DEFAULT 'PUBLIC',
  quality_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_place_creator_videos_place_status ON place_creator_videos (canonical_place_id, status, visibility);

CREATE TABLE IF NOT EXISTS place_saves (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  canonical_place_id TEXT NOT NULL REFERENCES canonical_places(id) ON DELETE CASCADE,
  source_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, canonical_place_id)
);
CREATE INDEX IF NOT EXISTS idx_place_saves_place ON place_saves (canonical_place_id);

CREATE TABLE IF NOT EXISTS place_guides (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE',
  status TEXT NOT NULL DEFAULT 'PUBLISHED',
  cover_asset_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS place_guide_items (
  guide_id TEXT NOT NULL REFERENCES place_guides(id) ON DELETE CASCADE,
  canonical_place_id TEXT NOT NULL REFERENCES canonical_places(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  note TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guide_id, canonical_place_id)
);
CREATE INDEX IF NOT EXISTS idx_place_guide_items_place ON place_guide_items (canonical_place_id);

CREATE TABLE IF NOT EXISTS place_content_engagement_events (
  id TEXT PRIMARY KEY,
  canonical_place_id TEXT NOT NULL REFERENCES canonical_places(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id TEXT,
  event_type TEXT NOT NULL,
  actor_user_id TEXT,
  event_value NUMERIC(8,3) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_place_content_engagement_place_time ON place_content_engagement_events (canonical_place_id, created_at DESC);

CREATE TABLE IF NOT EXISTS place_first_party_metrics (
  canonical_place_id TEXT PRIMARY KEY REFERENCES canonical_places(id) ON DELETE CASCADE,
  review_count INTEGER NOT NULL DEFAULT 0,
  creator_video_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  public_guide_count INTEGER NOT NULL DEFAULT 0,
  trusted_review_count INTEGER NOT NULL DEFAULT 0,
  helpful_vote_count INTEGER NOT NULL DEFAULT 0,
  engagement_velocity_30d NUMERIC(8,4) NOT NULL DEFAULT 0,
  content_richness_score NUMERIC(8,4) NOT NULL DEFAULT 0,
  trust_score NUMERIC(8,4) NOT NULL DEFAULT 0,
  first_party_quality_boost NUMERIC(8,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
