---
version: alpha
name: Levercast Ink & Paper
description: A calm, editorial ink-and-paper system where a literary serif carries the user's thinking and a quiet sans carries the tool.
colors:
  primary: "#152126"
  on-primary: "#FFFFFF"
  primary-hover: "#24343A"
  secondary: "#F7F7F4"
  on-secondary: "#152126"
  tertiary: "#C7C4F2"
  tertiary-tint: "#EEEDFB"
  accent-strong: "#4B45A8"
  neutral: "#5A6569"
  neutral-on-ink: "#A9B4B8"
  border: "#E3E3DE"
  border-on-ink: "#2E3D43"
  disabled: "#8A9397"
  surface: "#FFFFFF"
  on-surface: "#152126"
  error: "#B3261E"
typography:
  display:
    fontFamily: Newsreader
    fontSize: 72px
    fontWeight: 300
    lineHeight: 1.05
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.3
  statement:
    fontFamily: Newsreader
    fontSize: 30px
    fontWeight: 300
    lineHeight: 1.35
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Newsreader
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.65
  ui-body:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.01em
  eyebrow:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.02em
  caption:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: 0px
  sm: 6px
  md: 10px
  lg: 16px
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  section: 128px
  gutter: 24px
  margin: 32px
  margin-mobile: 20px
  prose-max: 680px
  page-max: 1200px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: 14px 22px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-inverse:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: 14px 22px
  button-inverse-hover:
    backgroundColor: "{colors.tertiary-tint}"
    textColor: "{colors.primary}"
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.on-surface}"
    borderColor: "{colors.border}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: 13px 21px
  button-secondary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-surface}"
  button-disabled:
    backgroundColor: "{colors.border}"
    textColor: "{colors.disabled}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    placeholderColor: "{colors.neutral}"
    borderColor: "{colors.border}"
    typography: "{typography.ui-body}"
    rounded: "{rounded.sm}"
    padding: 13px 14px
  input-field-focus:
    borderColor: "{colors.accent-strong}"
  input-field-error:
    borderColor: "{colors.error}"
    helperColor: "{colors.error}"
  card-feature:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
    padding: 32px
  card-testimonial:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    padding: 40px
  card-floating:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.ui-body}"
    rounded: "{rounded.md}"
    padding: 16px
  eyebrow-label:
    textColor: "{colors.on-surface}"
    typography: "{typography.eyebrow}"
  hero:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.display}"
  focus-ring:
    color: "{colors.accent-strong}"
  focus-ring-on-ink:
    color: "{colors.tertiary}"
---

# Levercast Ink & Paper

Visual identity for Levercast. Pairs with `molten-docs/brand/brand.md` for brand strategy and voice.

## Overview

**Design surface: landing page** (first pass). This system sets up the shared core and the landing page layer. A web product layer will be added in a later pass on top of the same core.

Levercast should feel like a thoughtful writer's tool, not a growth-marketing dashboard. The brand brief calls for an **editorial plus calm** maturity, a **confident** risk posture, and a first impression of *"Finally, someone who gets why I don't post, and this actually sounds like me."* The persona is a skeptical, AI-wary solo consultant, so the visual system avoids every "AI product" cue (neon gradients, glowing orbs, sparkle icons, purple-on-black hype) and every "growth tool" cue (charts, KPIs, rocket ships).

The look is **ink and paper**. A near-black ink hero gives a composed, grown-up opening, then the page moves into warm paper and white sections set in a literary serif. The single idea behind every decision: **serif is the user's voice, sans is the tool.** Headlines, statements, testimonials and post drafts are serif. Buttons, navigation, labels and captions are a small, quiet sans.

On the landing page, the system optimises for one primary action (the founding offer or waitlist sign-up), a calm reading rhythm, and proof shown rather than claimed (a voice note next to the post it became).

## Shared Core

These decisions are stable across every future surface (landing page, web product, and any mobile or desktop pass):

