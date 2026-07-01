---
name: Noel Sebastian Portfolio
description: Senior Web Engineer & Angular Specialist portfolio — bold, technical, warm.
colors:
  cream: "#F3F0E8"
  ink: "#16150F"
  ink-secondary: "#413D34"
  accent: "#FF4B54"
  yellow: "#FFC01E"
  muted-1: "#6B675C"
  muted-2: "#8A867B"
  muted-3: "#9A968B"
  sand: "#C9C5BA"
  surface: "#FFFFFF"
typography:
  display:
    fontFamily: "'Bricolage Grotesque', serif"
    fontSize: "clamp(38px, 6.2vw, 82px)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Bricolage Grotesque', serif"
    fontSize: "clamp(34px, 4.6vw, 60px)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  title:
    fontFamily: "'Bricolage Grotesque', serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "'Space Mono', monospace"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.1em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "20px"
  full: "9999px"
spacing:
  section-y: "clamp(64px, 8vw, 120px)"
  container: "1200px"
  gutter: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "16px 28px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "16px 28px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.full}"
    padding: "14px 22px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "30px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.full}"
    padding: "7px 13px"
  input:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
---

# Design System: Noel Sebastian

## 1. Overview

**Creative North Star: "The Technical Letterpress"**

This portfolio reads like a well-printed specimen sheet: bold grotesque type locked onto warm paper, engineered layouts, and the quiet confidence of someone who measures margins. The design is brand-first — the visitor's impression is the product. It rejects the cold SaaS dashboard, the generic template portfolio, and the loud startup illustration kit in favor of a surface that feels made by hand at large scale.

The system is built on contrast: warm cream against near-black ink, a single signal red for action, and a grotesque display face that carries engineering authority. Motion is present but disciplined — lifts, reveals, and a rotating badge that reward attention without demanding it.

**Key Characteristics:**
- Warm neutral ground with high-contrast ink and one signal accent
- Grotesque display type set tight and uppercase for engineering confidence
- Monospace used as a label voice, never a body costume
- Pill buttons and bordered cards; tactile hover lifts
- Long scroll with single-purpose, numbered sections
- Frosted sticky navigation that floats above the content

## 2. Colors

Palette character: warm studio surfaces with near-black typography and a builder's signal palette.

### Primary
- **Builder's Chalk / Signal Red** (`#FF4B54`): CTAs, active states, skill-level highlights, section kickers, text selection, the logo dot. The accent that demands attention.
- **Near-Black Espresso** (`#16150F`): Primary text, dark sections (process, testimonials, footer), primary borders, the wordmark.

### Secondary
- **High-Visibility Tape / Yellow** (`#FFC01E`): Dark-section highlights, process kicker, footer link hover, marquee accent strip, the hero monogram panel background. Used sparingly as a spot color.

### Neutral
- **Warm Studio Wall / Cream** (`#F3F0E8`): Page background, form field backgrounds, light-section surfaces.
- **Wet Charcoal / Ink Secondary** (`#413D34`): Secondary body text, descriptions.
- **Muted-1** (`#6B675C`): Tertiary text, card role descriptions.
- **Muted-2** (`#8A867B`): Footer meta text, subtle captions.
- **Muted-3** (`#9A968B`): Micro-labels, placeholders.
- **Sand** (`#C9C5BA`): Footer links on dark, quiet separators.

### Surface
- **Pure White** (`#FFFFFF`): Cards, elevated surfaces, the contact form container.

### Named Rules
**The One Signal Rule.** Red is the only accent that calls for action. Yellow is a spot color, not a second accent.

**The Warm Ground Rule.** Backgrounds are cream or ink; never a cold gray.

## 3. Typography

**Display Font:** Bricolage Grotesque (opsz 12–96, weights 600–800)  
**Body Font:** Manrope (weights 400–700)  
**Label / Mono Font:** Space Mono (weights 400, 700)

**Character:** A grotesque display face gives the headlines engineering confidence; Manrope keeps body copy warm and readable; Space Mono handles labels and metadata with a technical cadence. The pairing is contrast-driven: display against body, grotesque against humanist sans.

### Hierarchy
- **Display** (800, clamp(38px, 6.2vw, 82px), line-height 0.92, tracking -0.04em to -0.018em): Hero headline only.
- **Headline** (800, clamp(34px, 4.6vw, 60px), line-height 0.95, tracking -0.03em to -0.017em): Section H2s.
- **Title** (700, 20–26px, line-height 1.1): Card headings, service titles, gallery expanded titles.
- **Body** (400, 15–17px, line-height 1.6–1.7): Paragraphs, card descriptions. Keep line length around 65ch for long prose; current containers run shorter for impact.
- **Label** (700, 10.5–12.5px, uppercase, letter-spacing 0.08–0.17em): Section numbers, field labels, tags, metadata.

