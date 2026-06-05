# Anoqi — Pathway Architecture

**Status:** Design v1 (2026-06-05) — approved for MVP implementation
**Source of truth for clinical content:** `Anoqi_LLM_Product_Guidelines_V2.md` (Dr Giada Frontino, May 2026)
**Implements:** Parts 1, 2, 3, 6 of the LLM Guidelines V2

---

## Purpose

This document defines how the Anoqi AI moves from a single open-ended chat to a system that recognises **clinical pathways** (contraception, endometriosis, menopause, PMOS, …) and constrains its recommendations to validated clinical logic *for the pathway the user is in*, while staying open and helpful for everything outside any defined pathway.

The architecture is designed to be **agnostic to how many pathways exist** at any given time. Today only the contraceptive pathway is fully specified (V2 §6.1). Tomorrow, when endometriosis or PMOS modules land, the system gains differential-awareness behaviour automatically through declarations — no architectural rewrite.

---

## Core principle (from Marion, 2026-06-01)

> "The chat is not only for pathways. The user needs to be able to ask questions about whatever is on her mind. If the symptoms link to a disease or question for which we have a pathway, the AI needs to ensure any recommendations fit the pathway."

Translation:

- **Open chat is the default.** Any question is engaged with. Refusals (or 429-as-refusal) on off-pathway topics are bugs.
- **Pathways gate *recommendations*, not topics.** If the user's topic matches a defined pathway, the AI must ground its recommendations in that pathway's clinical logic. Outside any defined pathway, the AI provides general evidence-based information + signposts to clinical conversation, but does not recommend specific clinical actions.
- **Hard constraints (V2 §1.4) apply universally** — across all pathways and outside them. These live in `policyChecker.ts`, not in any individual pathway.

---

## Goals + non-goals

### Goals

1. Encode V2 §6.1 (Contraceptive Pathway) as **structured data**, so clinical edits don't require code changes.
2. Generalise the structure so future pathways (endo, menopause, PMOS) drop in as new files.
3. Build the runtime to support **differential awareness** between pathways from day one, even though only one pathway exists today.
4. Preserve the "chat is open" principle — the runtime never blocks off-pathway questions.

### Non-goals (for this design)

1. Not implementing the full 8-phase contraceptive flow in the first PR. **Phase 1 only** for the MVP — proves the architecture; subsequent PRs fill phases 2-8 individually.
2. Not implementing cross-session pathway persistence (per-user pathway memory). Each new conversation resets.
3. Not implementing implicit caching, context caching, or other Vertex-side optimisations. Out of scope.
4. Not migrating the Supabase Edge twin. CF Worker first; Edge follows once stable.

---

## Decisions made during the brainstorm (2026-06-05)

| Layer | Decision | Why |
| --- | --- | --- |
| **1. Routing** | Hybrid: onboarding `objective` is the default pathway hint. The opening user message also runs through a lightweight classifier (per V2 §2.1 "What brings you here today?"). The pathway is **locked for the session** once confirmed. | Matches V2 §2.1's conversational intent. One classifier call per session, not per message. Avoids drift mid-conversation while keeping the experience natural. |
| **2. State scope** | Per-conversation. New conversation = fresh route. | Simplest. Current architecture already uses `conversationId` as the boundary. User-profile persistence is an enhancement, not foundation. |
| **3. Content** | Pathways are declarative data files. Clinical team owns the strings; engineering owns the structure. | Lets clinical edits ship without code review. Each pathway file is reviewable in isolation by the SAB. |
| **4. Multi-pathway** | **Differential-aware single-pathway runtime.** At any moment, one primary pathway is active. The runtime detects when symptoms the user has mentioned are shared with other pathways' declarations, and weaves in awareness behaviour from the primary pathway's `differentialAwareness` block — without switching. | Reflects clinical reality: a woman asking for contraception due to period pain doesn't have "two separate problems queued"; she has one presenting complaint with a differential. The V2 doc's "sequential" model is the trivial case where pathways don't share symptoms. |
| **5. Open chat** | The default when no pathway routes is a **general health-companion mode**. No refusals. The AI provides evidence-based general info + signposts. Hard constraints (V2 §1.4) still apply. | Marion's principle, encoded. The contrast: pathway = recommendations grounded in clinical logic; no pathway = no clinical recommendations, just information + preparation. |

