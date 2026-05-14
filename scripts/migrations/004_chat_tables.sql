-- anoqi — Chat Tables
-- Migration: 004_chat_tables.sql
-- Run AFTER 001_core_tables.sql
--
-- Schemas inferred from api/functions/chat.ts and api/functions/summaries.ts.
-- These are the tables the chat + summary edge functions read and write.
-- Without this migration, signed-in users get "relation does not exist"
-- errors on every chat send.
--
-- Tables:
--   conversations  — chat sessions (user or anonymous-session keyed)
--   messages       — turn-by-turn message history (user / assistant roles)
--   summaries      — physician-ready structured summaries (one per conv)
--   symptoms       — structured symptoms extracted by summary pipeline
--   audit_logs     — user-facing audit trail
--                    (distinct from `clinical_audit_log` in 003 which logs
--                    physician/clinical-lead actions on pathway content)

-- ─────────────────────────────────────────────────────────────
-- 1. CONVERSATIONS
-- ─────────────────────────────────────────────────────────────
create table public.conversations (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete cascade,
  session_id    uuid,
  journey_type  text        not null default 'free_chat'
                            check (journey_type in (
                              'free_chat', 'symptoms', 'contraception',
                              'menopause', 'fertility', 'appointment_prep',
                              'documents'
                            )),
  status        text        not null default 'active'
                            check (status in ('active', 'completed', 'archived')),
  title         text,
  summary_id    uuid,                       -- FK constraint added after summaries table below
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- chat.ts enforces this at the app layer; mirror as a DB constraint.
  constraint conversations_must_have_identity check (user_id is not null or session_id is not null)
);

create index idx_conversations_user_id    on public.conversations(user_id) where user_id is not null;
create index idx_conversations_session_id on public.conversations(session_id) where session_id is not null;
create index idx_conversations_status     on public.conversations(status);

alter table public.conversations enable row level security;
create policy "conversations_select_own" on public.conversations
  for select using (auth.uid() = user_id);
-- INSERT / UPDATE are done via service_role from edge functions only,
-- so we deliberately do not add public INSERT/UPDATE policies.

create trigger handle_conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. MESSAGES
-- ─────────────────────────────────────────────────────────────
create table public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  user_id         uuid        references auth.users(id) on delete set null,
  role            text        not null check (role in ('user', 'assistant')),
  content         text        not null,
  sources         jsonb       not null default '[]'::jsonb,
  policy_flags    jsonb       not null default '[]'::jsonb,
  tokens_used     integer,
  model_used      text,
  created_at      timestamptz not null default now()
);

create index idx_messages_conversation_id on public.messages(conversation_id);
create index idx_messages_created_at      on public.messages(created_at);

alter table public.messages enable row level security;
create policy "messages_select_own" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );
-- INSERT done via service_role only.

-- ─────────────────────────────────────────────────────────────
-- 3. SUMMARIES (physician-ready structured output)
-- ─────────────────────────────────────────────────────────────
create table public.summaries (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  journey_type    text,
  title           text,
  content_json    jsonb       not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- summaries.ts checks for an existing summary on the (conversation, user)
  -- pair before generating — enforce uniqueness at the DB level too.
  unique (conversation_id, user_id)
);

create index idx_summaries_user_id         on public.summaries(user_id);
create index idx_summaries_conversation_id on public.summaries(conversation_id);

alter table public.summaries enable row level security;
create policy "summaries_select_own" on public.summaries
  for select using (auth.uid() = user_id);
create policy "summaries_delete_own" on public.summaries
  for delete using (auth.uid() = user_id);

create trigger handle_summaries_updated_at before update on public.summaries
  for each row execute function public.set_updated_at();

-- Now add the cross-table FK from conversations.summary_id → summaries.id.
-- Defined after the summaries table exists so the reference resolves.
alter table public.conversations
  add constraint conversations_summary_id_fkey
  foreign key (summary_id) references public.summaries(id) on delete set null;

-- ─────────────────────────────────────────────────────────────
-- 4. SYMPTOMS (extracted by the summary pipeline into structured rows)
-- ─────────────────────────────────────────────────────────────
create table public.symptoms (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  conversation_id uuid        references public.conversations(id) on delete cascade,
  name            text        not null,
  duration        text,
  frequency       text,
  intensity       text        check (intensity is null or intensity in (
                                'légère', 'modérée', 'importante',
                                'mild', 'moderate', 'severe'
                              )),
  triggers        jsonb       not null default '[]'::jsonb,
  evolution       text        check (evolution is null or evolution in (
                                'stable', 'aggravation', 'amélioration',
                                'worsening', 'improving'
                              )),
  daily_impact    text,
  confirmed       boolean     not null default false,
  created_at      timestamptz not null default now()
);

create index idx_symptoms_user_id         on public.symptoms(user_id);
create index idx_symptoms_conversation_id on public.symptoms(conversation_id);

alter table public.symptoms enable row level security;
create policy "symptoms_select_own" on public.symptoms
  for select using (auth.uid() = user_id);
create policy "symptoms_update_own" on public.symptoms
  for update using (auth.uid() = user_id);
create policy "symptoms_delete_own" on public.symptoms
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 5. AUDIT_LOGS (user-facing action log; GDPR right of access)
-- Distinct from clinical_audit_log (003) which is for physician actions.
-- ─────────────────────────────────────────────────────────────
create table public.audit_logs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  actor_id    uuid        references auth.users(id) on delete set null,
  action      text        not null,
  resource    text,
  resource_id uuid,
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index idx_audit_logs_user_id    on public.audit_logs(user_id);
create index idx_audit_logs_action     on public.audit_logs(action);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;
create policy "audit_logs_select_own" on public.audit_logs
  for select using (auth.uid() = user_id);
-- INSERT done via service_role only.
