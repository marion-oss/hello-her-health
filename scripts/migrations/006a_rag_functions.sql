-- anoqi — RAG search functions
-- Migration: 006a_rag_functions.sql
-- Run AFTER 006_rag_embeddings.sql
--
-- Two RPC functions consumed by api/lib/retrieval.ts:
--   rag_vector_search — cosine similarity over rag_chunks.embedding
--   rag_fts_search    — BM25-style full-text search over rag_chunks.tsv
--
-- The TypeScript caller runs both in parallel and merges with Reciprocal
-- Rank Fusion (RRF). Doing the rankers as RPCs keeps vector operators
-- (which the Supabase JS query builder doesn't natively support) on the
-- server, where they belong.
--
-- Both functions are SECURITY DEFINER so they bypass RLS on rag_chunks
-- (which has RLS enabled with no policies). They are GRANTed only to
-- the service_role used by edge functions — anon and authenticated
-- cannot call them.

-- ─────────────────────────────────────────────────────────────
-- 1. VECTOR SEARCH (cosine similarity)
-- ─────────────────────────────────────────────────────────────
create or replace function public.rag_vector_search(
  p_query_embedding vector(768),
  p_language        varchar(5),
  p_pathway_key     text     default null,
  p_limit           integer  default 15
)
returns table (
  id              uuid,
  source_kind     text,
  source_ref      text,
  pathway_key     text,
  pathway_version varchar(20),
  language        varchar(5),
  content         text,
  metadata        jsonb,
  similarity      double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.source_kind,
    c.source_ref,
    c.pathway_key,
    c.pathway_version,
    c.language,
    c.content,
    c.metadata,
    (1 - (c.embedding <=> p_query_embedding))::double precision as similarity
  from public.rag_chunks c
  where c.language = p_language
    -- When p_pathway_key is set, include pathway-matched chunks AND
    -- source-library chunks (which have null pathway_key). This keeps
    -- generic sources available even for journey-scoped queries.
    and (p_pathway_key is null or c.pathway_key = p_pathway_key or c.pathway_key is null)
  order by c.embedding <=> p_query_embedding
  limit p_limit;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. FULL-TEXT SEARCH (BM25-ish via ts_rank_cd)
-- ─────────────────────────────────────────────────────────────
create or replace function public.rag_fts_search(
  p_query_text  text,
  p_language    varchar(5),
  p_pathway_key text     default null,
  p_limit       integer  default 15
)
returns table (
  id              uuid,
  source_kind     text,
  source_ref      text,
  pathway_key     text,
  pathway_version varchar(20),
  language        varchar(5),
  content         text,
  metadata        jsonb,
  rank            double precision
)
language sql
stable
security definer
set search_path = public
as $$
  -- 'simple' tsquery matches the 'simple' tsvector generated on
  -- rag_chunks.tsv. websearch_to_tsquery handles natural-language input
  -- (quotes, OR, etc.) without throwing on malformed queries.
  select
    c.id,
    c.source_kind,
    c.source_ref,
    c.pathway_key,
    c.pathway_version,
    c.language,
    c.content,
    c.metadata,
    ts_rank_cd(c.tsv, websearch_to_tsquery('simple', p_query_text))::double precision as rank
  from public.rag_chunks c
  where c.language = p_language
    and (p_pathway_key is null or c.pathway_key = p_pathway_key or c.pathway_key is null)
    and c.tsv @@ websearch_to_tsquery('simple', p_query_text)
  order by ts_rank_cd(c.tsv, websearch_to_tsquery('simple', p_query_text)) desc
  limit p_limit;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. PERMISSIONS
-- ─────────────────────────────────────────────────────────────
-- Edge functions use the service_role, which retains EXECUTE by default.
-- Explicitly revoke from anon and authenticated so a leaked anon key
-- cannot probe the corpus via these RPCs.
revoke all on function public.rag_vector_search(vector(768), varchar(5), text, integer) from public;
revoke all on function public.rag_vector_search(vector(768), varchar(5), text, integer) from anon;
revoke all on function public.rag_vector_search(vector(768), varchar(5), text, integer) from authenticated;

revoke all on function public.rag_fts_search(text, varchar(5), text, integer) from public;
revoke all on function public.rag_fts_search(text, varchar(5), text, integer) from anon;
revoke all on function public.rag_fts_search(text, varchar(5), text, integer) from authenticated;