---

## Architecture — the three primitives

### 1. `PathwayModule` (declarative data)

A pathway is a value, not a class. One file per `(pathwayKey, language)`. Lives under `workers/be/src/pathways/` (and mirrored on the Supabase Edge side in a later PR).

```ts
type PathwayKey = 'contraception' | 'endometriosis' | 'menopause' | 'pmos'
type Language   = 'fr' | 'en'
type SymptomKey = string   // e.g. 'period_pain', 'irregular_bleeding', 'mood_low'

interface PathwayModule {
  key:              PathwayKey
  language:         Language
  version:          string                 // e.g. 'v1-2026-06-05', bumped on SAB review

  /** Free-text keywords / phrases the routing classifier looks for. */
  entrySignals:     string[]

  /**
   * Symptoms this pathway addresses. The union of every pathway's
   * declaredSymptoms forms the SymptomRegistry. The intersection between
   * any two pathways' lists is where differential awareness activates.
   */
  declaredSymptoms: SymptomKey[]

  /** The 8-phase architecture from V2 §6.1. Phase ordering is array order. */
  phases:           PhaseDefinition[]

  /** Pathway-specific reference data. Optional — only some pathways have these. */
  methodTable?:           MethodEntry[]        // contraception
  ukmecGates?:            UkmecGate[]          // contraception
  hrtOptions?:            HrtOption[]          // menopause (future)
  diagnosticCriteria?:    DiagnosticCriteria   // endo, PMOS (future)

  /** V2 §6.1 Phase 6 — mandatory myth corrections. */
  mythCorrections:        MythCorrection[]

  /**
   * Cross-pathway awareness. Keyed by SymptomKey. When the runtime
   * detects that a user-mentioned symptom is also declared by another
   * pathway, it looks up `differentialAwareness[symptom]` to know what
   * THIS pathway should say about it. Empty when no other pathway
   * declares overlap, populated when one does.
   */
  differentialAwareness:  Record<SymptomKey, DifferentialMention>

  /** V2 §6.1 Phase 7. */
  consultationPrepTemplate: ConsultationPrepTemplate
}

interface PhaseDefinition {
  number:  1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  title:   string                          // 'Goals and Context', 'Medical History', …
  purpose: string                          // human-readable, for the doc
  questions: PhaseQuestion[]
  enrichmentHooks?: EnrichmentHook[]       // see Runtime section
}

interface PhaseQuestion {
  id:                 string                  // 'goals.starting_or_switching'
  prompt:             string                  // the actual question the AI asks
  required:           boolean
  symptomsRecorded?:  SymptomKey[]            // which symptoms a positive answer flags
  branchLogic?:       string                  // free-text description; engine doesn't
                                              // interpret, it's for documentation
  validation?:        QuestionValidation      // e.g. 'BMI > 35 with CV risk = UKMEC 3'
}

interface DifferentialMention {
  /**
   * What THIS pathway says when a shared symptom hints at the other.
   * Written in second-person, woven into the relevant phase.
   * Example (in contraception.fr, key='period_pain'):
   *   "Les douleurs des règles peuvent avoir plusieurs origines. Aujourd'hui
   *    nous nous concentrons sur la contraception, mais si tu remarques
   *    [endo-specific symptoms], cela vaut la peine d'en parler à ton médecin."
   */
  text:      string
  /** Which other pathway this mention bridges to. Used for logging + audit. */
  otherKey:  PathwayKey
}
```

The full V2 §6.1 spec maps onto this structure. Engineering owns the **types**; clinical owns the **strings**. A clinical edit (e.g. updating a myth correction with a new study) is a one-line PR in a data file.

### 2. `SymptomRegistry` (derived, not authored)

Built once at module-load time by walking every `PathwayModule.declaredSymptoms`:

```ts
type SymptomRegistry = Record<SymptomKey, PathwayKey[]>

// At load time:
function buildSymptomRegistry(modules: PathwayModule[]): SymptomRegistry {
  const reg: SymptomRegistry = {}
  for (const m of modules) {
    for (const sym of m.declaredSymptoms) {
      if (!reg[sym]) reg[sym] = []
      if (!reg[sym].includes(m.key)) reg[sym].push(m.key)
    }
  }
  return reg
}
```

Nobody writes this map directly. **It emerges from declarations.** The moment a new pathway file is added, the registry updates on next load and differential awareness becomes available — no other code changes needed.

