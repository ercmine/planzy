-- Foundational identity, roles, profiles, and memberships schema for Perbug.
-- This migration is intentionally additive and non-destructive to preserve existing userId-linked content.

-- Core user identity
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  phone TEXT,
  auth_provider TEXT,
  auth_provider_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  moderation_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_profile_type TEXT NOT NULL DEFAULT 'PERSONAL',
  active_profile_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System roles
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role)
);

-- Personal profile: exactly one per user
CREATE TABLE IF NOT EXISTS personal_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  username TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  visibility TEXT NOT NULL DEFAULT 'PUBLIC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creator profile: at most one per user
CREATE TABLE IF NOT EXISTS creator_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  creator_name TEXT NOT NULL,
  handle TEXT,
  bio TEXT,
  category TEXT,
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  avatar_url TEXT,
  banner_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  visibility TEXT NOT NULL DEFAULT 'PUBLIC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business profile and team-based membership
CREATE TABLE IF NOT EXISTS business_profiles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  address TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  visibility TEXT NOT NULL DEFAULT 'PUBLIC',
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  updated_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_memberships (
  id TEXT PRIMARY KEY,
  business_profile_id TEXT NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  invited_by_user_id TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_profile_id, user_id)
);

-- Compatibility/backfill notes:
-- 1) Existing authenticated users should be inserted into users.
-- 2) A personal_profiles row should be created for every users row.
-- 3) Existing content that references userId remains valid; new content can also store acting profile type/id.
