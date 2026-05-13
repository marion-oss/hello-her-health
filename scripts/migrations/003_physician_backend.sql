-- anoqi Supabase Schema
-- Migration: 003_physician_backend.sql
-- Run AFTER 001_core_tables.sql AND 002_documents.sql
-- Physician portal: pathway management, source validation, clinical review queue
--
-- Section 5a adds the `source_library` master table (schema matches the
-- columns used in scripts/seed/dev_sources.sql). After this migration runs,
-- seed by executing scripts/seed/dev_sources.sql.
--
-- All `updated_at` triggers call `public.set_updated_at()` defined in 001.

create extension if not exists "uuid-ossp";

-- 1. PHYSICIAN ROLES
create table public.physician_roles (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            varchar(50) not null,
  speciality      varchar(100),
  full_name       varchar(255) not null,
  rpps_number     varchar(20),
  institution     varchar(255),
  is_active       boolean not null default true,
  invited_by      uuid references auth.users(id),
  invited_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint valid_role check (role in ('reviewer', 'clinical_lead', 'admin'))
);
alter table public.physician_roles enable row level security;
create policy "physician_roles_select_own" on public.physician_roles
  for select using (auth.uid() = user_id);

-- 2. CLINICAL PATHWAYS
create table public.clinical_pathways (
  id                uuid primary key default uuid_generate_v4(),
  pathway_key       varchar(100) not null,
  version           varchar(20) not null,
  version_number    integer not null default 1,
  status            varchar(20) not null default 'draft',
  title             text not null,
  description       text,
  content           jsonb not null,
  change_summary    text,
  regulatory_notes  text,
  created_by        uuid references auth.users(id),
  approved_by       uuid references auth.users(id),
  approved_at       timestamptz,
  deployed_at       timestamptz,
  deployed_by       uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint valid_status check (
    status in ('draft', 'in_review', 'approved', 'live', 'archived')
  )
);
alter table public.clinical_pathways enable row level security;
create policy "pathways_select_physicians" on public.clinical_pathways
  for select using (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true)
  );
create index idx_pathways_pathway_key on public.clinical_pathways(pathway_key);
create index idx_pathways_status on public.clinical_pathways(status);
create index idx_pathways_version_number on public.clinical_pathways(pathway_key, version_number desc);

-- 3. PATHWAY CHANGE PROPOSALS
create table public.pathway_change_proposals (
  id                  uuid primary key default uuid_generate_v4(),
  pathway_key         varchar(100) not null,
  base_pathway_id     uuid references public.clinical_pathways(id),
  proposed_content    jsonb not null,
  change_summary      text not null,
  clinical_rationale  text not null,
  source_references   text[],
  status              varchar(20) not null default 'open',
  proposed_by         uuid not null references auth.users(id),
  proposed_at         timestamptz not null default now(),
  reviewed_by         uuid references auth.users(id),
  reviewed_at         timestamptz,
  review_comment      text,
  approved_by         uuid references auth.users(id),
  approved_at         timestamptz,
  deployed_pathway_id uuid references public.clinical_pathways(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint valid_proposal_status check (
    status in ('open', 'in_review', 'approved', 'rejected', 'withdrawn')
  )
);
alter table public.pathway_change_proposals enable row level security;
create policy "proposals_select_physicians" on public.pathway_change_proposals
  for select using (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true)
  );
create policy "proposals_insert_reviewers" on public.pathway_change_proposals
  for insert with check (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true and role in ('reviewer', 'clinical_lead', 'admin'))
  );
create policy "proposals_update_own" on public.pathway_change_proposals
  for update using (auth.uid() = proposed_by and status = 'open');
create index idx_proposals_status on public.pathway_change_proposals(status);
create index idx_proposals_pathway_key on public.pathway_change_proposals(pathway_key);

