-- Sponsored Locations with Perbug Rewards

create table if not exists business_place_access (
  id text primary key,
  place_id text not null,
  business_id text not null,
  user_id text not null,
  role text not null,
  status text not null,
  created_at timestamptz not null,
  approved_at timestamptz,
  reviewed_by text
);

create table if not exists sponsored_campaigns (
  id text primary key,
  place_id text not null,
  business_id text not null,
  title text not null,
  call_to_action text,
  category_tags jsonb not null,
  placements jsonb not null,
  target_radius_meters integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  daily_budget_atomic numeric(38,0) not null,
  total_budget_atomic numeric(38,0) not null,
  status text not null,
  created_by text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists sponsored_reward_rules (
  campaign_id text primary key references sponsored_campaigns(id) on delete cascade,
  type text not null,
  payout_atomic numeric(38,0) not null,
  decay_bps integer,
  first_x_daily integer,
  split_window_days integer,
  cooldown_hours integer not null,
  dwell_seconds integer not null,
  required_actions jsonb not null,
  one_reward_per_day boolean not null
);

create table if not exists sponsored_campaign_budgets (
  campaign_id text primary key references sponsored_campaigns(id) on delete cascade,
  funded_atomic numeric(38,0) not null,
  platform_fee_atomic numeric(38,0) not null,
  reward_pool_atomic numeric(38,0) not null,
  reserved_atomic numeric(38,0) not null,
  paid_atomic numeric(38,0) not null,
  refunded_atomic numeric(38,0) not null,
  updated_at timestamptz not null
);

create table if not exists sponsored_visit_sessions (
  id text primary key,
  user_id text not null,
  campaign_id text not null references sponsored_campaigns(id) on delete cascade,
  place_id text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  status text not null,
  start_lat double precision not null,
  start_lng double precision not null,
  latest_lat double precision not null,
  latest_lng double precision not null,
  samples integer not null,
  dwell_seconds integer not null,
  risk_score integer not null,
  risk_reasons jsonb not null
);

create table if not exists sponsored_eligibility_decisions (
  id text primary key,
  visit_session_id text not null unique references sponsored_visit_sessions(id) on delete cascade,
  eligible boolean not null,
  rejection_reasons jsonb not null,
  payout_atomic numeric(38,0) not null,
  decided_at timestamptz not null
);

create table if not exists sponsored_reward_claims (
  id text primary key,
  campaign_id text not null references sponsored_campaigns(id) on delete cascade,
  place_id text not null,
  user_id text not null,
  visit_session_id text not null unique references sponsored_visit_sessions(id) on delete cascade,
  decision_id text not null references sponsored_eligibility_decisions(id) on delete cascade,
  payout_atomic numeric(38,0) not null,
  status text not null,
  created_at timestamptz not null,
  paid_at timestamptz
);

create table if not exists sponsored_fraud_flags (
  id text primary key,
  campaign_id text,
  place_id text,
  user_id text,
  visit_session_id text,
  severity text not null,
  reason text not null,
  created_at timestamptz not null
);

create table if not exists sponsored_ledger_entries (
  id text primary key,
  campaign_id text not null references sponsored_campaigns(id) on delete cascade,
  place_id text not null,
  business_id text not null,
  user_id text,
  type text not null,
  amount_atomic numeric(38,0) not null,
  metadata jsonb not null,
  created_at timestamptz not null
);
