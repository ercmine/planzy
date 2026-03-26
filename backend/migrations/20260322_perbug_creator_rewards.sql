-- Dryad creator rewards schema reference migration.
-- The current backend uses in-memory stores in development, but this migration documents
-- the production relational schema required for the Solana-based DRYAD rewards system.

create table if not exists users (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wallets (
  id text primary key,
  user_id text not null references users(id),
  chain text not null check (chain = 'solana'),
  public_key text not null unique,
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists wallets_user_idx on wallets(user_id, is_primary);

create table if not exists places (
  id text primary key,
  external_place_id text,
  slug text,
  name text not null,
  lat numeric,
  lng numeric,
  address text,
  reward_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reward_tiers (
  id text primary key,
  name text not null,
  start_position integer not null,
  end_position integer,
  token_amount numeric(20,9) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into reward_tiers (id, name, start_position, end_position, token_amount, active)
values
  ('tier-1', 'Tier 1', 1, 1, 200, true),
  ('tier-2', 'Tier 2', 2, 5, 100, true),
  ('tier-3', 'Tier 3', 6, 10, 50, true),
  ('tier-4', 'Tier 4', 11, 20, 20, true),
  ('tier-5', 'Tier 5', 21, null, 5, true)
on conflict (id) do nothing;

create table if not exists place_reward_state (
  place_id text primary key references places(id),
  approved_rewarded_review_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists reviews (
  id text primary key,
  user_id text not null references users(id),
  place_id text not null references places(id),
  video_url text not null,
  content_hash text not null unique,
  status text not null,
  moderation_status text not null,
  quality_rating text not null,
  reward_status text not null,
  reward_position integer,
  base_reward_amount numeric(20,9),
  final_reward_amount numeric(20,9),
  approval_timestamp timestamptz,
  distinct_reward_slot text not null default 'standard',
  admin_distinct_reward_slot_enabled boolean not null default false,
  reward_blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reviews_place_reward_idx on reviews(place_id, reward_status, reward_position);
create index if not exists reviews_user_place_idx on reviews(user_id, place_id);

create table if not exists reward_eligibility (
  id text primary key,
  review_id text not null unique references reviews(id),
  user_id text not null references users(id),
  place_id text not null references places(id),
  is_duplicate boolean not null default false,
  is_spam boolean not null default false,
  is_geo_verified boolean not null default false,
  policy_passed boolean not null default true,
  rule_version text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reward_claims (
  id text primary key,
  user_id text not null references users(id),
  wallet_public_key text not null,
  review_id text not null unique references reviews(id),
  place_id text not null references places(id),
  token_mint text not null,
  amount_atomic numeric(39,0) not null,
  amount_display numeric(20,9) not null,
  status text not null,
  cluster text not null,
  transaction_signature text,
  associated_token_account text,
  idempotency_key text not null unique,
  claimed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reward_claims_user_status_idx on reward_claims(user_id, status, created_at desc);

create table if not exists wallet_login_nonces (
  id text primary key,
  public_key text not null,
  nonce text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists wallet_login_nonces_lookup_idx on wallet_login_nonces(public_key, created_at desc);

create table if not exists moderation_flags (
  id text primary key,
  review_id text not null references reviews(id),
  flag_type text not null,
  severity text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists admin_audit_logs (
  id text primary key,
  actor_user_id text not null references users(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_target_idx on admin_audit_logs(target_type, target_id, created_at desc);