-- 4. PROPOSAL COMMENTS
create table public.proposal_comments (
  id              uuid primary key default uuid_generate_v4(),
  proposal_id     uuid not null references public.pathway_change_proposals(id) on delete cascade,
  author_id       uuid not null references auth.users(id),
  content         text not null,
  comment_type    varchar(30) not null default 'comment',
  resolved        boolean default false,
  resolved_by     uuid references auth.users(id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint valid_comment_type check (
    comment_type in ('comment', 'concern', 'approval', 'rejection')
  )
);
alter table public.proposal_comments enable row level security;
create policy "comments_select_physicians" on public.proposal_comments
  for select using (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true)
  );
create policy "comments_insert_physicians" on public.proposal_comments
  for insert with check (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true)
  );
create policy "comments_update_own" on public.proposal_comments
  for update using (auth.uid() = author_id);
create index idx_comments_proposal_id on public.proposal_comments(proposal_id);

-- 5. PATHWAY RED FLAGS
create table public.pathway_red_flags (
  id                uuid primary key default uuid_generate_v4(),
  pathway_key       varchar(100) not null,
  trigger_text      text not null,
  escalation_type   varchar(50) not null,
  escalation_message text not null,
  clinical_basis    text,
  is_active         boolean not null default true,
  created_by        uuid references auth.users(id),
  approved_by       uuid references auth.users(id),
  approved_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint valid_escalation_type check (
    escalation_type in ('urgent_care', 'prompt_gp', 'gp_referral', 'specialist')
  )
);
alter table public.pathway_red_flags enable row level security;
create policy "red_flags_select_physicians" on public.pathway_red_flags
  for select using (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true)
  );

-- 5a. SOURCE LIBRARY (master list of validated clinical sources Anoqi cites)
-- Schema mirrors the columns used by scripts/seed/dev_sources.sql.
create table public.source_library (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  url               text,
  category          varchar(50),
  language          varchar(5),
  inclusion_score   smallint check (inclusion_score is null or inclusion_score between 1 and 10),
  publication_year  smallint,
  validated_by      text,
  validated_at      timestamptz,
  is_active         boolean not null default true,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.source_library enable row level security;
create policy "source_library_select_physicians" on public.source_library
  for select using (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true)
  );
create policy "source_library_insert_leads" on public.source_library
  for insert with check (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true and role in ('clinical_lead', 'admin'))
  );
create policy "source_library_update_leads" on public.source_library
  for update using (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true and role in ('clinical_lead', 'admin'))
  );
create index idx_source_library_category on public.source_library(category);
create index idx_source_library_active on public.source_library(is_active);

-- 6. SOURCE VALIDATION QUEUE
create table public.source_validation_queue (
  id                  uuid primary key default uuid_generate_v4(),
  url                 text not null,
  name                text not null,
  category            varchar(50),
  language            varchar(5),
  proposed_by         uuid references auth.users(id),
  proposed_at         timestamptz not null default now(),
  score_reputation    smallint,
  score_citations     smallint,
  score_recency       smallint,
  score_methodology   smallint,
  score_relevance     smallint,
  total_score         smallint generated always as (
    coalesce(score_reputation,0) +
    coalesce(score_citations,0) +
    coalesce(score_recency,0) +
    coalesce(score_methodology,0) +
    coalesce(score_relevance,0)
  ) stored,
  status              varchar(20) not null default 'pending',
  reviewed_by         uuid references auth.users(id),
  reviewed_at         timestamptz,
  review_notes        text,
  approved_source_id  uuid references public.source_library(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint valid_queue_status check (status in ('pending', 'approved', 'rejected')),
  constraint valid_scores check (
    (score_reputation between 1 and 5 or score_reputation is null) and
    (score_citations between 1 and 5 or score_citations is null) and
    (score_recency between 1 and 5 or score_recency is null) and
    (score_methodology between 1 and 5 or score_methodology is null) and
    (score_relevance between 1 and 5 or score_relevance is null)
  )
);
alter table public.source_validation_queue enable row level security;
create policy "source_queue_select_physicians" on public.source_validation_queue
  for select using (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true)
  );
create policy "source_queue_insert_physicians" on public.source_validation_queue
  for insert with check (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true)
  );
create policy "source_queue_update_clinical_leads" on public.source_validation_queue
  for update using (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true and role in ('clinical_lead', 'admin'))
  );
create index idx_source_queue_status on public.source_validation_queue(status);