### Named Rules
**The Tight-But-Touchless Rule.** Display tracking never goes below -0.04em; headlines never below -0.03em. Letters stay close but never collide.

**The Caps-Are-Labels Rule.** Uppercase is reserved for short labels and display headings, never body copy.

## 4. Elevation

Tactile layers. Most surfaces sit slightly above the warm cream ground with soft, diffused shadows. The hero panel deliberately breaks this convention with a hard 14px offset shadow, giving it the feel of a pinned poster or a letterpress block.

### Shadow Vocabulary
- **Card hover:** `0 18px 38px rgba(22,21,15,0.09)` to `0 20px 40px rgba(22,21,15,0.1)`
- **Contact form:** `0 24px 48px rgba(22,21,15,0.07)`
- **Hero panel:** `14px 14px 0 rgba(22,21,15,0.9)` (hard offset, signature)
- **Rotating badge:** `0 10px 24px rgba(22,21,15,0.25)`

### Named Rules
**The Lift-On-Hover Rule.** Cards and buttons lift on hover; shadows are the response, not the default.

**The One-Hard-Shadow Rule.** Only the hero panel uses a hard offset shadow. Every other shadow is diffuse.

## 5. Components

Component philosophy: **Pill-forward and tactile.** Rounded CTAs and chips invite interaction; cards lift on hover; forms feel solid and respond with a border-color shift.

### Buttons
- **Shape:** Pill (`border-radius: 9999px`).
- **Primary:** Signal Red background (`#FF4B54`), white text, 16px bold, px-7 py-4. Hover lifts `-3px` and shifts background to ink.
- **Secondary:** Transparent background, 2px ink border, ink text. Hover fills with ink, text becomes cream, lifts.
- **Ink / Dark:** Ink background, cream text. Hover lifts.
- **Transition:** 200ms ease, transform + background + color.

### Cards
- **Corner Style:** 18–20px radius.
- **Background:** White (`#FFFFFF`).
- **Border:** 1.5px solid ink at 12% opacity.
- **Shadow:** None at rest; hover lifts with `0 18–20px` shadow at 9–10% ink opacity.
- **Internal Padding:** 24–30px.

### Chips / Tags
- **Shape:** Pill (`border-radius: 9999px`).
- **Background:** White or transparent.
- **Border:** 1–1.5px ink at 12–16% opacity.
- **Text:** Mono 11–11.5px, ink-secondary.
- **Use:** Hero capability chips, case-study tags.

### Inputs / Fields
- **Shape:** 12px radius.
- **Background:** Cream (`#F3F0E8`).
- **Border:** 1.5px ink at 18% opacity.
- **Focus:** Border shifts to accent.
- **Labels:** Mono 11px uppercase, muted-1.
- **Error text:** Accent red, 12.5px.

### Navigation
- **Position:** Sticky top bar with frosted cream background (`backdrop-filter: blur(10px)`, cream at 82% opacity).
- **Logo:** Bricolage 22px extrabold, ink with accent dot.
- **Links:** Mono 12.5px uppercase, ink-secondary, hover to accent.
- **CTA:** Pill primary button.
- **Mobile:** Hamburger reveals a stacked cream drawer.

### Signature Component: Hero Monogram Panel
- Yellow (`#FFC01E`) background with 2px ink border and hard 14px offset shadow.
- Concentric ink rings, monogram "NS" in Bricolage, orbiting accent dot, floating mono chips, rotating badge.
- This is the brand's distinctive engineered-craft mark.

## 6. Do's and Don'ts

### Do
- **Do** set display type in Bricolage Grotesque 800, tight but never below `-0.04em`.
- **Do** use cream (`#F3F0E8`) as the light ground and ink (`#16150F`) for dark sections.
- **Do** use Signal Red (`#FF4B54`) for CTAs, active states, and section kickers.
- **Do** keep body copy in Manrope at 15–17px with line-height 1.6–1.7.
- **Do** use Space Mono uppercase labels for metadata, tags, and field labels.
- **Do** lift cards and buttons on hover with a soft shadow.
- **Do** respect `prefers-reduced-motion` for all animations.

### Don't
- **Don't** use corporate navy-and-gold SaaS minimalism.
- **Don't** build generic template portfolios with identical icon + heading + text card grids.
- **Don't** use loud startup illustration kits.
- **Don't** drift into editorial-magazine aesthetics unless the content truly is editorial.
- **Don't** use monospace for long body copy; it's a label voice only.
- **Don't** add tiny uppercase tracked eyebrows above every section unless it's a deliberate, named brand system.
- **Don't** let text overflow its container at any breakpoint.
