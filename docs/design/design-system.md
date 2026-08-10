---
design_system: "Material UI (MUI)"
version: "v9"
framework: "React 19 / Next.js App Router"
styling: "Emotion + MUI theme; sx prop only"
status: "root theme tokens implemented from the brand handoff; no screens built against it yet"
---

# Design system — Marn

Material UI is the component layer. It is **not** the visual identity: Marn's identity is dark-first, bone-warm brass and celadon on near-black, set in Petrona (display) and Figtree (UI/body), with an "opening arc" motif (a pivot whose sweep widens as range improves). Everything below exists so that MUI carries Marn's brand rather than Google's.

Source: `Marn wellness brand design system/design_handoff_marn_app/README.md` — high-fidelity, colours/type/space/radius are final; the logo mark is the one open item (reserve a square slot, don't hard-code SVG paths).

**The theme is the only source of tokens.** `theme/theme.ts` is visual truth. A hardcoded hex, font stack, or pixel value in a component is a blocking defect.

This replaces the earlier placeholder "bone-and-ink" palette (ink/clay, Bricolage Grotesque/Instrument Sans/JetBrains Mono) that lived in this doc before the real brand handoff arrived — that palette was never implemented in `theme/theme.ts` at root (only the prototype's own, unrelated bone/ink theme under `prototype/theme/theme.ts` predates all of this and is out of scope for this doc).

## 0. Version note (read before writing any MUI code)

The current major is **MUI v9** (there is no v8 — Material UI jumped v7 → v9 to align majors with MUI X). Two consequences that matter for anything you copy off the internet or remember from older projects:

- **System props are gone.** Style through `sx` only. `<Box mt={2} color="primary.main">` is v7-and-earlier; write `<Box sx={{ mt: 2, color: 'primary.main' }}>`.
- **`Grid2` no longer exists** and neither does the `item` prop. Use `Grid` with `size`: `<Grid size={{ xs: 12, md: 6 }}>`. `GridLegacy` is removed.

Migration codemods: `npx @mui/codemod@latest v9.0.0/system-props <path>`. Docs: https://mui.com/material-ui/migration/upgrade-to-v9/

## 1. Tokens

### Spacing — strict 8px baseline

Every margin, padding, and gap is a multiple of 8, expressed as a theme unit, never a pixel string.

```tsx
<Stack spacing={2} sx={{ p: 3 }} />   // 16px gap, 24px padding
```

Exception: hairline borders and optical adjustments under 8px go through `theme.shape` or a named token, not an inline `'3px'`.

### Colour

Dark-first: brass and celadon on near-black. `theme/theme.ts` defines both a
`dark` colour scheme (the app default) and a `light` one (web/email/print);
components must read colours off the theme (`theme.vars.palette.*` in
`sx`/`styleOverrides`, `palette.*` in plain `sx`), never a literal hex —
switching scheme is a CSS-variable flip, not a re-render.

| Role | Token | Dark | Light | Use |
|---|---|---|---|---|
| Primary | `palette.primary.main` | `#C8A46A` (brass) | `#6E5220` (bronze) | Mark, primary button fill, active tab, focus ring |
| Primary light | `palette.primary.light` | `#DDBB86` | *(derived — not specified for light)* | Primary button hover/press |
| Secondary | `palette.secondary.main` | `#8FCBB8` (celadon) | `#1F6152` | Data highlights, links, "Excellent" band |
| Background default | `palette.background.default` | `#0C1210` | `#EFECE2` | App canvas, nav bar base |
| Background paper | `palette.background.paper` | `#141C19` | `#F9F7F0` | Cards, list rows, modals |
| `palette.surfaceRaised` | custom | `#1D2724` | *(derived — reuses `paper`)* | Chips, segmented controls, nested/selected panels |
| `palette.divider` | line | `#2A3733` | `#DED9C9` | Hairline borders, input outlines |
| `palette.lineStrong` | custom | `#3A4A44` | *(derived — reuses `divider`)* | Border on level-2 (floating) surfaces |
| Text primary | `palette.text.primary` | `#F0EFE9` | `#101614` | Headlines, body, readouts |
| Text secondary | `palette.text.secondary` | `#A6B0AB` | `#5A635E` | Supporting copy, labels |
| `palette.text.muted` | custom | `#7A8781` | *(derived — reuses `secondary`)* | Overlines, metadata, disabled |
| Warning | `palette.warning.main` | MUI default, retuned | — | **Open safety flag** — reserved, never decorative |
| Success | `palette.success.main` | MUI default, retuned | — | Improvement vs. baseline |

**Status bands** — four states on a journey, not a triage, on `palette.band.*` (custom):
`restricted` → `limited` → `optimal` → `excellent`. Nothing in the set is red;
`optimal` (green) sits in the middle, not at the top, so no band reads as an
alarm or an all-clear. Dark values: `#8B9691` / `#A97C42` / `#6FA98D` /
`#8FCBB8`. This is a distinct system from `warning`/`success` above — bands
describe measured range, `warning` is reserved for safety flags only.

The light-mode `surfaceRaised`/`lineStrong`/`text.muted`/`primary.light`
tokens above are **derived**, not specified — the handoff is fully specified
for dark only (light is a swatch list for web/email/print). Replace them with
real values if/when a light-mode surface actually ships.

Rules:

- **Warning is reserved for safety flags.** If it appears anywhere else, a coach learns to ignore it.
- Success/error on a progress chart mean *measured change*, never sentiment. Losing range is not "an error".
- Never introduce a colour outside the palette. Need a new one? Add it to the theme with a name that says what it means, not what it looks like.

### Typography

| Face | Role | Variants |
|---|---|---|
| Petrona (serif) | Display / headings | `h1`–`h3` |
| Figtree (sans) | UI and body | `h4`–`h6`, `body1`, `body2`, `overline`, `button` |

No third, monospace face — the brand has none. Sizes/line-heights/tracking
per role are in `theme/theme.ts`; `h1`–`h3` carry a mobile override at the
`sm` breakpoint per the handoff's mobile scale.

- Body text is `variant="body1"`; quieter metadata is `body2`. Never a native `<h1>` with manual sizing.
- **Every measured number is tabular.** Degrees, centimetres, session counts, deltas — `font-variant-numeric: tabular-nums` is set globally (`MuiCssBaseline` override in `theme/theme.ts`) so a column of readings aligns and a changing value doesn't jitter. This is the one typographic rule that is about correctness, not taste: numbers that shift position while you read them feel unreliable, and this product sells reliability. (Superseded from an earlier draft of this doc that specified a monospace face for this — the real brand handoff has none; tabular figures on Figtree achieve the same non-jitter guarantee.)
- Units are `text.secondary` at a smaller size beside the value, never baked into the same string.

### Shape

`shape.borderRadius: 18` (the handoff's `md`, MUI's default slot — Paper/Card/Dialog). The fuller scale lives as the exported `radii` constant in `theme/theme.ts` (`sm: 12` inputs/chips, `md: 18` default, `lg: 24` sheets/hero cards, `pill: 999` buttons/tags), since MUI's typed `shape` option isn't augmentable beyond `borderRadius`. Nothing in the product is sharper than 12. The "opening arc" motif (a pivot whose sweep widens 40°→250° as range improves) is the only curved *motif*; it isn't a border-radius concern and isn't built yet — it's a component-level asset (progress ring, avatar rim, ripple streak) for whoever builds the first screen that needs it.

### Elevation — three levels, not a shadow scale

Selection is never colour-only — a selected panel moves three things at once (background, border, shadow):

```
level 0 — resting:  background: paper;         border: 1px solid divider;        no shadow
level 1 — selected: background: surfaceRaised;  border: 1px solid brass @ 55%;    inset highlight + brass glow + drop shadow
level 2 — floating: background: surfaceRaised;  border: 1px solid lineStrong;     inset highlight + heavier drop shadow
```

Level 2 is only for things that genuinely float: bottom sheets, menus, the booking bar. Not encoded as a theme token yet (no component consumes it) — exact shadow strings are in the handoff README pending the first component that needs them.

### Ambient wash — screen-level, not global

Every screen carries one soft radial gradient leaking from the top edge,
tinted per active tab (brass/celadon/jade), fading out by about a quarter of
the screen height; atmosphere only, nothing readable sits on it. This is a
per-screen concern tied to tab state, not a global canvas texture — **not
implemented in `theme/theme.ts`**, since no tab shell exists yet at root.
Gradient values are in the handoff README for whoever builds it.

## 2. Layout

- `<Container>` for page-level max width.
- `<Stack>` for one-dimensional lists — it is the default; the `spacing` prop is how vertical rhythm stays consistent.
- `<Grid size={{ ... }}>` for genuine two-dimensional layouts only.
- `<Box>` for structural blocks.
- `<Paper>` for surfaces that sit above the canvas, `variant="outlined"` at rest (level 0 — border only, no shadow). Reach for a real `boxShadow` only for selected (level 1) or floating (level 2) surfaces per the Elevation tokens above — never as a default card treatment.
- Dense multi-field forms (session log, ROM capture, add-coach) use `<TextField size="small">`; a single prominent form (Gate signup) stays default size. Keep this consistent across `Coach.tsx`/`Admin.tsx` — they share the same form patterns and have drifted before.

## 3. Components

Use MUI, never the native equivalent, and never a re-implementation:

- **Buttons** — `contained` primary, `outlined` secondary, `text` tertiary. One contained button per view.
- **Inputs** — always `<TextField variant="outlined">` with an explicit label. Never a bare `<input>`.
- **Feedback** — `<Alert severity>` inline, `<Snackbar>` for transient confirmation. An error tells the person what happened and what to do; it doesn't apologise.
- **Tables** — `<Table>` / `<TableHead>` / `<TableBody>` / `<TableCell>`; numeric cells `align="right"`, tabular figures (inherited from the global `tabular-nums` rule).
- **Status** — `<Chip>` for flags and states, colour from the palette role, label in plain words ("Awaiting PAR-Q", not "PARQ_PENDING").
- **Icons** — `@mui/icons-material` only. No inline SVG paths for UI icons, no emoji. The opening-arc motif is a brand asset in `«components/brand»`, not an icon.
- **Charts** — `@mui/x-charts` (v9, pairs with Material UI v9) for the progress curve. Provenance is visible: a point measured by device and a point entered by hand do not look identical.

## 4. Code rules

1. **`sx` only.** No imported CSS files (beyond the global reset and font variables), no inline `style={{}}`, no system props.
2. **Reference the theme**, don't restate it: `sx={{ color: 'text.secondary' }}`, or a callback when you need computation: `sx={{ borderColor: (t) => t.palette.divider }}`.
3. **Components at module scope.** A sub-view defined inside its parent gets a new identity every render, remounts, and drops form state — which means a background refresh wipes a coach's half-written session notes. Define it at module scope; lift the form state to the parent that survives revalidation.
4. **RTL-ready from the first line.** Use logical properties in `sx` — `marginInlineStart`, `paddingInlineEnd`, `textAlign: 'start'` — never `ml`/`mr`/`left`/`right`. No user-facing string literals in components. Arabic must be a config flip.
5. **Client boundaries are deliberate.** MUI components that need interactivity live in `'use client'` leaves; pages and data fetching stay server components. Don't mark a whole route client to use one `<Button>`.
6. **States are part of the component.** Loading, empty, and error render paths ship with the happy path, not after it.

## 5. Setup reference

Install and providers: see `SETUP.md` at the repo root. In short: `@mui/material @mui/material-nextjs @emotion/react @emotion/styled @mui/icons-material`, `AppRouterCacheProvider` from `@mui/material-nextjs/v15-appRouter` wrapping `<body>`, `ThemeProvider` with `theme/theme.ts`, fonts through `next/font` exposed as CSS variables.