-- 7. CLINICAL AUDIT LOG
create table public.clinical_audit_log (
  id              uuid primary key default uuid_generate_v4(),
  actor_id        uuid not null references auth.users(id),
  actor_name      text not null,
  actor_role      varchar(50) not null,
  action          varchar(100) not null,
  resource_type   varchar(50),
  resource_id     uuid,
  before_state    jsonb,
  after_state     jsonb,
  notes           text,
  created_at      timestamptz not null default now()
);
alter table public.clinical_audit_log enable row level security;
create policy "clinical_audit_select_leads" on public.clinical_audit_log
  for select using (
    exists (select 1 from public.physician_roles where user_id = auth.uid() and is_active = true and role in ('clinical_lead', 'admin'))
  );
create index idx_clinical_audit_actor on public.clinical_audit_log(actor_id);
create index idx_clinical_audit_action on public.clinical_audit_log(action);
create index idx_clinical_audit_created on public.clinical_audit_log(created_at desc);

-- 8. SEED: INITIAL PATHWAYS (draft — require clinical approval before going live)
insert into public.clinical_pathways (pathway_key, version, version_number, status, title, description, content, change_summary)
values
('symptoms','1.0',1,'draft','Comprendre mes symptômes','Guide la patiente à décrire ses symptômes et génère un résumé structuré pour son médecin.','{"opening_message":"Décris-moi ce que tu ressens. Par où tu veux commencer ?","max_questions":3,"questions":[],"red_flag_escalation":"Ce que tu décris nécessite une attention médicale rapide. Contacte le 15 (SAMU) ou rends-toi aux urgences.","completion_action":"generate_summary"}'::jsonb,'Initial version — awaiting clinical review'),
('contraception','1.0',1,'draft','Trouver une contraception qui me correspond','Évalue les options contraceptives selon le profil de la patiente, basé sur UKMEC 2025.','{"opening_message":"Pour trouver la contraception qui te correspond, j''ai besoin de comprendre ta situation. Est-ce que tu as des antécédents médicaux importants — migraines, tension artérielle, antécédents familiaux de thrombose ?","max_questions":3,"questions":[],"red_flag_escalation":"D''après ce que tu m''as dit, certaines contraceptions hormonales peuvent ne pas être adaptées. C''est important d''en parler avec ton médecin.","completion_action":"generate_summary","sources":["ukmec_2025","nhs_inform","mayo_clinic"]}'::jsonb,'Initial version — awaiting clinical review'),
('appointment_prep','1.0',1,'draft','Préparer mon prochain rendez-vous médical','Aide la patiente à structurer ses symptômes et questions avant une consultation.','{"opening_message":"Quel type de rendez-vous prépares-tu — généraliste, gynécologue, spécialiste ?","max_questions":3,"questions":[],"completion_action":"generate_summary"}'::jsonb,'Initial version — awaiting clinical review'),
('documents','1.0',1,'draft','Organiser mes documents et résultats','Classe et structure les documents médicaux uploadés par la patiente.','{"opening_message":"Envoie-moi tes documents — ordonnances, résultats d''analyses, comptes-rendus — et je les organise pour toi.","max_questions":1,"questions":[],"completion_action":"generate_summary"}'::jsonb,'Initial version — awaiting clinical review');

-- UPDATED_AT TRIGGERS — function set_updated_at() defined in 001_core_tables.sql
create trigger handle_physician_roles_updated_at before update on public.physician_roles for each row execute function public.set_updated_at();
create trigger handle_pathways_updated_at before update on public.clinical_pathways for each row execute function public.set_updated_at();
create trigger handle_proposals_updated_at before update on public.pathway_change_proposals for each row execute function public.set_updated_at();
create trigger handle_proposal_comments_updated_at before update on public.proposal_comments for each row execute function public.set_updated_at();
create trigger handle_red_flags_updated_at before update on public.pathway_red_flags for each row execute function public.set_updated_at();
create trigger handle_source_queue_updated_at before update on public.source_validation_queue for each row execute function public.set_updated_at();
create trigger handle_source_library_updated_at before update on public.source_library for each row execute function public.set_updated_at();
