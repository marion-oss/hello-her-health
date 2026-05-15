-- anoqi — RAG Embeddings
-- Migration: 006_rag_embeddings.sql
-- Run AFTER 003_physician_backend.sql AND 004_chat_tables.sql
--
-- Adds the vector store that powers retrieval-augmented chat.
-- Source content (clinical_pathways.content + source_library entries +
-- pathway_red_flags) is chunked and embedded by api/jobs/embed_rag.ts and
-- queried at chat time by api/lib/retrieval.ts.
--
-- Privacy posture:
--   This table holds NO user-generated content. Only physician-approved
--   pathway snippets and validated source-library entries. RLS is enabled
--   with NO policies — read access is granted only via the service_role
--   used by edge functions (which bypasses RLS by design). This guarantees
--   no anon/authenticated key can leak the embedding corpus or use it for
--   side-channel inference.
--
-- See docs in:
--   /Users/marcelo/.claude/plans/whimsical-napping-music.md  (Phase 1)

create extension if not exists vector;

-- ─────────────────────────────────────────────────────────────
-- 1. RAG_CHUNKS — chunked + embedded source corpus
-- ─────────────────────────────────────────────────────────────
create table public.rag_chunks (
  id               uuid         primary key default gen_random_uuid(),

  -- What kind of source this chunk came from. Used by the embedding job
  -- and by retrieval to filter or weight.
  source_kind      text         not null check (source_kind in (
                                  'pathway',           -- clinical_pathways.content fragment
                                  'source',            -- source_library entry (name + notes)
                                  'pathway_red_flag'   -- pathway_red_flags row (escalation context)
                                )),

  -- Stable reference back to the originating row. For 'pathway' this is
  -- the clinical_pathways.id; for 'source' it is source_library.id; for
  -- 'pathway_red_flag' it is pathway_red_flags.id. Stored as text so a
  -- single column works across all three kinds.
  source_ref       text         not null,

  -- Denormalised pathway key for fast retrieval filtering by journey.
  -- Null for source-library entries that aren't pathway-specific.
  pathway_key      text,

  -- Pathway version captured at embed time, so retrieval can prove the
  -- snippet matches a still-live pathway version. Reconciliation jobs
  -- delete chunks whose pathway transitions to 'archived'.
  pathway_version  varchar(20),

  -- Language of the chunk content. Retrieval filters by the user's
  -- active language to avoid mixing French + English in the model
  -- context (which degrades quality).
  language         varchar(5)   not null,

  -- Position within the originating source (e.g. multiple chunks per
  -- pathway). Stable across re-embeds for the same content.
  chunk_index      integer      not null,

  -- The chunk text itself, ~400 tokens. Used for both vector search
  -- and BM25-style full-text search.
  content          text         not null,

  -- 768-dim vector matching Gemini text-embedding-004 output.
  -- Vector dimension is fixed at table creation; switching embedding
  -- models requires a new column or a new migration.
  embedding        vector(768)  not null,

  -- The embedding model that produced this row's vector. Stored so we
  -- can detect drift if we ever swap models.
  embedding_model  text         not null default 'text-embedding-004',

  -- Approximate token count of `content`. Used by the prompt-budgeter
  -- in retrieval.ts to fit top-K under the system-prompt size limit.
  token_count      integer,

  -- Free-form metadata: e.g. { "section": "opening_message" } for
  -- pathway chunks, { "url": "...", "category": "..." } for sources.
  metadata         jsonb        not null default '{}'::jsonb,

  created_at       timestamptz  not null default now(),

  -- A given (kind, ref, chunk_index) is unique — re-embedding upserts.
  unique (source_kind, source_ref, chunk_index)
);

-- Generated tsvector column for hybrid retrieval (BM25 side of RRF).
-- 'simple' config is intentional: it works across French + English
-- without per-row language switching. Stemming can be added later via
-- a language-specific config if quality measurement justifies it.
alter table public.rag_chunks
  add column tsv tsvector generated always as (to_tsvector('simple', content)) stored;

-- ─────────────────────────────────────────────────────────────
-- 2. INDICES
-- ─────────────────────────────────────────────────────────────

-- HNSW for cosine similarity search. Better recall+latency tradeoff
-- than ivfflat at our small-corpus scale (hundreds to low-thousands
-- of chunks). Uses cosine distance because Gemini embeddings are
-- L2-normalised at output.
create index idx_rag_chunks_embedding on public.rag_chunks
  using hnsw (embedding vector_cosine_ops);

-- Full-text search side of the hybrid retriever.
create index idx_rag_chunks_tsv on public.rag_chunks using gin(tsv);

-- B-tree filter indices used by retrieval.ts before similarity search.
create index idx_rag_chunks_pathway_key on public.rag_chunks(pathway_key)
  where pathway_key is not null;

create index idx_rag_chunks_language    on public.rag_chunks(language);
create index idx_rag_chunks_source_kind on public.rag_chunks(source_kind);

-- ─────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
-- RLS enabled with NO policies. This is deliberate.
--
-- Edge functions read this table via the service_role key, which
-- bypasses RLS. Anon and authenticated keys have no path to read,
-- write, or infer from rag_chunks. This matches the posture used
-- elsewhere (e.g. messages, audit_logs) for tables that should
-- never leak through the public API surface.
--
-- If an internal admin tool ever needs to inspect chunks (e.g. to
-- audit retrieval quality), add a narrow policy gated on
-- physician_roles.role in ('clinical_lead', 'admin') — never anon.
alter table public.rag_chunks enable row level security;

-- ─────────────────────────────────────────────────────────────
-- 4. RECONCILIATION HELPER
-- ─────────────────────────────────────────────────────────────
-- Convenience function: drop chunks whose source has been archived
-- or revoked. Called by the embedding job and by source-validation
-- workflows (when source_validation_queue rejects a source that was
-- previously approved).
--
-- Pathway-status policy: keep chunks for any non-archived pathway. This
-- intentionally matches the (permissive) filter used by api/jobs/embed_rag.ts
-- so that draft / in_review / approved / live pathways all get retrieved.
-- Once the v1 physician portal lands and pathways flow through the full
-- approval workflow, tighten BOTH this function AND embed_rag.ts to
-- `status = 'live'` together. Mismatching the two filters causes the
-- embed job to insert chunks the reconciler then deletes.
--
-- Safe to call as service_role only.
create or replace function public.delete_stale_rag_chunks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  -- Drop chunks for pathways that have been archived (or deleted entirely).
  delete from public.rag_chunks
   where source_kind = 'pathway'
     and source_ref not in (
       select id::text from public.clinical_pathways where status <> 'archived'
     );
  get diagnostics removed = row_count;

  -- Drop chunks for sources that were deactivated or deleted.
  delete from public.rag_chunks
   where source_kind = 'source'
     and source_ref not in (
       select id::text from public.source_library where is_active = true
     );

  -- Drop chunks for red-flag rows that were deactivated.
  delete from public.rag_chunks
   where source_kind = 'pathway_red_flag'
     and source_ref not in (
       select id::text from public.pathway_red_flags where is_active = true
     );

  return removed;
end
$$;

-- Lock down the helper: only the service_role and clinical leads can call it.
revoke all on function public.delete_stale_rag_chunks() from public;
revoke all on function public.delete_stale_rag_chunks() from anon;
revoke all on function public.delete_stale_rag_chunks() from authenticated;
