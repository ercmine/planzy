-- Canonical billing domain layer (target-aware, provider-agnostic)
CREATE TABLE IF NOT EXISTS billing_plan_definitions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  target_type TEXT NOT NULL,
  tier TEXT NOT NULL,
  display_name TEXT NOT NULL,
  plan_interval TEXT NOT NULL,
  price_amount INTEGER NOT NULL,
  price_currency TEXT NOT NULL DEFAULT 'USD',
  is_active INTEGER NOT NULL DEFAULT 1,
  trial_days INTEGER,
  metadata_json TEXT,
  entitlements_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id TEXT PRIMARY KEY,
  subscription_target_type TEXT NOT NULL,
  subscription_target_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  status TEXT NOT NULL,
  renewal_status TEXT NOT NULL,
  cancellation_mode TEXT NOT NULL,
  started_at TEXT NOT NULL,
  current_period_start_at TEXT,
  current_period_end_at TEXT,
  renews_at TEXT,
  canceled_at TEXT,
  cancel_effective_at TEXT,
  expires_at TEXT,
  trial_start_at TEXT,
  trial_end_at TEXT,
  grace_start_at TEXT,
  grace_end_at TEXT,
  past_due_at TEXT,
  last_payment_at TEXT,
  billing_anchor_at TEXT,
  auto_renews INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (subscription_target_type, subscription_target_id)
);

CREATE TABLE IF NOT EXISTS billing_subscription_events (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  previous_state TEXT,
  next_state TEXT,
  actor TEXT NOT NULL,
  payload_json TEXT,
  occurred_at TEXT NOT NULL
);
