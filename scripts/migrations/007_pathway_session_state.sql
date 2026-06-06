-- anoqi Supabase Schema
-- Migration: 007_pathway_session_state.sql
-- Run AFTER 004_chat_tables.sql
--
-- Adds per-conversation pathway runtime state for the patient-side pathway
-- engine (workers/be/src/pathways/*). All columns are nullable / defaulted and
-- additive — applying this migration changes no existing behaviour.
--
-- SAFE TO DEFER until you flip PATHWAY_RUNTIME_ENABLED=true on the API Worker.
-- While the flag is off, the pathway code path never runs and never reads
-- these columns. The runtime also degrades gracefully (falls back to open
-- chat) if the flag is on but these columns are missing — so there is no
-- hard ordering requirement, but you SHOULD apply this before flipping the
-- flag so state actually persists.

-- pathway_key       — the routed pathway for this conversation, or null for
--                     open chat. Locked for the session once routing runs.
-- pathway_routed    — true once routing has executed (even if it routed to no
--                     pathway). Stops re-classifying every turn.
-- pathway_phase     — current phase number (1-8) within the pathway; null when
--                     no pathway is active. PR A keeps this at 1 (no auto-advance).
-- pathway_symptoms  — declared symptoms the user has mentioned (jsonb array of
--                     SymptomKey strings). Drives differential awareness.
-- pathway_phase_answers — questionId -> true once covered (jsonb object).
-- pathway_tokens    — phaseNumber -> { prompt, completion } token usage, for
--                     future optimisation (PATHWAYS.md Decision 6 / Roadmap 2).

alter table public.conversations
  add column if not exists pathway_key           text,
  add column if not exists pathway_routed         boolean      not null default false,
  add column if not exists pathway_phase          smallint,
  add column if not exists pathway_symptoms       jsonb        not null default '[]'::jsonb,
  add column if not exists pathway_phase_answers  jsonb        not null default '{}'::jsonb,
  add column if not exists pathway_tokens         jsonb        not null default '{}'::jsonb;

-- Constrain pathway_key to the known pathway keys (or null). Matches the
-- PathwayKey union in workers/be/src/pathways/types.ts.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'conversations_valid_pathway_key'
  ) then
    alter table public.conversations
      add constraint conversations_valid_pathway_key
      check (pathway_key is null or pathway_key in (
        'contraception', 'endometriosis', 'menopause', 'pmos'
      ));
  end if;
end $$;

-- Partial index: lets the (future) physician portal / analytics list active
-- conversations by pathway without scanning open-chat rows.
create index if not exists idx_conversations_pathway_key
  on public.conversations(pathway_key)
  where pathway_key is not null;
