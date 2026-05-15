# Anoqi — Roadmap

A single place to park future work — features that are implied or scoped but not yet built. Triage at the start of each sprint; keep this list living, not exhaustive.

---

## Physician portal

A separate surface where physicians can review and shape clinical pathway content.

**Format decision (2026-05-13):** PR-style review. AI/admin proposes pathway updates → physicians comment → a clinical_lead approves before changes go live. Rejected: wiki (no governance) and annotation overlay (no direct effect on AI behaviour).

**Backend status:** schema is live in Supabase as of 2026-05-14 (migration `003_physician_backend.sql` applied, plus `005_pathways_anon_read.sql` for the v0 read-only view). Tables: `physician_roles`, `clinical_pathways`, `pathway_change_proposals`, `proposal_comments`, `pathway_red_flags`, `source_library`, `source_validation_queue`, `clinical_audit_log`. 4 draft pathways seeded; 29 sources in `source_library`.

### v0 — Read-only portal (shipped 2026-05-14)

Lives at `physician-portal/` (Next.js 16 + Tailwind, same repo). No auth. Public read-only view of non-archived pathways via the `pathways_select_anon_read` RLS policy. Two pages: list (`/`) and detail (`/pathways/[id]`). Deployed as a separate Vercel project pointed at the same Supabase backend.

Scope chosen for v0: enough to demo the pathway content to design partners and clinicians without an auth detour, while the full PR-style workflow lands in v1.

### v1 — Auth + PR-style workflow (deferred)

Adds login, role-gated writes, and the full propose → review → approve loop.

**Pieces to build:**
1. **Auth** — Supabase Auth (magic-link recommended). Gate every page on an active `physician_roles` row. Seed Marion as `role='admin'` on first login.
2. **Propose pathway change** — form that creates a `pathway_change_proposals` row. Fields: target pathway (or blank for new), proposed content (JSON editor), `clinical_rationale`, `source_references` (multi-select from `source_library`).
3. **Review** — proposal list filtered by status. Detail view shows diff vs. base pathway. Physicians comment via `proposal_comments` (`comment` / `concern` / `approval` / `rejection`).
4. **Approve + deploy** — clinical_lead-only action. Approval inserts a new `clinical_pathways` row at `version_number + 1`, status `live`. Previous live row → `archived`. Writes to `clinical_audit_log`. This is the gated action; everyone else can propose and comment.
5. **Source validation queue** — physicians propose sources via `source_validation_queue`; clinical_lead scores and approves into `source_library`. Mirrors the pathway workflow.
6. **Red flags management** — CRUD for `pathway_red_flags` with `clinical_lead`/`admin` approval.

**RLS tightening on rollout:** the v0 `pathways_select_anon_read` policy may be kept (published pathways are arguably public content for transparency) or dropped (everything behind auth). Decide based on whether end-user pathways should be discoverable without login.

### Clinical governance angle (flag early)

Once physicians can edit pathway content that shapes AI behaviour for end users, Anoqi crosses into **medical-device territory** — CE marking under EU MDR for software-as-medical-device. Even a "decision-support" framing has regulatory implications in France. v1 should not ship publicly without a deliberate regulatory decision; v0 (read-only) is below this threshold because no editing happens through the app.

---

## Consent strategy (GDPR — three-tier)

**Decision (2026-05-13):** Consent is captured in layers based on what the user is doing. Do not collapse this into a single end-of-conversation gate — that's legally fragile, since health-data processing starts the moment the user types a symptom.

**Reasoning:**
- **GDPR Art. 6 + 9 (special category health data):** Consent must be "freely given, specific, informed, and unambiguous" *before* processing begins. End-of-conversation consent is too late — the data has already flowed.
- **Pseudonymisation softens but doesn't eliminate this.** Behavioural patterns + symptom data still constitute health data under GDPR, even with PII stripped. Edge function logs, audit table, and retained conversations all count as processing.
- **Medical-device framing:** Informed consent before use is an ethical baseline if Anoqi is positioned as decision-support, not just a legal requirement.

### Three tiers

1. **At sign-up / login → core consent.** The full statement:
   - "I understand Anoqi is not a doctor."
   - "My data is pseudonymised."
   - "Data is stored in the EU."
   - "I can request deletion at any time."
   - This is what the current `ConsentScreen` covers (in the onboarding flow). Keep it as the formal consent step for users who sign up.

