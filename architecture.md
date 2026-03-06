## Unison Landing Page – Architecture

### 1. Goals and Constraints
- **Primary goal**: Convert qualified early adopters into a **Request Access** waitlist for the Unison beta.
- **Audience**: Early‑stage startup founders and product builders (1–20 person AI‑native teams), comfortable with AI agents and tools like Cursor/ChatGPT.
- **Non‑goals (v1)**: Pricing, full docs site, complex multi‑language support, enterprise‑grade compliance pages.

### 2. High‑Level System Architecture
- **Frontend framework**: `Next.js` (App Router) + `React`.
- **Styling**: `Tailwind CSS` for rapid iteration and consistent design.
- **Hosting**: `Cloudflare` (e.g. Cloudflare Pages/Workers) for deployment, edge delivery, and good default performance.
- **Analytics**: `PostHog` for:
  - Tracking page views.
  - Tracking conversions on the **Request Access** form and **Watch Demo**.
- **Content model**:
  - Marketing copy stored in **Markdown or structured JSON/TS objects** to enable fast iteration without layout changes.
  - Single long‑scrolling `LandingPage` composed of reusable React sections.

### 3. Page Structure (Sections)
Rendered top‑to‑bottom as a single page:

1. **Hero**
   - Purpose: 5‑second understanding and primary CTA.
   - Content:
     - Headline: communicates outcome (e.g. “From meetings to shipped work—done by AI teammates.”).
     - Subheadline: short explanation of Unison as an AI‑native workspace.
     - Primary CTA: **Request Access**.
     - Secondary CTA: **Watch Demo**.
   - Implementation: `HeroSection` React component with props for title, subtitle, and CTA labels/links.

2. **Core Workflow (“From meeting to shipped work”)**
   - Purpose: Show the concrete end‑to‑end flow that differentiates Unison.
   - Steps:
     1. Agent attends or receives your product meeting.
     2. Generates summary, decisions, action items.
     3. Creates tasks, assigns owners, sets priorities, links context.
     4. Agents execute deep work (research, specs, analysis).
     5. Agents ask for approval; humans send.
   - Implementation:
     - `WorkflowSection` component backed by a list of step objects.
     - Layout leaves space for a demo video or product screenshot grid.

3. **What AI Teammates Do**
   - Purpose: Translate the idea of “AI teammates” into a concrete capabilities list.
   - Implementation:
     - `CapabilitiesSection` with a small set of capability cards (icon, title, description) driven by data.

4. **Who It’s For (Use Cases)**
   - Purpose: Map value to specific personas: Product teams, Startup founders, Operations.
   - Implementation:
     - `UseCasesSection` rendering 3 cards with titles, short copy, and optional badges.

5. **Why Unison Is Different**
   - Purpose: Differentiate from “AI as a feature” tools.
   - Implementation:
     - `DifferentiationSection` with 2–3 concise points comparing:
       - “Chatbots in chat/docs” vs “Agents in a workspace.”
       - “Suggestions” vs “Executed work with approvals.”

6. **Human Control & Safety**
   - Purpose: Address trust by explaining the approval model.
   - Key messages:
     - Agents draft; humans send.
     - Transparent view of what agents propose.
   - Implementation:
     - `ControlSection` with a short explanation and simple visual of the approval step.

7. **FAQ**
   - Purpose: Handle top objections (integrations, meeting attendance, safety, who it’s for).
   - Implementation:
     - `FaqSection` rendering FAQ entries from a data file; optional accordion UI for compactness.

8. **Final CTA**
   - Purpose: Reinforce the value and give a last clear path to join the beta.
   - Implementation:
     - `FinalCtaSection` reusing the CTA component with slightly different copy.

### 4. Request Access Flow
- **Form fields**:
  - `email` (required).
  - `name` (optional but recommended).
  - `company/role` (optional).
- **Behavior**:
  - Client‑side validation for required fields.
  - On submit:
    - Call a lightweight backend endpoint (`/api/request-access`) that:
      - Stores the submission (e.g. in a simple database, external waitlist service, or even email for v1).
      - Returns success/failure.
    - Track an event in PostHog (`request_access_submitted`).
  - Show a friendly success state with next steps (e.g. “We’ll be in touch soon with beta details.”).

### 5. Content Management Approach
- **Goal**: Copy should be editable without touching React components.
- **Approach**:
  - Store *all* landing page text in a single JSON file (source of truth), e.g. `Landing_page/app/content/landing.copy.json`.
  - Keep the JSON shape aligned with section components:
    - `hero`: headline, subheadline, CTAs.
    - `workflow`: section title + step list.
    - `capabilities`, `useCases`, `differentiation`, `controlSafety`, `faq`, `finalCta`, `footer`.
  - Landing page components receive content via imports (or server-side file read), not hard‑coded strings.
  - Prefer short strings and structured lists in JSON; if a section later needs long-form rich text, split that single field into Markdown and keep the rest in JSON.

### 6. Non‑Functional Requirements
- **Performance**:
  - Optimize images and use Next.js `<Image>` for hero and product shots.
  - Keep dependencies minimal; no heavy animation libraries for v1.
- **Accessibility**:
  - Semantic HTML for sections, headings, and buttons.
  - Keyboard‑navigable CTAs and forms.
  - Sufficient color contrast in line with modern best practices.
- **Internationalization**:
  - English only in v1; design components so text is not overly baked into JSX, making future i18n easier.

### 7. Future Extensions (Not in v1)
- Additional pages (`/features`, `/agents`, `/use-cases`) that reuse the same design system.
- Deeper integration stories (screenshots and flows for meeting tools, task systems).
- A/B testing of hero messaging and CTAs, driven by PostHog experiments.

