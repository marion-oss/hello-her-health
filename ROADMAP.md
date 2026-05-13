# Anoqi — Roadmap

A single place to park future work — features that are implied or scoped but not yet built. Triage at the start of each sprint; keep this list living, not exhaustive.

---

## Physician portal

A separate surface where physicians can review and shape clinical pathway content. **Decision needed:** which format Anoqi commits to. Each has different implications for clinical governance and engineering scope.

### Format options

- **Wiki / structured form** — Physicians edit pathway content directly in a CMS-like interface: the questions to ask, red-flag triggers, prep checklists. Highest physician agency, highest governance burden (every edit ships to production).
- **PR-style review** — AI suggests pathway updates; physicians comment, a clinical lead approves before changes go live. Closer to a software-engineering workflow. Slower iteration, stronger audit trail.
- **Annotation overlay** — Physicians flag specific AI responses or summary fields ("this should escalate to urgent", "missing question about X"). Lightweight feedback loop. Doesn't directly modify AI behaviour, just feeds product/prompt improvements.

### Where it lives

Separate Next.js or Remix web app pointed at the same Supabase backend, with its own RLS rules (physician role distinct from end user). Reuses Anoqi's existing pseudonymisation pipeline and audit logs.

### Clinical governance angle (flag early)

If physicians can edit pathway content that shapes AI behaviour for end users, Anoqi crosses into **medical-device territory** — CE marking under EU MDR for software-as-medical-device. Even a "decision-support" framing has regulatory implications in France. This deserves a separate, deliberate decision *before* the portal scope is locked in; it may constrain which of the three formats is feasible without a Notified Body involvement.

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
