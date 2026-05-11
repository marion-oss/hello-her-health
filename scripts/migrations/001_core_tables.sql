-- anoqi — Core Tables
-- Migration: 001_core_tables.sql
-- Run BEFORE 002_documents.sql
--
-- Creates the user profile and anonymous session tables.
-- Supabase manages auth.users automatically; we extend it with a
-- public profiles table (1-to-1) for app-level metadata.
--
-- Privacy-by-design:
--   • birth_year stored as integer, never full DOB
--   • country as free text (user-entered), never IP-derived
--   • language + health_objective from onboarding, deletable by user
--   • anonymous sessions are self-contained and claimable later
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- 1. HEALTH OBJECTIVE ENUM
-- ─────────────────────────────────────────────────────────────

CREATE TYPE health_objective AS ENUM (
  'symptoms',       -- Understanding my symptoms
  'contraception',  -- Contraception guidance
  'menopause',      -- Menopause support
  'fertility',      -- Fertility questions
  'general'         -- General women's health
);

-- ─────────────────────────────────────────────────────────────
-- 2. USER PROFILES
-- Extended metadata for authenticated users (1-to-1 with auth.users)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language      TEXT        NOT NULL DEFAULT 'fr'
                              CHECK (language IN ('fr', 'en')),
  objective     health_objective,
  birth_year    SMALLINT    CHECK (birth_year >= 1920 AND birth_year <= EXTRACT(YEAR FROM NOW()) - 16),
  country       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    language,
    objective,
    birth_year,
    country
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'language', 'fr'),
    (NEW.raw_user_meta_data->>'objective')::health_objective,
    (NEW.raw_user_meta_data->>'birth_year')::SMALLINT,
    NEW.raw_user_meta_data->>'country'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. ANONYMOUS SESSIONS
-- UUID-keyed sessions for users who skip account creation.
-- Claimable via /auth/claim endpoint when user later signs up.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.anonymous_sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  language     TEXT        NOT NULL DEFAULT 'fr'
                             CHECK (language IN ('fr', 'en')),
  objective    health_objective,
  claimed_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Auto-expire unclaimed sessions after 90 days (enforced by cron, see below)
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days'
);

-- Index for claim lookup
CREATE INDEX idx_anon_sessions_claimed_by ON public.anonymous_sessions(claimed_by);
CREATE INDEX idx_anon_sessions_expires_at ON public.anonymous_sessions(expires_at);

-- ─────────────────────────────────────────────────────────────
-- 4. ROW-LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- profiles: only the owner can read/update their own row
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- anonymous_sessions: no direct RLS (server-side only via service_role)
ALTER TABLE public.anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; app accesses via edge function, not direct client
-- (no public policies intentionally)

-- ─────────────────────────────────────────────────────────────
-- 5. GDPR — DATA DELETION
-- When a user deletes their account, cascade removes profile
-- (the ON DELETE CASCADE on profiles.id handles this).
-- Anonymous sessions are expired separately.
-- ─────────────────────────────────────────────────────────────

-- Scheduled cleanup of expired anonymous sessions (run daily via pg_cron)
-- Requires pg_cron extension enabled in Supabase dashboard:
--   SELECT cron.schedule(
--     'expire-anon-sessions',
--     '0 3 * * *',
--     $$ DELETE FROM public.anonymous_sessions
--        WHERE claimed_by IS NULL AND expires_at < NOW() $$
--   );