2. **Anonymous-mode entry → lighter "I understand and agree" gate.** When a user takes the "Commencer la conversation →" shortcut on the Objective screen (or "Continue without an account" on the Account screen), they bypass the formal Consent screen. Before their first chat message reaches the API, a one-screen gate shows the core points in shorter form + a single "I understand and agree" button. Acceptance is persisted to AsyncStorage as `anoqi_chat_consent_accepted`. **Status: implemented 2026-05-13** in `ChatScreen.tsx`. The formal `ConsentScreen` sets the same flag, so signed-up users skip the lighter gate.

3. **End-of-conversation → optional opt-ins.** Use this for downstream consents that legitimately arise later:
   - Share the generated summary with a physician (via secure one-time link).
   - Contribute anonymised data to research.
   - Save the conversation to history (for signed-in users who want it).

   These are *additional* consents — not the consent to use Anoqi at all.

### CNIL alignment

This split matches French CNIL guidance on layered consent for sensitive data. It keeps Anoqi out of the "we collected health data without explicit consent" trap.

---

## Other features worth parking

Backlog of features that are either backend-ready-but-no-UI, or fully unbuilt but anticipated:

- **Document upload UI** — Backend exists (`api/functions/documents.ts`), no front-end screen yet. First candidate for the next sprint.
- **Conversation history / saved summaries screen** — Users need to retrieve past consultations and summaries from the app.
- **Sharing a summary with a physician via a one-time secure link** — Lighter alternative to a full physician portal. May satisfy the same use case for the v1 launch.
- **Emergency-flow UI** — When the SAMU 15 redirect fires, surface a one-tap call button (`tel:15`) so the user doesn't have to leave the app to act.
- **Export to PDF** — Print/save a summary for a physical consultation. Often more useful than digital sharing for older clinicians.
- **Multilingual expansion beyond fr/en** — Spanish, Portuguese, Arabic likely candidates depending on launch market.
- **Push notifications** — Follow-up appointment reminders, summary-ready notifications.
- **Apple HealthKit integration** — Cycle tracking, symptom logging from the system-level health data. iOS-first means this is unlocking value users already have.
- **Family planning / cycle prediction module** — Companion to the contraception journey. Significant scope; possibly its own sprint.
- **Voice input** — Hands-free symptom logging. Useful for users in pain, on the move, or with low literacy. Accessibility win.

---

## Reminders for triage

When promoting an item off this list:
- Confirm it doesn't trigger the medical-device / MDR threshold without a deliberate regulatory decision.
- Check it preserves the policy layer ([feedback-policy-layer-immutable](../../.claude/memory/feedback_policy_layer_immutable.md)) — no AI output bypasses `checkPolicy()`.
- Confirm the pseudonymisation pipeline still applies if new data leaves the device.
- Update this file when an item ships (move to a "Shipped" section or delete with a git note).

---

## Pending regulatory decision — RAG (added 2026-05-14)

The RAG retrieval layer (Phase 1 of the LLM quality plan) is **code-complete and DB-deployed** as of 2026-05-14:
- `scripts/migrations/006_rag_embeddings.sql` + `006a_rag_functions.sql` are live in Supabase.
- `api/lib/retrieval.ts` and `api/functions/chat.ts` integrate hybrid retrieval over `clinical_pathways` + `source_library` + `pathway_red_flags` with mandatory `[Sn]` citation.
- Citation parsing flags hallucinated source IDs as `policy_flags: hallucinated_citation`.

**Feature gate:** retrieval is OFF by default. To enable in any environment, set the Edge Function secret:

```
ANOQI_RAG_ENABLED=true
```

**Before flipping that flag in production:** RAG-grounded chat is closer to the EU-MDR / software-as-medical-device threshold than free conversation (the AI is now answering with reference to physician-approved content, not just trained-model knowledge). The PR-style governance for `clinical_pathways` and the validation queue for `source_library` are the necessary mitigation, but a deliberate regulatory decision is required before turning the flag on for end users. Decide and document here.

**Operational prerequisite:** the corpus must be populated. Run from a trusted environment:

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<from dashboard> \
GEMINI_API_KEY=<AI Studio> \
deno run --allow-env --allow-net api/jobs/embed_rag.ts
```

Re-run whenever a pathway transitions to/from `live` or a `source_library` row flips `is_active`. (A trigger-based auto-rebuild is on the Phase 2/3 roadmap.)
