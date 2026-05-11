-- anoqi — Documents Table
-- Migration: 002_documents.sql
-- Run AFTER 001_core_tables.sql
--
-- Architecture: Documents stay on the user's device.
-- The app pseudonymises text locally before upload.
-- This table stores ONLY clean, de-identified data — never raw files,
-- never original filenames, never unstripped PII.
--
-- Research design: every column is chosen to support future analysis.
-- Nullable V2 columns (conditions, methodology) are defined now to
-- avoid schema migrations when the research pipeline is built.
--
-- ─────────────────────────────────────────────────────────────
-- DOCUMENT TYPES (matches classifyDocument in app/lib/pseudonymise.ts)
-- ─────────────────────────────────────────────────────────────
--   analyses        Blood tests, urine, stool, biopsies
--   imagerie        Radiology reports (MRI, ultrasound, X-ray)
--   comptes_rendus  Surgical / consultation reports
--   ordonnances     Prescriptions
--   vaccins         Vaccination records
--   antecedents     Medical history summaries
--   autre           Anything that does not fit the above
--
-- ─────────────────────────────────────────────────────────────
-- LAB VALUES JSON SCHEMA (lab_values column)
-- ─────────────────────────────────────────────────────────────
-- Array of objects:
-- [
--   {
--     "name": "Ferritine",              -- test name (raw, as written)
--     "value": 12,                       -- numeric result
--     "unit": "µg/L",                    -- unit string
--     "reference_range": "20–200",       -- lab's reference range (nullable)
--     "flag": "low"                      -- "low" | "high" | "critical" | null
--   }
-- ]
--
-- ─────────────────────────────────────────────────────────────
-- MEDICATIONS JSON SCHEMA (medications column)
-- ─────────────────────────────────────────────────────────────
-- Array of objects:
-- [
--   {
--     "name": "Lévothyrox",             -- INN or brand name
--     "dose": "50 µg",                  -- dose string (nullable)
--     "frequency": "1x/jour",           -- frequency string (nullable)
--     "duration": "3 mois",             -- duration string (nullable)
--     "class": "thyroid"                -- drug class (nullable, V2)
--   }
-- ]

-- ─────────────────────────────────────────────────────────────
-- TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (

  -- Primary key
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────
  -- Progressive sign-up: a document may be linked to an anonymous
  -- session_id (local UUID generated on first app launch) or to a
  -- registered user_id — or both once the user creates an account.
  user_id           uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id        uuid,       -- local device session, pre-signup

  -- ── Document metadata ─────────────────────────────────────
  document_type     text        NOT NULL
                    CHECK (document_type IN (
                      'analyses', 'imagerie', 'comptes_rendus',
                      'ordonnances', 'vaccins', 'antecedents', 'autre'
                    )),
  document_date     date,       -- date on the document itself (not upload date)

  -- ── Research dimensions ───────────────────────────────────
  -- Collected at sign-up; nullable for anonymous sessions.
  birth_year        smallint    CHECK (birth_year BETWEEN 1920 AND 2020),
  country           text,       -- ISO 3166-1 alpha-2 preferred (e.g. 'FR', 'GB')

  -- ── De-identified content ─────────────────────────────────
  clean_text        text        NOT NULL,   -- pseudonymised full text from device
  lab_values        jsonb,                  -- structured lab results (see schema above)
  medications       jsonb,                  -- structured medication list (see schema above)

  -- ── Consent ───────────────────────────────────────────────
  -- True only when user explicitly opted in on ConsentScreen.
  -- Documents with research_consent = false are used for the user's
  -- own summaries only and never included in research aggregations.
  research_consent  boolean     NOT NULL DEFAULT false,

  -- ── Audit ─────────────────────────────────────────────────
  pseudonymised_at  timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),

  -- GDPR retention — row deleted by scheduled job after this date.
  -- Default: 3 years. User can reduce via in-app data settings.
  retention_until   date        NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '3 years'),

  -- ── V2 — research pipeline (nullable, populated by future NLP) ──
  -- Define columns now to avoid future ALTER TABLE on a large table.
  conditions        jsonb,      -- ICD-11 codes + labels extracted by NLP
  methodology       text,       -- analysis method (e.g. 'NFS', 'bilan lipidique', 'TSH')

  -- ── Constraint ────────────────────────────────────────────
  CONSTRAINT documents_must_have_identity
    CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)

);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────

