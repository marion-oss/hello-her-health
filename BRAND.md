# Anoqi Brand System

The brand canon. **What** the visual identity is, **what** rules govern it, and **where** each token lives in code.

Companion to [`HANDOVER.md`](./HANDOVER.md) (architecture) and [`RUNBOOK.md`](./RUNBOOK.md) (operations). If those tell you the system, this tells you how it should *feel*.

> **Version:** 2.0 — Light theme rebrand. Supersedes the v1.0 Sanctuary dark palette. See [§9 What changed from Sanctuary](#9-what-changed-from-sanctuary) for the migration.

---

## 1. The brand in one paragraph

Anoqi is a women's-health AI companion. The brand is **confident, readable, and joyful** — not soft, not clinical, not maximalist. It earns trust through restraint: white space, dark type, a single accent colour used with discipline. Where other health products lean either austere (medical blue, sans-serif greys) or saccharine (lavender gradients, hand-lettered scripts), Anoqi sits between: serious copy, big serif-adjacent display weight, **fuchsia as the only chromatic signal**, apricot as a single decorative gesture. The product looks like it was made by someone who took the design seriously without taking themselves seriously.

---

## 2. Palette

Seven tokens. Every rule about what colours can go where is encoded as a "Allowed" / "Never" pair — break those rules and the brand drifts.

### 2.1 The seven

| Token | Hex | Role |
|---|---|---|
| **Void** | `#0D0D12` | Headlines (non-accent), body copy, structure, button text on light fills |
| **White** | `#FFFFFF` | Canvas. Always. The product breathes on white. |
| **Fuchsia** | `#FF0472` | Signal: accent headline lines, primary CTAs, the dot, the pip, active states |
| **Soft Apricot** | `#FDBA74` | Decoration only — radial gradient bloom in hero / empty-state moments |
| **Warm Gray** | `#3A3040` | Secondary copy: subtitles, captions, body that should recede |
| **Petal** | `#FEF0F4` | Subtle warmth: pill backgrounds, status surfaces, card tints |
| **Sand** | `#E8E0D8` | Quiet structure: secondary button outlines, hairline dividers |

### 2.2 Rules per token

**Void** `#0D0D12`
- Allowed: headlines (non-accent words), body copy, primary text on white, icon strokes
- Never: backgrounds. The canvas is white. Inverting to dark mode requires an explicit redesign, not a token swap.

**Fuchsia** `#FF0472`
- Allowed: accent words in headlines, primary CTAs (fill + text-on-fill), the wordmark dot, the form dot, eyebrow text, pill pips, focus rings, active-state indicators
- Never: body copy, large surfaces (the brand fails if fuchsia covers > ~12% of a screen), borders on tertiary UI, hover states for non-pressables

**Soft Apricot** `#FDBA74`
- Allowed: radial-gradient bloom in hero compositions, empty-state warmth, decorative blobs behind primary content
- Never: text (any size, any context), button fills, button borders, line art, icon fills, status colour

**Warm Gray** `#3A3040`
- Allowed: subtitles, body copy when full Void would be too heavy, captions, helper text, form labels
- Never: headlines, buttons, backgrounds

**Petal** `#FEF0F4`
- Allowed: pill backgrounds, soft card tints, status surfaces (e.g. live / in-review pill bgs), hover backgrounds for tertiary actions
- Never: text colour, button fill (primary OR secondary), strong containers

**Sand** `#E8E0D8`
- Allowed: secondary button outlines (1.5px stroke), divider rules, very-subtle hairlines
- Never: text, fills, focus rings

### 2.3 Coverage targets per screen

If you measure a screen and one of these is wildly outside its band, you're drifting:

| Surface | % of viewport |
|---|---|
| White (canvas) | 65–85% |
| Void (type + structure) | 8–18% |
| Petal + Sand combined | 5–12% |
| Fuchsia (accent + CTA) | 2–8% |
| Soft Apricot (decoration) | 0–15% (one moment per screen, not every screen) |
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

**Two-tone block, horizontal split.** A four-line headline breaks into two halves: top half Void, bottom half Fuchsia. The split is visual, not grammatical — it lands on the line break, not on the sentence boundary.

The canonical hero:

```
Mieux                      ← Void
informée.                  ← Void
Mieux                      ← Fuchsia
entendue.                  ← Fuchsia
```

For shorter headlines (two lines), promote a single fuchsia word:

```
Mieux informée. Mieux entendue.      ← all Void
                ───────────────
                only "entendue." in Fuchsia
```

Never:
- All-fuchsia headline (it stops being a signal)
- Diagonal stripe alternation (Mieux/informée./Mieux/entendue. each a different colour — feels arbitrary)
- Italic display (we use weight to land, not slant)
- Cormorant Garamond or any serif italic (deprecated from v1.0 Sanctuary)

### 3.4 Body copy

Body copy is **Inter 300, 13px, line-height 1.75**, colour Warm Gray `#3A3040`. The 1.75 leading is non-negotiable — it's the breathing room that makes serious copy feel approachable. Tight body copy is the single fastest way to make the product feel clinical or aggressive.

For the rare moment when body copy needs to land harder (a single declarative sentence, a callout), step up to Void `#0D0D12` while keeping Inter 300 — switching to a heavier weight reads as alarm.

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
- Never on a non-white background. If you need to use it on dark, use a different mark (TBD — out of scope for v2.0).

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

Just White. The product breathes on white. The only "background colour" beyond white is the apricot bloom in hero moments and Petal in pill / card tints.

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

Where each token + rule should land in the codebase.

| File | What gets updated |
|---|---|
| `app/theme/colors.ts` | Replace Sanctuary palette with the 7 tokens in §2.1. Remove ember, dusk, burgundy, surface, warmWhite. |
| `app/theme/typography.ts` | Bricolage Grotesque as `fontFamily.display`, Inter as `fontFamily.regular`, JetBrains as `fontFamily.mono`. Sizes from §3.2. Remove Cormorant. |
| `app/theme/radii.ts` | Update `lg` to 14, keep the rest. |
| `app/theme/spacing.ts` | No change (already 4px base). |
| `app/theme/motion.ts` | Add `dotBreath` easing. Update `press` token = 160ms / outQuart. |
| `app/components/Wordmark.tsx` | Update to Bricolage 800 + 7px-at-20 dot proportion. |
| `app/components/Button.tsx` | Primary = fuchsia/white/Bricolage-500/radius-14. Secondary = white/void/Inter-400/1.5-Sand-border/radius-14. Remove ghost / ghostDanger variants until they're redesigned for the light canvas. |
| `app/components/Pill.tsx` | Background Petal, fuchsia pip, void Inter-400 text. Status variants TBD (see §10). |
| `app/components/BreathingForm.tsx` | **Delete this component.** Replace usage with the new `Bloom` component (see §10). |
| `app/components/LiquidEmber.tsx` | **Delete.** Ember is gone. |
| `app/components/PeonyBloom.tsx` | **Delete.** Was a v1.0 brand mark, no longer used. |
| `app/components/Markdown/Markdown.tsx` | Update accent colour from ember to fuchsia for inline `[Sn]` citations. |
| `app/screens/onboarding/WelcomeScreen.tsx` | Adopt the new hero composition exactly per the mockup HTML. |

A separate PR per concern is fine. Token + typography first, components second, screens third.

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
| **Secondary buttons** | Dusk-bordered ghost | Sand-bordered outline |
| **Headline italics** | Italic by default | Upright always |
| **Headline rhythm** | Single accent word | Two-tone horizontal split |

Mentally: the brand went from "intimate dark sanctuary" to "confident bright editorial." The voice is the same — direct, French, women-first — but the visual register is now louder and lighter.

---

## 10. Open questions (out of scope for v2.0)

Things the new system needs but doesn't yet specify. Each is a separate task.

1. **Status pill colour theory.** v1.0 had draft / inReview / approved / live / archived each with a colour. Those mapped to dark surfaces and don't translate. Need: five status colours that work as Petal-family tints on white.
2. **Markdown accents.** Inline `[Sn]` citations, code fragments, bold, em — all need a re-derivation against white.
3. **Dark-mode contingency.** If iOS users force dark mode at the OS level, the brand currently breaks. Decision: keep white-only with a system override (`color-scheme: light`), or design a v2.0-faithful dark variant.
4. **Logo on non-white surfaces.** Press, partner docs, third-party embeds. Out of scope here but will need a brand-asset pack.
5. **The Bloom component.** This doc describes the visual; a `Bloom.tsx` component should replace BreathingForm with the new geometry. Could be one component with props for size + position + intensity.
6. **Physician portal alignment.** The portal currently follows v1.0 Sanctuary. Needs its own migration plan against this spec.

Pick these up in order as the rebrand rolls into more surfaces.
