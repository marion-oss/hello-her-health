## Unison Landing Page – Implementation Plan

This plan breaks implementation into small, testable phases so a developer can execute incrementally.

---

### Phase 1 – Project Setup (Next.js + Tailwind + Cloudflare)

**Goal**: Have a minimal Next.js app compiling locally with Tailwind, ready for Cloudflare deployment.

1. **Bootstrap project**
   - Create a new Next.js (App Router) project.
   - Initialize TypeScript.
   - Add Tailwind CSS and confirm styles apply to a sample page.
   - Verify `npm run dev` works locally.

2. **Cloudflare deployment wiring**
   - Add required Cloudflare config (e.g. for Pages/Workers).
   - Deploy the starter app to Cloudflare and confirm it is reachable via public URL.

**Definition of done**
- Local dev server runs without errors.
- Cloudflare deployment succeeds and shows the starter page.

---

### Phase 2 – Content Loading from JSON

**Goal**: Load all landing copy from `content/landing.copy.json` and render it on a simple page.

1. **Create content loader**
   - Add a small utility to load and parse `Landing_page/content/landing.copy.json`.
   - For server components, use a synchronous import; otherwise, use `fs` on the server as appropriate.

2. **Wire content into the main page**
   - Create a top‑level `LandingPage` component that:
     - Loads the JSON.
     - Passes structured content objects as props to simple placeholder sections.

3. **Temporary bare layout**
   - For now, render text only (no final styling) for:
     - Hero headline and subheadline.
     - Workflow steps list.
     - Capabilities list.

**Definition of done**
- Changing any text in `landing.copy.json` is reflected in the rendered page on refresh.
- No hard‑coded marketing strings in the components (only in JSON).

---

### Phase 3 – Section Components and Layout

**Goal**: Implement all main sections as reusable components with Tailwind styling.

1. **HeroSection**
   - Props: `headline`, `subheadline`, `primaryCta`, `secondaryCta`.
   - Layout: full‑width hero with responsive typography and CTA buttons.

2. **WorkflowSection**
   - Props: `title`, `intro`, `steps[]`.
   - Layout: vertical or horizontal step cards, numbered, using content from JSON.
   - Optionally leave space for a future demo video/image.

3. **CapabilitiesSection**
   - Props: `title`, `items[]`.
   - Layout: grid of capability cards (icon placeholder, title, description).

4. **UseCasesSection**
   - Props: `title`, `items[]`.
   - Layout: three cards (Product teams, Startup founders, Operations).

5. **DifferentiationSection**
   - Props: `title`, `points[]`.
   - Layout: short comparison bullets.

6. **ControlSection**
   - Props: `title`, `bullets[]`, `closingLine`.
   - Layout: text with emphasis on “agents draft, humans send”.

7. **FaqSection**
   - Props: `title`, `items[]`.
   - Layout: simple accordion or list of Q&A.

8. **FinalCtaSection + Footer**
   - Props: final CTA content + footer columns from JSON.

**Definition of done**
- All sections render using structured props sourced only from `landing.copy.json`.
- Page is responsive on mobile and desktop in a basic but presentable form.

---

### Phase 4 – Request Access Form (Waitlist)

**Goal**: Implement the primary conversion flow with basic validation and server handling.

1. **Form UI**
   - Fields: `email` (required), `name` (optional), `company/role` (optional).
   - Place the form in the Final CTA section (anchor `#request-access`).

2. **Client‑side validation**
   - Validate email format.
   - Disable submit while a request is in flight.
   - Show inline errors for invalid email.

3. **Backend endpoint**
   - Add `/api/request-access` route.
   - For v1, choose a simple persistence mechanism (to be decided separately):
     - Example: send an email to founders, write to a simple KV/store, or log to a file/console.

4. **Success and error states**
   - On success: clear form and show a success message.
   - On error: show a friendly error message and allow retry.

**Definition of done**
- Submissions are accepted and persisted/forwarded somewhere reliable.
- Form errors and success states are visible and understandable.

---

### Phase 5 – Analytics (PostHog)

**Goal**: Track basic usage and key conversion events.

1. **PostHog client integration**
   - Add PostHog SDK on the client.
   - Initialize with the correct key and environment settings.

2. **Events**
   - Track at minimum:
     - `page_view` for the landing page.
     - `request_access_submitted` when the form is successfully submitted.
     - `watch_demo_clicked` when the user clicks the demo CTA.

3. **Configuration**
   - Ensure events include useful context (e.g. URL, referrer).

**Definition of done**
- Events appear in PostHog for real user interactions.
- No blocking runtime errors from analytics in dev or production.

---

### Phase 6 – Visual Polish and Responsiveness

**Goal**: Bring the page closer to the desired “modern, minimal, AI‑native” aesthetic.

1. **Design pass**
   - Refine typography scale and spacing.
   - Add subtle gradients where appropriate (backgrounds, hero).
   - Tune colors for good contrast and brand fit.

2. **Responsiveness checks**
   - Verify layout on:
     - Small mobile devices.
     - Tablets.
     - Desktop.

3. **Accessibility sweep**
   - Ensure semantic structure (headings, landmarks).
   - Keyboard navigation for CTAs and form.

**Definition of done**
- Page feels coherent and “product‑quality” on main device sizes.
- No obvious accessibility regressions in basic checks.

---

### Phase 7 – Optional Enhancements (Post‑MVP)

These are explicitly optional and can be pulled into future sprints:

1. **Demo media**
   - Embed a short demo video or screenshots in the workflow or hero section.

2. **Experimentation**
   - Use PostHog experiments or environment toggles to test:
     - Alternative hero headlines.
     - Different CTA phrasing or placement.

3. **Additional pages**
   - If needed, spin up `/features`, `/agents`, or `/use-cases`, reusing the same content + component patterns.