-- User lookup: all documents for a given user
CREATE INDEX IF NOT EXISTS documents_user_id_idx
  ON public.documents (user_id)
  WHERE user_id IS NOT NULL;

-- Session lookup: documents for an anonymous session (pre-signup)
CREATE INDEX IF NOT EXISTS documents_session_id_idx
  ON public.documents (session_id)
  WHERE session_id IS NOT NULL;

-- Research aggregation: filter by consent + type + demographics
-- Covers the most common research query pattern:
--   WHERE research_consent = true AND document_type = '...'
--   AND birth_year BETWEEN x AND y AND country = '...'
CREATE INDEX IF NOT EXISTS documents_research_idx
  ON public.documents (research_consent, document_type, birth_year, country)
  WHERE research_consent = true;

-- Document date: useful for longitudinal research queries
CREATE INDEX IF NOT EXISTS documents_document_date_idx
  ON public.documents (document_date)
  WHERE document_date IS NOT NULL;

-- GIN index on lab_values: allows querying by specific test name
-- e.g. WHERE lab_values @> '[{"name": "Ferritine"}]'
CREATE INDEX IF NOT EXISTS documents_lab_values_gin_idx
  ON public.documents USING GIN (lab_values)
  WHERE lab_values IS NOT NULL;

-- GIN index on medications: allows querying by drug name / class
CREATE INDEX IF NOT EXISTS documents_medications_gin_idx
  ON public.documents USING GIN (medications)
  WHERE medications IS NOT NULL;

-- Retention job: find rows due for deletion
CREATE INDEX IF NOT EXISTS documents_retention_until_idx
  ON public.documents (retention_until);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Registered users can read and delete their own documents
CREATE POLICY "documents: users read own"
  ON public.documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "documents: users delete own"
  ON public.documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Insert and update are done via service role (Edge Function) only.
-- No direct client INSERT to prevent consent flag tampering.

-- Service role bypasses RLS entirely (Supabase default behaviour).
-- The Edge Function is responsible for validating auth and consent.

-- ─────────────────────────────────────────────────────────────
-- SCHEDULED RETENTION CLEANUP
-- ─────────────────────────────────────────────────────────────
-- Run daily via pg_cron (Supabase Cron):
--
--   SELECT cron.schedule(
--     'anoqi-document-retention',
--     '0 3 * * *',  -- 03:00 UTC every day
--     $$
--       DELETE FROM public.documents
--       WHERE retention_until < CURRENT_DATE;
--     $$
--   );
--
-- Schedule this via Supabase Dashboard → Database → Cron jobs.

-- ─────────────────────────────────────────────────────────────
-- COMMENTS
-- ─────────────────────────────────────────────────────────────
COMMENT ON TABLE public.documents IS
  'De-identified medical document extracts. Original files stay on device. '
  'Only pseudonymised text and structured data are stored here. '
  'Research columns (lab_values, medications, conditions, methodology) '
  'support future aggregated analysis with research_consent = true rows only.';

COMMENT ON COLUMN public.documents.clean_text IS
  'Full pseudonymised text. PII stripped client-side before upload. '
  'Never contains names, dates of birth, address, or ID numbers.';

COMMENT ON COLUMN public.documents.lab_values IS
  'Structured lab results: [{name, value, unit, reference_range, flag}]. '
  'Parsed client-side from clean_text for analyses documents.';

COMMENT ON COLUMN public.documents.medications IS
  'Structured medication list: [{name, dose, frequency, duration, class}]. '
  'Parsed client-side from clean_text for ordonnances documents.';

COMMENT ON COLUMN public.documents.research_consent IS
  'User explicitly opted into research on ConsentScreen. '
  'Only rows with research_consent = true are included in aggregations. '
  'Default false — never assumed.';

COMMENT ON COLUMN public.documents.conditions IS
  'V2 — ICD-11 codes extracted by research NLP pipeline. Null at MVP.';

COMMENT ON COLUMN public.documents.methodology IS
  'V2 — Analysis methodology label (e.g. NFS, bilan lipidique, HbA1c). '
  'Null at MVP, populated by future classification model.';

-- ─────────────────────────────────────────────────────────────
-- VERIFY
-- ─────────────────────────────────────────────────────────────
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'documents'
ORDER BY ordinal_position;
