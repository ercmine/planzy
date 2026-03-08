-- Subscription and entitlements scaffold (idempotent)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  account_type TEXT NOT NULL,
  tier TEXT NOT NULL,
  display_name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL,
  billable INTEGER NOT NULL,
  visible INTEGER NOT NULL,
  saleable INTEGER NOT NULL,
  entitlements_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_subscriptions (
  account_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  billing_interval TEXT NOT NULL,
  trial_ends_at TEXT,
  grace_ends_at TEXT,
  cancel_at_period_end INTEGER DEFAULT 0,
  provider_subscription_id TEXT,
  comped INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entitlement_overrides (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  entitlement_key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  reason TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_counters (
  account_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  window TEXT NOT NULL,
  period_key TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id, metric, window, period_key)
);

CREATE TABLE IF NOT EXISTS subscription_events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);
