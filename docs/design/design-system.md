---
design_system: "Material UI (MUI)"
version: "v9"
framework: "React 19 / Next.js App Router"
styling: "Emotion + MUI theme; sx prop only"
status: "palette hex values are PROPOSED — replace with the prototype's brand tokens before this doc is law"
---

# Design system — Marn

Material UI is the component layer. It is **not** the visual identity: Marn's identity is bone-and-ink with goniometer-arc geometry, set in Bricolage Grotesque, Instrument Sans, and JetBrains Mono. Everything below exists so that MUI carries Marn's brand rather than Google's.

**The theme is the only source of tokens.** `theme/theme.ts` is visual truth. A hardcoded hex, font stack, or pixel value in a component is a blocking defect.

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

Bone-and-ink, not Material blue. Ink is the primary — buttons, active states, and emphasis are near-black on bone, with a single warm accent used sparingly.

| Role | Token | Value | Use |
|---|---|---|---|
| Primary | `palette.primary.main` | `«#16130F»` (ink) | Primary actions, active nav, emphasis |
| Primary light/dark | `.light` / `.dark` | `«#3A342D»` / `«#000000»` | Hover and pressed states only |
| Secondary | `palette.secondary.main` | `«#B4653C»` (clay) | The accent — arcs, progress highlights, one CTA per screen |
| Background default | `palette.background.default` | `«#F5F1E8»` (bone) | Page canvas |
| Background paper | `palette.background.paper` | `«#FFFFFF»` | Cards, sheets, dialogs |
| Text primary | `palette.text.primary` | `«rgba(22,19,15,0.92)»` | Body copy |
| Text secondary | `palette.text.secondary` | `«rgba(22,19,15,0.60)»` | Labels, captions, metadata |
| Warning | `palette.warning.main` | MUI default, retuned | **Open safety flag** — reserved, never decorative |
| Success | `palette.success.main` | MUI default, retuned | Improvement vs. baseline |

Rules:

- **Warning is reserved for safety flags.** If it appears anywhere else, a coach learns to ignore it.
- Success/error on a progress chart mean *measured change*, never sentiment. Losing range is not "an error".
- Never introduce a colour outside the palette. Need a new one? Add it to the theme with a name that says what it means, not what it looks like.

### Typography

| Face | Role | Variants |
|---|---|---|
| Bricolage Grotesque | Display / headings | `h1`–`h4` |
| Instrument Sans | UI and body | `h5`, `h6`, `subtitle*`, `body1`, `body2`, `button` |
| JetBrains Mono | **Measured values** | `overline`, and the `readout` variant |

- Body text is `variant="body1"`; quieter metadata is `body2`. Never a native `<h1>` with manual sizing.
- **Every measured number is mono.** Degrees, centimetres, session counts, deltas — they render in JetBrains Mono with tabular figures so a column of readings aligns and a changing value doesn't jitter. This is the one typographic rule that is about correctness, not taste: numbers that shift position while you read them feel unreliable, and this product sells reliability.
- Units are `text.secondary` at a smaller size beside the value, never baked into the same string.

### Shape

`shape.borderRadius: 8`. Cards and inputs share it. The goniometer arc is the only curved motif; nothing else gets a pill radius.

### Canvas texture — not the same thing as elevation

Cards never get a shadow (see §2 below) — but a flat card needs *something*
behind it or the page reads as boxy. `theme/theme.ts`'s `MuiCssBaseline`
override puts a subtle repeating-grid + radial lime glow on `<body>` (the
same pattern the pre-MUI prototype had). Depth lives in the canvas, never on
the card. Don't reach for a `boxShadow` to fix a page that looks flat — fix
the background behind it instead.

## 2. Layout

- `<Container>` for page-level max width.
- `<Stack>` for one-dimensional lists — it is the default; the `spacing` prop is how vertical rhythm stays consistent.
- `<Grid size={{ ... }}>` for genuine two-dimensional layouts only.
- `<Box>` for structural blocks.
- `<Paper>` for surfaces that sit above the canvas. Prefer `variant="outlined"` over elevation — bone-and-ink is a flat, printed language; drop shadows read as Material, not Marn.
- Dense multi-field forms (session log, ROM capture, add-coach) use `<TextField size="small">`; a single prominent form (Gate signup) stays default size. Keep this consistent across `Coach.tsx`/`Admin.tsx` — they share the same form patterns and have drifted before.

## 3. Components

Use MUI, never the native equivalent, and never a re-implementation:

- **Buttons** — `contained` primary, `outlined` secondary, `text` tertiary. One contained button per view.
- **Inputs** — always `<TextField variant="outlined">` with an explicit label. Never a bare `<input>`.
- **Feedback** — `<Alert severity>` inline, `<Snackbar>` for transient confirmation. An error tells the person what happened and what to do; it doesn't apologise.
- **Tables** — `<Table>` / `<TableHead>` / `<TableBody>` / `<TableCell>`; numeric cells `align="right"` in mono.
- **Status** — `<Chip>` for flags and states, colour from the palette role, label in plain words ("Awaiting PAR-Q", not "PARQ_PENDING").
- **Icons** — `@mui/icons-material` only. No inline SVG paths for UI icons, no emoji. The goniometer arc is a brand asset in `«components/brand»`, not an icon.
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