### 3. `PathwayRuntime` (the engine)

Walks the active pathway's phases. At each phase, it asks two questions of the registry:

1. *Has the user mentioned any symptom this pathway declared?* — if yes, record it on the session.
2. *Are any of those symptoms ALSO declared by another pathway?* — if yes, look up the primary pathway's `differentialAwareness[symptom]` block and inject the text into the current phase's response.

```ts
function runPhase(
  phase:    PhaseDefinition,
  pathway:  PathwayModule,
  registry: SymptomRegistry,
  session:  SessionState,
): PhaseOutput {
  const userSymptoms = session.symptomsMentioned       // populated from prior turns
  const differentialText: string[] = []

  for (const sym of userSymptoms) {
    const declaringPathways = registry[sym] ?? []
    const otherPathways = declaringPathways.filter(k => k !== pathway.key)
    if (otherPathways.length === 0) continue

    const awareness = pathway.differentialAwareness[sym]
    if (awareness) differentialText.push(awareness.text)
  }

  return {
    questionsToAsk:      phase.questions.filter(q => /* not yet answered */),
    differentialMentions: differentialText,
    /* assembled prompt block for the LLM call */
  }
}
```

**Today, with only contraception loaded, `otherPathways` is always empty** — the engine runs a vanilla one-pathway flow. **Tomorrow, when endometriosis loads**, the same code starts surfacing differential text automatically, with zero engine changes.

---

## How a turn flows end-to-end

```
                                                user types a message in ChatScreen
                                                                │
                                                                ▼
                                            POST /chat  (CF Worker handlers/chat.ts)
                                                                │
                  ┌─────────────────────────────────────────────┴────────────────────────────────┐
                  │                                                                              │
                  ▼                                                                              ▼
       1. ROUTING                                                                  4. OPEN-CHAT (no pathway)
       ─────────                                                                  ────────────────────────
       First message of conversation?                                              General system prompt
        ├─ yes → classify intent against entrySignals across all PathwayModules    + hard constraints (V2 §1.4)
        │       + use OnboardingContext.objective as default tiebreaker            + sourced general health info
        │       → set session.pathwayKey                                           + signposting
        └─ no  → reuse session.pathwayKey                                          → response to user
                                              │
                                              ▼
                              2. SESSION STATE (per-conversation)
                              ─────────────────────────────────
                              session = {
                                conversationId,
                                pathwayKey: 'contraception' | null,
                                currentPhase: 1,
                                symptomsMentioned: Set<SymptomKey>,
                                phaseAnswers: Record<questionId, value>,
                              }
                                              │
                                              ▼
                              3. PATHWAYRUNTIME (if pathwayKey set)
                              ────────────────────────────────────
                              const phase = pathway.phases[session.currentPhase - 1]
                              const out   = runPhase(phase, pathway, registry, session)
                                              │
                                              ▼
                              Build the system prompt for this turn:
                              ─────────────────────────────────────
                              [BASE PERSONA — V2 §1.1, §1.2, §1.3]                              ← static
                              [HARD CONSTRAINTS — V2 §1.4]                                      ← static
                              [PATHWAY CONTEXT — pathway.key, currentPhase, phase.purpose]      ← per-pathway
                              [CURRENT PHASE QUESTIONS — out.questionsToAsk]                    ← per-phase
                              [DIFFERENTIAL MENTIONS — out.differentialMentions]                ← per-symptom
                              [USER DOCS BLOCK — from upload]                                   ← per-user
                              [RAG SNIPPETS — from retrieval]                                   ← per-query
                                              │
                                              ▼
                              5. CALL Vertex AI gemini-3.5-flash (existing path)
                                              │
                                              ▼
                              6. Policy check on response (policyChecker.ts)
                                 — universal, runs regardless of pathway
                                              │
                                              ▼
                              7. Update session state from response + persist
                                              │
                                              ▼
                              8. Stream response to FE
```

---

## How the model thinks about pathways (LLM-level)

At the prompt level, the AI is told:

> "You are currently in the **{pathway.key}** pathway, at **Phase {n}: {phase.title}**. Your job in this phase is to {phase.purpose}.
> Ask the user about: {phase.questions}.
> If the user mentions symptoms, watch for these signals: {pathway.declaredSymptoms}.
> Additional context for this turn: {out.differentialMentions if any}."

