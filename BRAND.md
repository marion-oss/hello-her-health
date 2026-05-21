# Anoqi Brand System

The brand canon. **What** the visual identity is, **what** rules govern it, and **where** each token lives in code.

Companion to [`HANDOVER.md`](./HANDOVER.md) (architecture) and [`RUNBOOK.md`](./RUNBOOK.md) (operations). If those tell you the system, this tells you how it should *feel*.

> **Version:** 2.2 — Candy Pink replaced by **Plum** `#2D1A2E` (the dark insight surface). Apricot accents are now allowed *inside* a Plum container (documented exception). Body italic permitted in two narrow surfaces (knowledge cards, status labels). HomeScreen + Chat + Documents + Profile all migrated; `App.tsx` default mode flipped to light. See [§13 What changed from v2.1](#13-what-changed-from-v21) for the v2.1→v2.2 delta and [§9 What changed from Sanctuary](#9-what-changed-from-sanctuary) for the v1.0→v2.0 migration.

---

## 1. The brand in one paragraph

Anoqi is a women's-health AI companion. The brand is **confident, readable, and joyful** — not soft, not clinical, not maximalist. It earns trust through restraint: white space, dark type, a single accent colour used with discipline. Where other health products lean either austere (medical blue, sans-serif greys) or saccharine (lavender gradients, hand-lettered scripts), Anoqi sits between: serious copy, big serif-adjacent display weight, **fuchsia as the only chromatic signal**, apricot as a single decorative gesture. The product looks like it was made by someone who took the design seriously without taking themselves seriously.

---

## 2. Palette

Eight tokens. Every rule about what colours can go where is encoded as a "Allowed" / "Never" pair — break those rules and the brand drifts.

### 2.1 The eight

| Token | Hex | Role |
|---|---|---|
| **Void** | `#0D0D12` | Headlines (non-accent), body copy, structure, button text on light fills |
| **White** | `#FFFFFF` | Canvas. Always. The product breathes on white. |
| **Fuchsia** | `#FF0472` | Signal: accent headline lines, primary CTAs, the dot, the pip, active states |
| **Soft Apricot** | `#FDBA74` | Decoration only — radial gradient bloom in hero / empty-state moments. Single documented exception: accent text + chips *inside* a Plum surface. |
| **Warm Gray** | `#3A3040` | Secondary copy: subtitles, captions, body that should recede |
| **Petal** | `#FEF0F4` | Subtle warmth: pill backgrounds, status surfaces, card tints, bottom-dock background |
| **Sand** | `#E8E0D8` | Quiet structure: secondary button outlines, hairline dividers |
| **Plum** | `#2D1A2E` | v2.2 dark insight surface. Replaces Candy Pink. The only dark surface permitted on the light canvas — a deliberate moment of warmth + weight inside an editorial composition. |

A companion light shade `palette.plum[50]` (`#F0E4D8`, warm cream) is used as the text colour for content placed *on* a Plum surface — Plum has too much chroma to pair with pure white. Not a top-level token, lives under the Plum scale in code (`app/theme/colors.ts`).

Candy Pink (`#FFB0CC`) — added in v2.1 as a reserved slot, never shipped — was retired in v2.2 in favour of Plum.

### 2.2 Rules per token

**Void** `#0D0D12`
- Allowed: headlines (non-accent words), body copy, primary text on white, icon strokes
- Never: backgrounds. The canvas is white. Inverting to dark mode requires an explicit redesign, not a token swap.

**Fuchsia** `#FF0472`
- Allowed: accent words in headlines, primary CTAs (fill + text-on-fill), the wordmark dot, the form dot, eyebrow text, pill pips, focus rings, active-state indicators
- Never: body copy, large surfaces (the brand fails if fuchsia covers > ~12% of a screen), borders on tertiary UI, hover states for non-pressables

**Soft Apricot** `#FDBA74`
- Allowed: radial-gradient bloom in hero compositions, empty-state warmth, decorative blobs behind primary content
- Allowed (v2.2 exception): accent text, source-chip backgrounds, decorative glows and dividers *inside a Plum surface only*. Apricot reads as a warm cousin of the Plum and unifies the dark insight container; on the white canvas the original Never rule still applies.
- Never: text (any size, any context) on the white canvas, button fills, button borders, line art, icon fills, status colour

**Warm Gray** `#3A3040`
- Allowed: subtitles, body copy when full Void would be too heavy, captions, helper text, form labels
- Never: headlines, buttons, backgrounds

**Petal** `#FEF0F4`
- Allowed: pill backgrounds, soft card tints, status surfaces (e.g. live / in-review pill bgs), hover backgrounds for tertiary actions
- Never: text colour, button fill (primary OR secondary), strong containers

**Sand** `#E8E0D8`
- Allowed: secondary button outlines (1.5px stroke), divider rules, very-subtle hairlines
- Never: text, fills, focus rings

**Plum** `#2D1A2E`
- Allowed: insight-card surface on the home screen, segmented-control container in onboarding, future "deeper warm surface" needs (modals that need weight, status cards that should read serious)
- Allowed accents *inside* Plum: warm-cream text (`palette.plum[50]`), apricot eyebrow + chips + dividers, fuchsia inner CTAs
- Never: applied to body text, applied as a border colour, used on more than one surface per screen (one moment of weight, not a pattern), used as a back-button or icon tint
- Coverage: ≤ 25% of viewport on any screen that uses it. Plum is a content surface, not a structural one.

### 2.3 Coverage targets per screen

If you measure a screen and one of these is wildly outside its band, you're drifting:

| Surface | % of viewport |
|---|---|
| White (canvas) | 55–80% (lower bound when an Insight surface is present) |
| Void (type + structure) | 8–18% |
| Petal + Sand combined | 5–12% |
| Fuchsia (accent + CTA) | 2–8% |
| Soft Apricot (decoration) | 0–15% (one moment per screen, not every screen) |
| Plum (insight surface) | 0–25% (one moment per screen, not every screen) |
| Warm Gray | 1–5% |

---

## 3. Typography

Two type families. Each does exactly one job.

### 3.1 Families

| Family | Where it lives | Why |
|---|---|---|
| **Bricolage Grotesque** | All headlines, wordmark, primary CTA labels | Display-grade contrast, slight letterform quirks (the lowercase `g`, the slanted `e`) carry the joy without being twee. Pairs visually with Inter without competing. |
| **Inter** | All body copy, secondary buttons, captions, UI labels | Workhorse sans, 300-weight by default. Lets Bricolage 800 do all the shouting. |
| **JetBrains Mono** | Code, data values, technical UI only | Held in reserve. Not part of the public surface. |

### 3.2 Type scale

Modular ratio **1.33** off a 15px body base. Final values are the rounded ones below, not the formula — designers should use these literal sizes.

| Variant | Family / Weight | Size | Line height | Letter-spacing |
|---|---|---|---|---|
| Display | Bricolage 800 | 56px | 1.05 | -1.8px |
| H1 (hero headline) | Bricolage 800 | 38px | 1.08 | -1.2px |
| H2 | Bricolage 800 | 30px | 1.12 | -0.8px |
| H3 | Bricolage 800 | 24px | 1.18 | -0.4px |
| H4 | Bricolage 500 | 20px | 1.3 | -0.2px |
| Body LG | Inter 300 | 16px | 1.6 | normal |
| Body | Inter 300 | 13px | 1.75 | normal |
| Body MD | Inter 400 | 13px | 1.6 | normal |
| Label | Inter 400 | 12px | 1.4 | 0.02em |
| Caption | Inter 400 | 11px | 1.5 | 0.04em |
| Eyebrow | Inter 500 | 9px | 1.4 | 0.22em (uppercase) |
| Mono | JetBrains 400 | 11px | 1.5 | normal |

### 3.3 Headline rule

The Anoqi headline carries the brand. It earns the weight by colour, not by adding emphasis.

**Single fuchsia accent — the second line only.** The canonical hero uses a four-line headline where the final two lines ("Mieux entendue.") are in Fuchsia. Everything above is Void. The split is always at "Mieux entendue." — it is the brand's single emotional line and earns the signal colour.

The canonical hero:

```
Mieux                      ← Void
informée.                  ← Void
Mieux                      ← Fuchsia
entendue.                  ← Fuchsia
```

For shorter headlines (two lines), one fuchsia word only:

```
Mieux informée. Mieux entendue.
                         ↑
                only "entendue." in Fuchsia
```

Never:
- All-fuchsia headline (it stops being a signal)
- Diagonal stripe alternation (e.g. alternating line colours — feels arbitrary and clashes)
- Apricot in headline text (we tried it — it clashes with fuchsia at display size)
- Italic display (we use weight to land, not slant)
- Cormorant Garamond or any serif italic (deprecated from v1.0 Sanctuary)
- Two competing accent colours in the same headline

### 3.4 Body copy

Body copy is **Inter 300, 13px, line-height 1.75**, colour Warm Gray `#3A3040`. The 1.75 leading is non-negotiable — it's the breathing room that makes serious copy feel approachable. Tight body copy is the single fastest way to make the product feel clinical or aggressive.

For the rare moment when body copy needs to land harder (a single declarative sentence, a callout), step up to Void `#0D0D12` while keeping Inter 300 — switching to a heavier weight reads as alarm.

**Italic exception (v2.2)** — body italic is permitted in two narrow surfaces:

1. Knowledge cards (the "Savoir du jour · Cochrane" pattern). Italic signals reflective / editorial tone vs the directness of the rest of the product. Inter 300 italic only — never display italic.
2. Status labels rendered in caption-size next to a primary value (e.g. "Bientôt disponible" on the Cycle card). Italic reads as a soft aside; non-italic in that spot would compete with the primary label.

Outside those two surfaces, italic remains banned. Display headlines are never italic (see §3.3). The v1.0 Sanctuary use of italic everywhere — Cormorant display, italic body — stays deprecated.

---

## 4. The form

One graphic. That's it.

### 4.1 What it is

A **soft radial gradient bloom in Soft Apricot**, anchored to one corner of the composition (default: top-right), bleeding off the canvas. Inside it, **a single fuchsia dot** with a Gaussian-blur glow, pulsing on a 4-second loop.

Reference geometry (300×610 phone canvas):

```svg
<defs>
  <radialGradient id="apricot" cx="72%" cy="10%" r="55%" fx="72%" fy="10%">
    <stop offset="0%"   stop-color="#FDBA74" stop-opacity="0.70"/>
    <stop offset="35%"  stop-color="#FDBA74" stop-opacity="0.38"/>
    <stop offset="70%"  stop-color="#FDBA74" stop-opacity="0.10"/>
    <stop offset="100%" stop-color="#FDBA74" stop-opacity="0"/>
  </radialGradient>
  <filter id="dotGlow" x="-80%" y="-80%" width="260%" height="260%">
    <feGaussianBlur stdDeviation="4" />
  </filter>
</defs>

<rect width="300" height="610" fill="url(#apricot)"/>
<circle cx="228" cy="85" r="6.5" fill="#FF0472" opacity="0.90" filter="url(#dotGlow)"/>
```

> **Locked in v2.1.** The SVG above is the exact production reference. Do not change `cx`, `cy`, `r` or dot position without a brand review.

### 4.2 What it isn't

The form **deprecates** everything the v1.0 Sanctuary BreathingForm was: the six-element composition with dusk body, two organic fuchsia rings, inner disc, warm-grey heart, full-screen ember underlighting. All gone.

If you find yourself wanting more elements — a second arc, a second bloom, an inner ring — stop. The font, the colour, and the headline rhythm are doing the heavy lifting. The form just signals the brand is alive.

### 4.3 Where to use it

- Welcome / hero screens — full intensity
- Empty states — at ~60% intensity (smaller bloom, dot still glows)
- Splash / loading — bloom alone, no dot

Never:
- Mid-content blooms (it stops being a brand moment)
- Multiple blooms per screen
- Apricot as a fill behind a card (overlays a brand signal onto product surface)

### 4.4 The dot's motion

```css
@keyframes dotPulse {
  0%, 100% { opacity: 0.92; transform: scale(1);    }
  50%      { opacity: 0.35; transform: scale(0.62); }
}
animation: dotPulse 4s ease-in-out infinite;
```

Same curve and same period as the wordmark dot. They breathe together. Respect `prefers-reduced-motion` and disable the loop (the dot stays visible at the 0% frame — full opacity, full scale).

---

## 5. Component anchors

The brand isn't a colour swatch — it's a small set of reusable shapes. These are the canonical compositions; everything else is a variation.

### 5.1 Wordmark

```
anoqi●
```

- Bricolage Grotesque 800, size proportional to context (20px nav, 56px hero)
- Letter-spacing `-0.5px` (tight)
- Colour Void `#0D0D12`
- Dot: 7px (at 20px wordmark) / 10px (at 56px), Fuchsia, margin-left 2px, margin-top 2px from the baseline, animated with `dotPulse` 4s
- On white or warm-white backgrounds: Void wordmark, Fuchsia dot (see `anoqi-logo-white.svg`, `anoqi-logo-light.svg`).
- On dark backgrounds: White wordmark, Fuchsia dot (see `anoqi-logo-dark.svg`). This is now defined — the "TBD" from v2.0 is resolved.

### 5.2 Eyebrow

```
POUR LA SANTÉ DES FEMMES
```

- Inter 500, 9px, letter-spacing `0.22em`, `text-transform: uppercase`
- Colour Fuchsia at 80% opacity (`rgba(255, 4, 114, 0.8)`)
- Sits above the headline, ~10px gap

### 5.3 Headline

See [§3.3](#33-headline-rule). Two-tone block.

### 5.4 Subtitle

```
Comprendre votre corps, préparer vos consultations,
naviguer en confiance.
```

- Inter 300, 13px, line-height 1.75
- Colour Warm Gray `#3A3040`
- Sits below the headline, ~16px gap

### 5.5 Pill (bullet / status)

```
●  Sources validées — NHS, HAS, NICE
```

- Background Petal `#FEF0F4`
- Border-radius 40px (very rounded — "pebble" feel)
- Padding `9px 16px`
- Internal layout: row, gap 10px, items center-aligned
- Pip: 5px circle, Fuchsia at 75% opacity, flex-shrink: 0
- Text: Inter 400, 11px, Void

### 5.6 Primary button (CTA)

```
Commencer →
```

- Background Fuchsia `#FF0472`
- Text White
- Font Bricolage Grotesque 500, 14px, letter-spacing `0.02em`
- Border-radius 14px
- Padding `16px 0` (full-width default) or `16px 28px` (inline)
- No border
- Press: `transform: scale(0.97)` over 160ms `cubic-bezier(0.22, 1, 0.36, 1)` — Emil rule, see [§7](#7-motion)

Hover (desktop only): `box-shadow: 0 8px 24px rgba(255, 4, 114, 0.35)` — soft fuchsia bloom under the button. Never raise/lift the button itself.

### 5.7 Secondary button

```
J'ai déjà un compte
```

- Background White
- Text Void
- Font Inter 400, 12px (a half-step quieter than primary on purpose)
- Border 1.5px solid Sand `#E8E0D8`
- Border-radius 14px (same as primary, keeps them visually paired)
- Padding `14px 0` (slightly tighter than primary)

The secondary intentionally **isn't pink**. It's a quiet outline that lets the primary lead. Two pink buttons compete; one pink + one neutral creates clear hierarchy.

### 5.8 Body / canvas

Just White. The product breathes on white. The only "background colour" beyond white is the apricot bloom in hero moments, Petal in pill / card tints, and a single Plum insight surface where used.

### 5.9 Insight surface (v2.2)

The Plum dark container. The home screen's central editorial moment — a paragraph-shaped surface that carries a claim, its source, and one or two inner actions. Lives once per screen, no smaller than ~280px tall.

| Slot | Value |
|---|---|
| Surface | Plum `#2D1A2E` |
| Body text | Warm cream `#F0E4D8` (palette.plum[50]), Bricolage Bold 16/24 |
| Eyebrow | Soft Apricot at 100% opacity, Bricolage 700, 1.6 letter-spacing |
| Source chip | Soft Apricot text at 100%, apricot fill at 15% alpha, apricot border at 28% alpha |
| Divider | Apricot at 15% alpha |
| Decorative glow | Apricot at 18% alpha, radial, top-right corner, blurred 20px on web |
| Primary inner CTA | Solid Fuchsia, white text, Bricolage Medium 11px, radius 14 |
| Ghost inner CTA | White at 10% alpha, white text, white border at 28% alpha, radius 14 |
| Outer radius | 14px (matches all other v2.2 cards) |

The Plum surface is the only place apricot text + chips are allowed in the entire product (see §2.2). Outside this surface, apricot is decoration only.

### 5.10 Knowledge card (v2.2)

The reflective companion to the Insight surface. Lives below it on the home screen, optionally elsewhere. Carries longer-form editorial copy with a clear citation.

| Slot | Value |
|---|---|
| Surface | Petal `#FEF0F4` |
| Border | Sand `#E8E0D8` 1px |
| Eyebrow | Fuchsia, Bricolage Bold 10px, 1.4 letter-spacing, uppercase ("Savoir du jour · Cochrane") |
| Body | Inter 300 **italic**, 13/22, Void colour — italic per §3.4 exception |
| Hint | Fuchsia 4px dot + fuchsia uppercase Bricolage 700 10px ("Swipe pour découvrir la suite") |
| Outer radius | 20px (one notch larger than other cards — slightly editorial) |

### 5.11 Bottom dock (v2.2)

The floating bottom navigation pill. Replaces v1.0's LiquidEmber glass dock.

| Slot | Value |
|---|---|
| Container | Petal `#FEF0F4` on Sand `#E8E0D8` 1px hairline, radius 36 |
| Drop shadow (web) | `0 10px 28px -10px rgba(13, 13, 18, 0.18)` |
| Active tab | White fill, Sand outline, Void icon, fuchsia 5px pulsing dot below the icon |
| Inactive tab | Transparent, warm-gray `#5c5460` icon |
| Pulse | Same 4s curve as the wordmark dot |

No labels under icons. The dot is the indicator.

---

## 6. Spacing & radii

Surviving from v1.0 with values trimmed:

### 6.1 Spacing scale

4px base, 1× multiplier:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

Available as tokens `s-1` through `s-16` (last number = pixel value / 4).

### 6.2 Radii

| Token | Value | Used on |
|---|---|---|
| `sm` | 8 | Inline tags, mono code blocks |
| `md` | 12 | Cards, sheets |
| `lg` | 14 | Buttons (primary and secondary) |
| `xl` | 20 | Hero-scale cards |
| `2xl` | 28 | Phone-frame rounding in mockups |
| `pill` | 999 | Pills, eyebrow chips, dots |

Buttons use `lg = 14px` now. The Sanctuary `pill` (999) on buttons read as too soft for the new typography weight — this is a deliberate change.

---

## 7. Motion

### 7.1 Easings

| Token | Curve | Use |
|---|---|---|
| `outQuart` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default UI (press, fade, slide) |
| `easeInOut` | `cubic-bezier(0.65, 0, 0.35, 1)` | Cross-fade transitions |
| `dotBreath` | `ease-in-out` | The dot's 4s pulse loop |

### 7.2 Durations

| Token | Value | Use |
|---|---|---|
| `press` | 160ms | Button / tap press feedback |
| `fast` | 200ms | Small UI transitions (icon swap, hover) |
| `base` | 300ms | Standard transitions (cards entering, etc.) |
| `slow` | 500ms | Sheet entrance, page transitions |
| `breath` | 4000ms | The dot's pulse cycle |

### 7.3 The Emil press rule

Every pressable surface (button, tile, pill, list row) gets the same press feedback:

```css
:active {
  transform: scale(0.97);
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
```

Never lift on hover (that's iOS, not brand). Never bigger than 0.97. Never longer than 160ms.

### 7.4 `prefers-reduced-motion`

The dot's pulse, the entrance fade-up, any scale transform — all opt out under `@media (prefers-reduced-motion: reduce)`. The dot stays visible (resolved to 0% frame: full opacity + full scale).

---

## 8. Implementation map

Where each token + rule lives in the codebase.

### 8.1 Status as of v2.2

| Layer | Status |
|---|---|
| Theme tokens (palette, typography, radii, motion) | ✅ Live (`app/theme/*`) |
| Plum palette token | ✅ Live (`app/theme/colors.ts` — `palette.plum[500]` surface + `palette.plum[50]` companion text) |
| App.tsx default mode | ✅ Light (`<ThemeProvider>` defaults to light; per-screen wrappers removed) |
| WelcomeScreen | ✅ Live |
| ObjectiveScreen | ✅ Live |
| ConsentScreen | ✅ Live (research opt-in row 2 above the fold; "(Optionnel)" inline fuchsia-bold) |
| AccountScreen | ✅ Live (Plum-surface segmented control with apricot indicator) |
| HomeScreen | ✅ Live (v2.2 Plum register: profile chip, fuchsia greeting, Plum Insight, mini cards, Cycle ring, Knowledge card) |
| ProfileScreen | ✅ Live |
| Documents screens (List, Detail, Add) | ✅ Live |
| ChatScreen + Bubble + StarterCard | ✅ Live |
| Wordmark.tsx | ✅ Live (Bricolage 800, Void default colour) |
| Button.tsx | ✅ Live (theme-aware) |
| Bloom.tsx | ✅ Live (geometry locked in §4.1) |
| GoalSheet, DocumentContextSheet, ConsentSheet, LiquidTabBar | ✅ Live (v2.2 light register) |
| BreathingForm, LiquidEmber, PeonyBloom | 🗑️ Deprecated — not imported anywhere except a single `?test=breath` route in App.tsx (dev-only) and the SegmentedControl tests if any. Safe to delete in a follow-up. |
| Markdown.tsx `[Sn]` citation tint | ⏳ Still v1.0 — needs to flip from ember → fuchsia (BRAND.md §10.2) |
| BrandWordmark inlines in Welcome / Home / Profile / DocumentsList | ⏳ Duplicate the shared `Wordmark.tsx` — delete in a follow-up cleanup |

### 8.2 Remaining work

| Concern | Where |
|---|---|
| Status pill colour theory (§10.1) | Pill.tsx status variants, deferred to portal-led design |
| Markdown citation tint (§10.2) | `app/components/Markdown/Markdown.tsx` |
| Delete BrandWordmark inlines | 4 screens — replace with `<Wordmark size={...} />` |
| Delete BreathingForm / LiquidEmber / PeonyBloom files | `app/components/` |
| Physician portal v2.2 migration | Tracked separately in §11.7 |

---

## 9. What changed from Sanctuary

For anyone returning to the codebase, the v1.0 → v2.0 delta in one table:

| Concern | v1.0 Sanctuary | v2.0 (this doc) |
|---|---|---|
| **Canvas** | Dark `#0D0D12` | White `#FFFFFF` |
| **Body text** | Warm white `#FFF5EE` | Void `#0D0D12` / Warm gray `#3A3040` |
| **Display font** | Cormorant Garamond italic | Bricolage Grotesque 800 (upright) |
| **Body font** | Inter (all weights) | Inter 300/400 only |
| **Accent signal** | Fuchsia ✓ (same) | Fuchsia ✓ (same — only carryover) |
| **Warmth** | Ember `#C4806A` wash everywhere | Soft Apricot `#FDBA74` in one bloom only |
| **Brand mark** | Six-element BreathingForm + PeonyBloom + LiquidEmber | Single fuchsia dot + single apricot bloom |
| **Pill backgrounds** | rgba(255,245,238,0.06) | Petal `#FEF0F4` |
| **Eighth token** | Not present | Candy Pink `#FFB0CC` added in v2.1 (reserved, never shipped) → **replaced** in v2.2 by Plum `#2D1A2E` (active insight surface) |
| **Secondary buttons** | Dusk-bordered ghost | Sand-bordered outline |
| **Headline italics** | Italic by default | Upright always |
| **Headline rhythm** | Single accent word | Two-tone horizontal split |

Mentally: the brand went from "intimate dark sanctuary" to "confident bright editorial." The voice is the same — direct, French, women-first — but the visual register is now louder and lighter.

---

## 10. Open questions

Still-unresolved design work tracked here, with status:

1. **Status pill colour theory.** v1.0 had draft / inReview / approved / live / archived each with a colour. Those mapped to dark surfaces and don't translate. Need: five status colours that work as Petal-family tints on white. **Open** — likely portal-led (see §11.4).
2. **Markdown accents.** Inline `[Sn]` citations, code fragments, bold, em — all need a re-derivation against white. **Open** — Markdown.tsx tint is still v1.0 ember.
3. **Dark-mode contingency.** If iOS users force dark mode at the OS level, the brand currently breaks. Decision: keep white-only with a system override (`color-scheme: light`), or design a v2.0-faithful dark variant. **Open** — current default is `color-scheme: light` (the dark palette is preserved in tokens but unused).
4. **Logo on non-white surfaces.** Press, partner docs, third-party embeds. Out of scope here but will need a brand-asset pack. **Open**.
5. **The Bloom component.** ✅ **Resolved in v2.1.** Geometry locked in §4.1. Implementation lives at `app/components/Bloom.tsx` with `intensity` (0–1) and `position` props. The dot is present except on splash/loading.
6. **HomeScreen Insight content per objective (v2.2).** The Plum Insight card currently uses generic educational copy from `INSIGHTS` (`app/screens/home/HomeScreen.tsx`). The mockup showed claim-style copy ("Ton œstrogène baisse en phase lutéale — ce n'est pas de la fatigue") which needs physician-reviewed text per objective. **Open** — content design, not code.

Pick these up in order as the rebrand rolls into more surfaces.

Physician-portal alignment is addressed in [§11](#11-physician-portal-adaptation) below.

---

## 11. Physician portal adaptation

The physician portal (`physician-portal/`, Next.js app) is a different surface with a different user. Where the patient app is a sanctuary, the portal is a workshop — clinicians using it want a tool, not a brand moment. The portal adopts the v2.0 **palette and typography unchanged**, but its compositional register is calmer: no decorative blooms, no two-tone headlines, no editorial drama. Density is slightly higher and the fuchsia signal is held back even further than in the patient app.

The goal is "clearly the same family of products" without making clinicians feel like they're working inside a marketing surface.

### 11.1 What stays exactly the same

- All seven palette tokens (Void, White, Fuchsia, Soft Apricot, Warm Gray, Petal, Sand) — same values, same `Allowed`/`Never` rules.
- Bricolage Grotesque for display, Inter for body, JetBrains Mono for code/data.
- Press feedback: `transform: scale(0.97)` over 160ms with `cubic-bezier(0.22, 1, 0.36, 1)`. The Emil rule applies everywhere.
- The 4px spacing base and the radii system.
- `prefers-reduced-motion` behaviour.

### 11.2 What changes for the portal

| Concern | Patient app | Physician portal |
|---|---|---|
| **Apricot bloom** | One per hero / empty-state moment | **Never**. The portal is a workshop, not a sanctuary. Apricot is reserved for the "no pathways yet" empty state at very low intensity, and nowhere else. |
| **Two-tone headlines** | Top half Void, bottom half Fuchsia. Editorial drama. | **Never**. Page titles are single-tone Void, single line where possible. Bricolage 800 only on the page-title row. |
| **Fuchsia coverage** | 2–8% of viewport | Closer to 1–4%. Fuchsia is reserved for: save/publish actions, the wordmark dot, the "currently active" indicator, the focus ring. Not for section eyebrows, not for routine UI accents. |
| **Body weight** | Inter 300 (light, breathable) | Inter 400 (regular) for the default body. Inter 300 is reserved for long-form helper text and footnotes. Better readability at smaller sizes and across longer reading sessions. |
| **Body size** | 13px @ 1.75 leading | 14px @ 1.5 leading. The portal is read on desktop monitors at arm's length; the patient app on phones held closer. |
| **Card weight** | `quiet` (flat + hairline) is the default | `lifted` (Sand-coloured 1px border + subtle shadow) is the default for content containers. Data needs visible boundaries. |
| **Density** | Generous padding, large hit targets | Tighter — list rows ~44px tall instead of 56–64px. Internal padding scales 4→3 (16px → 12px) for table rows and sidebar items. |
| **Eyebrow colour** | Fuchsia at 80% opacity | Warm Gray. The fuchsia eyebrow reads as marketing in a clinical context. |
| **Status pills** | Used occasionally | The portal's most-used component. Every pathway row carries one. Treat the pill colour theory rework (§10.1) as portal-led — the portal's status mapping is the canonical one. |
| **Wordmark** | Bricolage 800 at 20–56px, pulsing dot | Bricolage 800 at 18px in the app header, pulsing dot at lower visibility (opacity 0.6 baseline, drops to 0.3 mid-pulse). The dot is present but not actively drawing the eye away from the work surface. |

### 11.3 Page composition

A portal page is built from these zones, top to bottom:

```
┌────────────────────────────────────────────┐
│  Wordmark · breadcrumbs · author / actions │  Inter 400 14px, Sand divider below
├────────────────────────────────────────────┤
│  Page title (Bricolage 800, 28px, Void)    │  ~24px vertical breathing
│  Subtitle (Inter 400, 14px, Warm Gray)     │
├────────────────────────────────────────────┤
│                                            │
│   Content cards (lifted, Sand border)      │  16px gap between cards
│   Data tables / forms / editors            │  14px body, 12px labels
│                                            │
├────────────────────────────────────────────┤
│  Footer: footnote + version, Warm Gray     │
└────────────────────────────────────────────┘
```

No floating bloom. No background gradient. The work surface is white, full stop.

### 11.4 Components — portal-specific decisions

For each portal component, what the v2.0 adaptation looks like. Implementation lives in `physician-portal/components/`.

**`PathwayHeader`** — the page-title row for a single pathway under edit. Pathway title (Bricolage 800 28px), pathway-key + version in mono (`contraception · v1.2`), status pill, save/publish action. No eyebrow. No fuchsia in the title.

**`Card`** — keep the three variants (`quiet`, `lifted`, `glass`) but change the default. Lifted is default for content cards. Glass is removed from this surface — there's no ember layer below to glass over.

**`Badge`** — drives the status pills. Five variants: draft / in_review / approved / live / archived. The colour mapping per BRAND.md §10.1 (still open at time of writing; the portal team should drive this).

**`EmptyState`** — peony glyph (low-intensity apricot bloom is allowed here), Bricolage 500 24px headline, Inter 400 body, optional fuchsia CTA. The one place apricot shows up in the portal.

**`JsonViewer`** — JetBrains Mono 13px, Sand-bordered card, syntax highlighting via Fuchsia (keys), Warm Gray (values), Void (structure). No rainbow palettes.

**`PeonyBloom`** — currently in the portal as a brand mark. After the rebrand, replace with the new `Bloom` component (low intensity) for empty states only. The standalone glyph goes away.

### 11.5 Density / spacing scale for portal

The portal can use the same spacing tokens (`s-1` through `s-16`) but its defaults skew tighter:

| Context | Patient app | Portal |
|---|---|---|
| Section vertical rhythm | `s-8` (32px) | `s-6` (24px) |
| Card internal padding | `s-5` (20px) | `s-4` (16px) |
| List-row padding | `s-3` (12px) | `s-2` to `s-3` |
| Button padding (primary) | `16px 0` full-width | `10px 16px` inline default |
| Form-field gap | `s-3` (12px) | `s-2` (8px) |

### 11.6 What this gives you

Two surfaces that share a palette, a typeface, a press feel, and a vocabulary of tokens — but read differently to the people who use them. The patient encounters a confident editorial moment ("Mieux entendue."). The clinician encounters a competent workshop. Both are obviously Anoqi.

### 11.7 Implementation map for the portal

A separate-PR-per-concern migration, parallel to §8 but inside `physician-portal/`:

| File | What changes |
|---|---|
| `physician-portal/app/globals.css` | Replace the v1.0 dark CSS variables with the v2.0 token values. White canvas, Void body, Bricolage display via `--font-display`, Inter via `--font-body`. |
| `physician-portal/app/layout.tsx` | Load Bricolage Grotesque + Inter via `next/font/google`. Remove any Cormorant references. |
| `physician-portal/components/Card.tsx` | Change default variant from `quiet` to `lifted`. Drop the `glass` variant. |
| `physician-portal/components/Badge.tsx` | New status mapping per §10.1 once derived. |
| `physician-portal/components/PathwayHeader.tsx` | Bricolage 800 title, no fuchsia accent on the title. |
| `physician-portal/components/PeonyBloom.tsx` | **Delete** after `EmptyState` migrates to the shared `Bloom` component. |
| `physician-portal/components/EmptyState.tsx` | Adopt the shared `Bloom` (low intensity), Bricolage 500 title. |
| `physician-portal/components/JsonViewer.tsx` | New syntax-highlight palette: Fuchsia keys, Warm Gray values, Void structure. |

Pick these up in the same order: tokens + typography first, components second, page-level edits third.


---

## 12. Welcome screen reference

The locked production mockup for the patient app welcome screen is in `anoqi-welcome-screen.html`. This is the single source of truth for the hero composition until the native implementation is complete.

### 12.1 What's locked

| Element | Value |
|---|---|
| Canvas | `#FFFFFF` |
| Bloom gradient | `cx="72%" cy="10%" r="55%"` · `#FDBA74` → transparent |
| Dot position | `cx="228" cy="85"` · `r="6.5"` · Fuchsia at 90% opacity |
| Dot animation | `dotPulse` 4s ease-in-out · opacity .92→.35 · scale 1→.62 |
| Wordmark size | Bricolage 800 · 20px · Void |
| Headline | H1 · 38px · Void + Fuchsia on "Mieux entendue." only |
| Eyebrow | "POUR LA SANTÉ DES FEMMES" · Inter 500 · 9px · Fuchsia at 80% |
| Subtitle | Inter 300 · 13px · Warm Gray `#3A3040` |
| Pills | Petal `#FEF0F4` background · no border · Fuchsia pip |
| Primary button | Fuchsia fill · White Bricolage 500 · border-radius 14px |
| Secondary button | White fill · Void text · Sand border 1.5px · border-radius 14px |

### 12.2 What must not change without brand review

- The bloom position and radius (`cx`, `cy`, `r`)
- The dot position relative to the bloom
- The two-tone headline split ("Mieux entendue." = Fuchsia, everything above = Void)
- The pill background colour (Petal only — not Candy Pink, not Apricot)

### 12.3 What can be adjusted per screen

- Bloom intensity — reduce to ~60% on inner screens and empty states
- Bloom position — can move to bottom-left or bottom-right on secondary screens for variety
- Dot size — scales proportionally with bloom intensity

---

## 13. What changed from v2.1

The v2.1 → v2.2 delta. Shorter than the Sanctuary delta because v2.1 already had the canvas + typography + bloom right.

| Concern | v2.1 | v2.2 |
|---|---|---|
| **Eighth palette token** | Candy Pink `#FFB0CC` (reserved, unused) | **Plum** `#2D1A2E` (active insight surface) |
| **Apricot rule** | Decoration only, never UI / text | Decoration only on the white canvas; *allowed* as accent text + chips inside a Plum surface (documented exception) |
| **Italic rule** | Banned everywhere | Banned in display; permitted in two body surfaces — knowledge cards, soft status labels — per §3.4 |
| **HomeScreen Insight card** | Petal-tinted with single body text | Plum dark surface with apricot eyebrow + source chip + inner pills (§5.9) |
| **Knowledge card** | Did not exist | Petal-bg italic editorial card with Cochrane source (§5.10) |
| **Bottom dock** | LiquidEmber glass (v1.0 carryover) | Petal pill on Sand hairline, white active tab with fuchsia dot (§5.11) |
| **Account screen pill** | White surface with apricot indicator | Plum surface with apricot-tinted active indicator (the indicator is the apricot-inside-Plum exception in practice) |
| **App.tsx default mode** | `mode="dark"` with per-screen `<ThemeProvider mode="light">` wrappers on every migrated screen | `mode="light"` at the root; per-screen wrappers removed |
| **Wordmark.tsx** | Inter Light, warmWhite default colour | Bricolage 800, Void default colour |
| **GoalSheet / DocumentContextSheet** | Warm-white glass with apricot active rgbas | White surface with Sand hairline + Petal active fill + fuchsia border |

Mentally: v2.0 was the canvas flip (dark→light). v2.1 was the headline + form lock-in. v2.2 is the *insight surface* — adding one deliberate moment of weight back into the editorial composition.
