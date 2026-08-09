'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Marn theme — bone and ink.
 *
 * This file is visual truth. Every colour, font, radius, and spacing step used
 * anywhere in the app resolves here. Hardcoding a value in a component is a defect.
 *
 * Palette reconciled against the prototype's real tokens (former app/globals.css
 * :root block): bone #E7E4DB, ink #10130E, lime #A9E34B (the actual accent —
 * design-system.md's guessed clay accent didn't match the built prototype), plus
 * status colours amber/clay/jade for limited/restricted/excellent bands.
 *
 * The prototype renders data panels as dark-ink cards on the bone page (an
 * inverted-surface pattern), which stock MUI Paper (white) doesn't replicate.
 * background.paper stays MUI-default white for now; a dark Paper variant for
 * data panels is a follow-up, not done in this pass (see docs/adr/).
 *
 * Font families come from next/font CSS variables declared in app/layout.tsx:
 *   --font-bricolage  (display)
 *   --font-instrument (UI + body)
 *   --font-mono       (measured values)
 */

const display = 'var(--font-bricolage), Georgia, serif';
const ui = 'var(--font-instrument), system-ui, -apple-system, sans-serif';
const mono = 'var(--font-mono), ui-monospace, SFMono-Regular, monospace';

// Tabular, non-jittering figures for anything measured.
const numeric = {
  fontFamily: mono,
  fontFeatureSettings: '"tnum" 1, "zero" 1',
  fontVariantNumeric: 'tabular-nums',
} as const;

// A `readout` variant for measured values. See module augmentation at the bottom.
declare module '@mui/material/styles' {
  interface TypographyVariants {
    readout: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    readout?: React.CSSProperties;
  }
}
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    readout: true;
  }
}

const theme = createTheme({
  // CSS theme variables: lets us add a dark scheme later without touching components.
  cssVariables: true,

  // direction: 'rtl' when the Arabic locale ships. Components must already use
  // logical properties (marginInlineStart, not ml) so this is the only change here.
  direction: 'ltr',

  spacing: 8,

  shape: {
    borderRadius: 8,
  },

  palette: {
    mode: 'light',
    primary: {
      main: '#10130E', // ink
      light: '#171B14', // ink-2
      dark: '#000000',
      contrastText: '#E7E4DB', // bone
    },
    secondary: {
      main: '#A9E34B', // lime — the actual brand accent
      light: '#BCEE68',
      dark: '#5C8528', // lime-deep
      contrastText: '#10130E', // ink text on lime, per the prototype's .btn class
    },
    background: {
      default: '#E7E4DB', // bone
      paper: '#FFFFFF',
    },
    text: {
      primary: 'rgba(16, 19, 14, 0.92)',
      secondary: 'rgba(16, 19, 14, 0.60)',
      disabled: 'rgba(16, 19, 14, 0.38)',
    },
    divider: 'rgba(16, 19, 14, 0.14)',
    // Reserved: warning means an open safety flag and nothing else.
    warning: { main: '#E0A33C' }, // amber — "limited" band
    success: { main: '#43B07C' }, // jade — "excellent" band
    error: { main: '#D2532A' }, // clay — "restricted" band
  },

  typography: {
    htmlFontSize: 16,
    fontSize: 14,
    fontFamily: ui,
    h1: { fontFamily: display, fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontFamily: display, fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontFamily: display, fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontFamily: display, fontWeight: 600 },
    h5: { fontFamily: ui, fontWeight: 600 },
    h6: { fontFamily: ui, fontWeight: 600 },
    subtitle1: { fontFamily: ui },
    subtitle2: { fontFamily: ui, fontWeight: 600 },
    body1: { fontFamily: ui, lineHeight: 1.6 },
    body2: { fontFamily: ui, lineHeight: 1.55 },
    button: { fontFamily: ui, fontWeight: 600, textTransform: 'none' },
    caption: { fontFamily: ui },
    overline: { ...numeric, letterSpacing: '0.08em', textTransform: 'uppercase' },
    // Every measured value renders in this.
    readout: { ...numeric, fontSize: '2rem', fontWeight: 500, lineHeight: 1.1 },
  },

  components: {
    // Cards stay flat (no shadow, per the design system's "printed language"
    // rule below) — but a flat card on a flat single-colour page reads as
    // boxy with nothing behind it. This restores the subtle printed-grid +
    // radial accent glow the pre-MUI prototype had on <body>, lost when
    // CssBaseline replaced it with a plain background-color. Depth lives in
    // the canvas, never on the card itself.
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: [
            'repeating-linear-gradient(to right, rgba(16,19,14,.05) 0 1px, transparent 1px 64px)',
            'repeating-linear-gradient(to bottom, rgba(16,19,14,.05) 0 1px, transparent 1px 64px)',
            'radial-gradient(900px 500px at 88% -8%, rgba(169,227,75,.14), transparent 62%)',
          ].join(','),
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { paddingInline: 20, paddingBlock: 10 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true },
    },
    MuiPaper: {
      // Flat, printed language — outlined over elevation.
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { '&.MuiTableCell-alignRight': numeric },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiTypography: {
      defaultProps: {
        variantMapping: { readout: 'span' },
      },
    },
  },
});

export default theme;