- **Colour philosophy:** high-contrast ink (`#152126`) on paper (`#F7F7F4`) and white (`#FFFFFF`). One soft lavender (`#C7C4F2`) used rarely, as a tint or a highlight, never as body text on light surfaces. One stronger indigo (`#4B45A8`) reserved for focus rings and inline links.
- **Type pairing:** Newsreader (serif) for content and voice; Geist (sans) for interface. No third family.
- **Radius:** small corners on controls (6px), medium on floating cards (10px), larger on content cards and image panels (16px).
- **Spacing:** an 8px base.
- **Depth:** flat by default. Hierarchy comes from tone (ink / paper / white) and borders, with one soft shadow reserved for floating cards.
- **Motion:** slow and quiet (see Motion).
- **Accessibility:** WCAG AA for every text pair, with visible focus rings on both light and ink backgrounds.

## Colors

- **Primary, Deep Ink (#152126):** hero and dark-section backgrounds, primary button fill, and the default text colour on light surfaces. Blue-green near-black, softer than pure black, so it reads as ink rather than tech.
- **Primary hover, Lifted Ink (#24343A):** hover state for ink buttons. White text on it is 12.9:1.
- **Secondary, Paper (#F7F7F4):** warm off-white for alternating sections, testimonial cards and quiet panels. Ink on paper is 15.3:1.
- **Surface, White (#FFFFFF):** main page background between paper sections, card fill, input fill.
- **Tertiary, Soft Lavender (#C7C4F2):** the only colour accent. Use it for small highlights such as the voice-note waveform, a selected state, a focus ring on ink, or a word underline in a headline. Ink on lavender is 9.9:1. **Never** use lavender as text on white or paper.
- **Tertiary tint, Lavender Wash (#EEEDFB):** very light background for a highlighted card or the inverse-button hover.
- **Accent strong, Ink Indigo (#4B45A8):** focus rings and inline text links on light surfaces (7.7:1 on white).
- **Neutral, Slate (#5A6569):** secondary text, captions, helper text and placeholder text (6.0:1 on white, 5.6:1 on paper).
- **Neutral on ink, Mist (#A9B4B8):** secondary text on ink backgrounds (7.8:1).
- **Border, Hairline (#E3E3DE):** 1px dividers, card borders, input borders on light surfaces.
- **Border on ink (#2E3D43):** dividers inside ink sections.
- **Disabled (#8A9397):** disabled text only (exempt from contrast rules; never used for readable text).
- **Error, Brick (#B3261E):** form errors and error helper text (6.5:1 on white).

## Typography

Two families, eleven levels.

- **Headlines: Newsreader** (Google Fonts, variable, optical sizes). `display` is 72px in **light (300)** with −0.02em tracking. The light weight is what keeps a serif calm and modern rather than heavy or academic. Headline levels step down through 48 / 32 / 24px, getting slightly heavier as they get smaller so they stay legible. On mobile (<768px), scale `display` to 44px and `headline-lg` to 34px.
- **Statement: Newsreader 30px light.** A large paragraph that does a headline's job, as in the reference ("● About" on the left, a big statement on the right). Use it once or twice per page for the contrarian thesis, e.g. *"The feed is full of AI slop. Your thinking isn't."* Mobile: 24px.
- **Body: Newsreader 18–20px**, 1.6–1.65 line height, max 680px measure. Landing copy is meant to be *read*, so long-form body stays serif. The 18px minimum keeps the serif comfortable on screen.
- **Interface: Geist** (already loaded in `app/layout.tsx` via `next/font`). `ui-body` (15px) is for form text and floating UI cards. `label-md` (14px, 500) is for buttons and navigation. `eyebrow` (13px, 500) sits next to a 6px ink dot. `caption` (12px) is for timestamps and metadata.
- **Fallback stacks:** Newsreader → `"Iowan Old Style", Georgia, "Times New Roman", serif`. Geist → `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`.
- **Rule of thumb:** if the text is something a person *thinks or says*, it's serif. If it's something the *software* says or does, it's sans.

## Layout

Surface layer: **landing page**.

- **Grid:** 12 columns, 24px gutters, page max width 1200px, 32px side margins (20px on mobile).
- **Prose measure:** 680px maximum for body copy. The statement paragraph may span up to 8 columns.
- **Section rhythm:** 128px vertical padding between sections on desktop, 80px on mobile. Within a section, use 32–64px. Sections alternate **ink → white → paper → white → ink (closing CTA)**.
- **Recurring pattern, label plus statement:** a 3-column left rail holds the dot eyebrow, and a 9-column right area holds the statement or content. This is the page's signature move, taken from the reference.
- **Hero:** ink background, display headline left-aligned (max ~11 words over two lines), one subhead in `body-lg` Mist, one inverse CTA. Below it, a full-width image panel (16px radius) bleeding into the next section, with two floating cards: a **voice-note card** (waveform plus duration) and a **draft-post card** (serif excerpt plus a "Needs your review" state).
- **Single CTA:** the founding-offer or waitlist action is the only primary button on the page. It appears in the hero, after the proof section and in the closing ink section. The secondary action ("Hear an example") is always visually quieter.
- **Imagery:** documentary-style photos of real-looking consultants at a desk, mid-thought or on a walk with earbuds. Natural light, muted colour, no posed boardroom handshakes, no laptop-with-graph shots, no AI-robot imagery.

## Elevation & Depth

Flat. Hierarchy comes from tonal sections (ink / white / paper) and 1px Hairline borders. The **only** shadow is on floating cards over imagery: `0 8px 24px rgba(21, 33, 38, 0.12)`. No glows, no gradients, no glassmorphism.

## Shapes

- **6px (`sm`):** buttons, inputs, tags. Crisp, slightly softened.
- **10px (`md`):** floating cards over imagery.
- **16px (`lg`):** feature cards, testimonial cards, image panels.
- **Full:** only for the eyebrow dot, avatars and the record-button motif.
- Never mix radii inside one component.

## Components

Surface layer: landing page components only.

### Buttons

- **Anatomy:** Geist `label-md` label, optional trailing arrow (→). No leading icons, no sparkles.
- **Variants:**
  - **Primary (ink fill, white text):** on white or paper sections.
  - **Inverse (white fill, ink text):** on ink sections, including the hero and the closing CTA.
  - **Secondary (transparent, Hairline border, ink text):** quieter actions like "Hear an example."
- **States:** default; hover (ink → Lifted Ink, inverse → Lavender Wash, secondary → Paper); focus-visible (2px ring with 2px offset, Ink Indigo on light, Soft Lavender on ink); active (translateY 1px); disabled (Hairline fill, Disabled text, `cursor: not-allowed`).
- **Accessibility:** minimum 44px height, labels are literal verbs from the brand brief ("Record your first idea," "Join the founding group"), and focus rings are never removed.

### Input Fields

Used for the email or founding-offer sign-up form only.

- **Anatomy:** Geist `label-md` label above, a 48px-tall field, and helper or error text in `caption` below.
- **States:** default (Hairline border); focus (Ink Indigo border plus a 3px Lavender Wash outer ring); error (Brick border plus Brick helper text with an explicit message, e.g. "That email doesn't look right. Check for a typo?"); disabled (Paper fill, Disabled text).
- **Inline layout:** on desktop the field and the primary button sit on one row. On mobile they stack, with the button full width.
- **Accessibility:** a visible label is always present (never placeholder-only). Errors are announced via `aria-describedby`.

### Cards

- **Feature card:** white, Hairline border, 16px radius, 32px padding. Dot eyebrow, then `headline-sm` serif heading, then `body-md` serif text. Three across on desktop, stacked on mobile. Use it for the four supporting messages (Just talk / Sounds like you / No slop, no hooks / You're the author).
- **Testimonial card:** Paper fill, 16px radius, 40px padding. The quote is in `body-lg` serif, attribution in Geist `label-md` plus a `caption` role line. Real names and roles only; no star ratings.
- **Floating card:** white, 10px radius, 16px padding, the single permitted shadow. Holds the voice-note or draft-post motifs over hero imagery. Content is in Geist `ui-body`, except the draft excerpt, which is in serif.

### Proof Block: Voice Note → Post

This replaces the reference's stats strip, because the brand brief forbids unproven numbers. It's a two-column comparison. On the left, a voice-note transcript excerpt in Geist on a Lavender Wash panel, labelled "What you said." On the right, the resulting post in serif on white, labelled "What you posted." A thin → between the two. This is the page's main piece of proof.

### Section Header

A dot eyebrow (6px ink circle plus Geist `eyebrow`), then a serif headline (`headline-lg`), then an optional `body-lg` subhead in Slate. Left-aligned. Never centred, except the closing CTA.

### Footer

On ink. Geist `label-md` links in Mist, a `caption` legal line, and one repeat of the inverse CTA.

## Do's and Don'ts

- Do set everything the user *thinks or says* (headlines, statements, testimonials, post drafts) in Newsreader, and everything the *software* does (buttons, nav, labels, form text) in Geist.
- Do show proof as a voice note next to the post it became. Don't use numeric stat strips until there's real evidence.
- Don't use AI visual clichés: gradient blobs, glowing orbs, sparkle or magic-wand icons, robot imagery, or neon purple on black.
- Don't use lavender (`#C7C4F2`) for text on white or paper backgrounds. It's a tint and highlight only.
- Don't put more than one primary (ink or inverse) button in a single viewport. The secondary action is always the outlined variant.

## Motion & Animation

Calm and purposeful. 200ms ease-out for hover and focus. 400–600ms ease-out fade-and-rise (12px) for sections entering the viewport, once only. The voice-note waveform may pulse gently in the hero. No parallax, no typewriter "AI is writing…" effects, no confetti. Respect `prefers-reduced-motion` by disabling all non-essential motion.

## Iconography

Use sparingly. Line icons with a 1.5px stroke, rounded caps, at 20px (e.g. Lucide). Ink on light, white on ink. Use icons for functional meaning only (microphone, check, arrow). Never use decorative or "AI" icons.

## Accessibility

- All text pairs meet WCAG AA. Key ratios: ink/white 16.4, ink/paper 15.3, slate/white 6.0, mist/ink 7.8, indigo/white 7.7, ink/lavender 9.9, brick/white 6.5.
- The focus ring is always visible: 2px, 2px offset, Ink Indigo on light and Soft Lavender on ink.
- Click and tap targets are at least 44×44px.
- Hero text sits on a solid ink background, never over imagery.
- Body text is at least 18px serif on the landing page.
- `prefers-reduced-motion` is respected.

## Open Questions And Assumptions

### Open Questions
- Is the primary CTA a **waitlist** sign-up or a **paid founding offer** (per the validation experiment)? This changes the button label and the form, not the system.
- Will there be a logo or wordmark? For now the system assumes a serif "Levercast" wordmark set in Newsreader 500.
- Photography source: commissioned or real-user photos, or curated stock? This affects how documentary the hero can feel.

### Assumptions
- Design surface: **landing page**. The web product layer will be added in a second **mt-design** pass that inherits this shared core.
- Shared core: newly created in this pass.
- Visual reference: user-selected pin (dark-ink SaaS site) → adopted the ink/paper/white palette, a single soft lavender accent, dot eyebrows, the label-left/statement-right pattern, rounded image panels with floating cards, and a flat, spacious, composed mood. Dropped chart and dashboard widgets and the stats strip (brand conflicts).
- User override: **serif as the typeface**. Newsreader was chosen for content and voice, with Geist retained only for interface text because it's already loaded in `app/layout.tsx` and it keeps small UI text crisp.
- Fast-draft mode: exact hex values, type scale, spacing and radii were inferred by the agent from the reference and `brand.md`.
- Brand maturity (editorial plus calm), risk posture (confident) and trust emphasis (testimonials, transparency, demos) were taken directly from `brand.md`.

### Next Step
Reference `molten-docs/design/design.md` from your agent config (`AGENTS.md`) so it loads every session. Validate with `npx @google/design.md lint molten-docs/design/design.md`. Then run **mt-design** again for the **web product** surface, or **mt-landing** to build the page.
