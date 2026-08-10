---
design_system: "Material UI (MUI)"
version: "v6"
framework: "React"
tokens:
  colors:
    primary:
      main: "#2196f3"
      light: "#64b5f6"
      dark: "#0b79d0"
      contrastText: "#ffffff"
    secondary:
      main: "#9c27b0"
      light: "#ba68c8"
      dark: "#7b1fa2"
      contrastText: "#ffffff"
    background:
      default: "#f5f5f5"
      paper: "#ffffff"
    text:
      primary: "rgba(0, 0, 0, 0.87)"
      secondary: "rgba(0, 0, 0, 0.6)"
  typography:
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif"
    htmlFontSize: 16
    fontSize: 14
  spacing:
    base: 8
  shape:
    borderRadius: 4
---

# Design System Guidelines (Material UI)

This document instructs the AI on the explicit design rules, tokens, and components required to build user interfaces using Material UI (MUI). Always adhere to these specifications.

## 1. Visual Styles & Tokens

### Spacing Rule
* **Strict 8px Baseline**: Every margin, padding, and layout gap must use increments of 8px.
* **Implementation**: Utilize the `sx` prop with numeric values (e.g., `sx={{ p: 2 }}` equals 16px, `sx={{ gap: 1 }}` equals 8px). Avoid hardcoded pixel strings.

### Color Palette
* **Primary (Brand Focus)**: Main `#2196f3`. Use for main call-to-actions, active navigation states, and primary buttons.
* **Secondary (Accents)**: Main `#9c27b0`. Use sparingly for highlights, secondary controls, and badges.
* **Surfaces**: Use `<Paper>` for card/modal backgrounds (`#ffffff`) and standard backgrounds for layout containers (`#f5f5f5`).

### Typography Scale
* **Headings**: Use `variant="h1"` through `variant="h6"`. Do not use native `<h1>` tags with manual sizing.
* **Body Text**: Default text must use `variant="body1"`. Secondary, quieter captions must use `variant="body2"`.

## 2. Layout & Surfaces

* **Global Layouts**: Wrap pages in `<Container>` to handle responsive max-widths gracefully.
* **Flexbox & Layout Flow**: Prefer the `<Box>` component for quick structural blocks and flexible layouts.
* **Alignment**: Use the `<Stack>` component for one-dimensional layouts (vertical or horizontal lists) to enforce consistent spacing via the `spacing` prop.
* **Grid Arrangements**: Use `<Grid2>` (or modern `<Grid>`) for multi-column, responsive grid structures.

## 3. Core Component Mappings

When generating UI, rely on built-in MUI components instead of native HTML equivalents:

* **Buttons**: Use `<Button variant="contained">` for primary actions, `<Button variant="outlined">` for secondary actions, and `<Button variant="text">` for tertiary options.
* **Form Inputs**: Always wrap inputs in a `<TextField>` with explicit labels and `variant="outlined"` by default.
* **Feedback Utilities**: Display temporary notifications via `<Snackbar>` and context-aware feedback with `<Alert severity="success|info|warning|error">`.
* **Data Presentation**: Format complex tables with `<Table>`, `<TableHead>`, `<TableBody>`, and `<TableCell>`.

## 4. Code Generation Rules for AI

1. **sx Prop Dominance**: Apply custom layouts, colors, and margins exclusively via the `sx` prop or styled components. Do not import raw CSS files or use inline style objects.
2. **Icons**: Import visual anchors from `@mui/icons-material` (e.g., `import PlayArrowIcon from '@mui/icons-material/PlayArrow'`). Do not use SVG paths or emojis.
3. **Theming Reference**: Access values directly from the theme instance using theme callback functions inside the `sx` prop when necessary: `sx={{ color: (theme) => theme.palette.primary.main }}`.
