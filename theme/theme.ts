'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Marn brand theme.
 *
 * Tokens sourced from `Marn wellness brand design system/design_handoff_marn_app/README.md`
 * (high-fidelity, colours/type/space/radius final; logo mark still pending).
 * Dark is the app's default scheme; light is kept for web/email/print per the
 * handoff, with the few tokens it doesn't specify (surfaceRaised, lineStrong,
 * textMuted, primaryHover) derived rather than invented from scratch.
 *
 * `direction: 'ltr'` today; Arabic RTL is a configuration flip per CLAUDE.md,
 * so components must use logical properties (marginInlineStart, not ml) from
 * the start rather than retrofitting later.
 */

declare module '@mui/material/styles' {
  interface Palette {
    surfaceRaised: string;
    lineStrong: string;
    band: { restricted: string; limited: string; optimal: string; excellent: string };
  }
  interface PaletteOptions {
    surfaceRaised?: string;
    lineStrong?: string;
    band?: { restricted: string; limited: string; optimal: string; excellent: string };
  }
  interface TypeText {
    muted: string;
  }
}

const petrona = 'var(--font-petrona), serif';
const figtree = 'var(--font-figtree), sans-serif';

// Radius scale from the handoff. `shape.borderRadius` (MUI's own typed slot,
// used by Paper/Card/Dialog by default) carries `md`; the rest are plain
// constants — MUI's `Shape` type isn't augmentable from a public import path.
export const radii = { sm: 12, md: 18, lg: 24, pill: 999 };

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' },
  defaultColorScheme: 'dark',
  direction: 'ltr',
  shape: { borderRadius: radii.md },
  colorSchemes: {
    dark: {
      palette: {
        background: { default: '#0C1210', paper: '#141C19' },
        surfaceRaised: '#1D2724',
        divider: '#2A3733',
        lineStrong: '#3A4A44',
        text: { primary: '#F0EFE9', secondary: '#A6B0AB', muted: '#7A8781' },
        primary: { main: '#C8A46A', light: '#DDBB86', contrastText: '#0C1210' },
        secondary: { main: '#8FCBB8' },
        band: { restricted: '#8B9691', limited: '#A97C42', optimal: '#6FA98D', excellent: '#8FCBB8' },
      },
    },
    light: {
      palette: {
        background: { default: '#EFECE2', paper: '#F9F7F0' },
        // Not specified by the handoff (dark is the fully-specified scheme) —
        // reused from the nearest given token rather than invented.
        surfaceRaised: '#F9F7F0',
        divider: '#DED9C9',
        lineStrong: '#DED9C9',
        text: { primary: '#101614', secondary: '#5A635E', muted: '#5A635E' },
        primary: { main: '#6E5220', contrastText: '#F9F7F0' },
        secondary: { main: '#1F6152' },
        band: { restricted: '#5C6663', limited: '#6B4C1C', optimal: '#245A46', excellent: '#1F6152' },
      },
    },
  },
  typography: {
    fontFamily: figtree,
    h1: { fontFamily: petrona, fontWeight: 400, fontSize: '4rem', lineHeight: 66 / 64, letterSpacing: '-0.02em', '@media (max-width:600px)': { fontSize: '2.5rem', lineHeight: 44 / 40 } },
    h2: { fontFamily: petrona, fontWeight: 400, fontSize: '2.75rem', lineHeight: 50 / 44, letterSpacing: '-0.015em', '@media (max-width:600px)': { fontSize: '2rem', lineHeight: 38 / 32 } },
    h3: { fontFamily: petrona, fontWeight: 400, fontSize: '1.875rem', lineHeight: 38 / 30, letterSpacing: '0em', '@media (max-width:600px)': { fontSize: '1.625rem', lineHeight: 32 / 26 } },
    h4: { fontFamily: figtree, fontWeight: 600, fontSize: '1.375rem', lineHeight: 28 / 22, letterSpacing: '-0.01em' },
    h5: { fontFamily: figtree, fontWeight: 600, fontSize: '1.125rem', lineHeight: 24 / 18 },
    h6: { fontFamily: figtree, fontWeight: 600, fontSize: '1rem', lineHeight: 22 / 16 },
    body1: { fontFamily: figtree, fontWeight: 400, fontSize: '1rem', lineHeight: 26 / 16 },
    body2: { fontFamily: figtree, fontWeight: 400, fontSize: '0.875rem', lineHeight: 22 / 14 },
    overline: { fontFamily: figtree, fontWeight: 600, fontSize: '0.6875rem', lineHeight: 14 / 11, letterSpacing: '0.16em' },
    button: { fontFamily: figtree, fontWeight: 600, fontSize: '0.9375rem', textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        // "Numerals — Figtree 600 with font-variant-numeric: tabular-nums set
        // globally" — the brand has no monospace face; tabular figures alone
        // keep a changing measured value from jittering or misaligning.
        html: { fontVariantNumeric: 'tabular-nums' },
        '*:focus-visible': {
          outline: `2px solid ${theme.vars.palette.primary.main}`,
          outlineOffset: '2px',
        },
      }),
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme, ownerState }) => ({
          borderRadius: radii.pill,
          ...(ownerState.variant === 'contained' &&
            ownerState.color === 'primary' && {
              '&:hover': { backgroundColor: theme.vars.palette.primary.light },
            }),
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: radii.sm },
      },
    },
  },
});

export default theme;
