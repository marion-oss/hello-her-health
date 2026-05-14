-- anoqi Supabase Schema
-- Migration: 005_pathways_anon_read.sql
-- Run AFTER 003_physician_backend.sql
--
-- Adds an anonymous-read policy on clinical_pathways so the read-only
-- physician portal (physician-portal/) can list and display pathways
-- without requiring a login. Additive policy — does not weaken the
-- existing pathways_select_physicians policy (which still grants
-- authenticated physicians access to archived rows too).
--
-- Scope: anon can read pathways whose status is NOT 'archived'.
-- Archived rows are version history kept for audit; not for display.
--
-- When the v1 portal lands with auth + PR-style workflow, this policy
-- can stay (the public can still browse current pathways) or be tightened
-- depending on whether published pathways are considered public content.
-- See ROADMAP.md → Physician portal v1.

create policy "pathways_select_anon_read" on public.clinical_pathways
  for select
  to anon
  using (status <> 'archived');