The model is **not** asked to "switch pathways" — that's a runtime decision the AI engine makes between turns, not within them. This keeps the model focused on the current phase.

---

## V1 ship list (PRs that follow this design doc)

1. **PR A: Types + Registry + Runtime skeleton + Phase 1 of contraception**
   - `workers/be/src/pathways/types.ts` — every interface declared above
   - `workers/be/src/pathways/registry.ts` — `buildSymptomRegistry()` + module loader
   - `workers/be/src/pathways/runtime.ts` — `runPhase()` + session state shape
   - `workers/be/src/pathways/contraception.fr.ts` — full module shape, Phase 1 populated, Phases 2-8 stubbed (purpose only, no questions)
   - `workers/be/src/pathways/contraception.en.ts` — mirror
   - Hook into `handlers/chat.ts` — gated by a `PATHWAY_RUNTIME_ENABLED` env var so we can ship code without flipping the flag for all users until validated
   - Routing classifier (Layer 1) implemented as a tiny dedicated Gemini call on the first message, returns a `PathwayKey | null`

2. **PR B-H: Phase 2-8 of contraception, one PR each**
   - Each PR fills one phase's `questions[]` from V2 §6.1, plus any pathway reference data the phase needs (UKMEC table comes with Phase 2, method table with Phase 4, side-effect literacy with Phase 5, etc.)
   - Each phase PR is independently SAB-reviewable

3. **PR I: Flip the flag**
   - Once Phases 1-8 are all in and tested end-to-end, set `PATHWAY_RUNTIME_ENABLED=true` for all users
   - Old open-chat behaviour for users routed to no pathway stays untouched

4. **PR J+ (no specific schedule): future pathways**
   - When endometriosis V1 spec is ready, ship `pathways/endometriosis.fr.ts` + `.en.ts` + `differentialAwareness` blocks added retroactively to `pathways/contraception.*.ts` covering shared symptoms

---

## Open questions to revisit later

These are deliberately out of scope for this design. Each is its own conversation when the time comes.

1. **Cross-session pathway memory.** If a returning user was in contraception last week, should the next conversation default to that? V2 §2.3 doesn't address. Architecture allows it but state model needs extension (user-profile-level field).
2. **Re-entry into a pathway mid-conversation.** If a user is in pathway X and types a question that's a strong entry signal for pathway Y, do we offer to switch or stay? V2 §2.3 implies "complete then offer", but UX may want a softer pivot.
3. **Pathway versioning + migration.** When `contraception.fr.ts` ships v2, what happens to sessions started under v1? Probably: complete the session under v1, new sessions get v2. Detail TBD.
4. **Physician interface (V2 §7) integration.** The portal should expose the same `PathwayModule` data — same source of truth for clinical review. Plumbing later.
5. **Implicit caching threshold reached.** Once a full pathway's structured prompt exceeds 4096 tokens, Vertex AI explicit caching becomes viable. We deliberately skipped caching design until pathway content makes it worthwhile.

---

## Relationship to other docs / files

| File / area | Relationship to this doc |
| --- | --- |
| `Anoqi_LLM_Product_Guidelines_V2.md` (local on Marion's machine) | The clinical source of truth. This doc translates Parts 1, 2, 3, 6 into an engineering spec. |
| `BRAND.md` | Visual / tone canon. Untouched by this design. |
| `HANDOVER.md` | Architecture overview. A new section on pathway runtime will be added when PR A lands. |
| `RUNBOOK.md` | Operations. Will gain a section on the `PATHWAY_RUNTIME_ENABLED` flag and how to flip it. |
| `workers/be/src/policy/policyChecker.ts` | Hard constraints (V2 §1.4). Universal — runs on every response, every pathway, no pathway. Untouched. |
| `workers/be/src/lib/gemini.ts` | Where the system prompt is assembled. PR A modifies this to add the pathway-context block when a pathway is active. |
| `workers/be/src/lib/retrieval.ts` | RAG. Eventually becomes pathway-aware (retrieve only chunks tagged for the current pathway), but not in PR A. |

---

## Version history

| Version | Date | Author | Notes |
| --- | --- | --- | --- |
| v1 | 2026-06-05 | Marion + Claude session | Initial design, MVP scope. Approved for PR A implementation. |
