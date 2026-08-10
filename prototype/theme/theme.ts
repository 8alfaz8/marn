'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Marn theme — brand system, dark-first.
 *
 * This file is visual truth. Every colour, font, radius, spacing step, and
 * elevation used anywhere in the app resolves here. Hardcoding a value in a
 * component is a defect.
 *
 * Source: `Marn wellness brand design system/design_handoff_marn_app/README.md`
 * (prose spec) cross-checked against `Marn Design System.dc.html` §08's JSON
 * token block, which wins on any hex/spacing precision mismatch. The app is
 * dark-first by design — the handoff's light palette is scoped to "web,
 * email, print" contexts that don't apply here, so it isn't wired as a second
 * MUI theme; `marnPaletteLight` below is kept only as a reference in case a
 * genuinely light-mode surface (marketing site, printable report) is ever
 * built. See prototype/decisions.md for the palette-swap rationale.
 *
 * `marnColor`/`bands`/`ambientWash` are exported as plain objects (not just
 * buried inside `createTheme`) so non-component consumers that cannot call
 * `useTheme()` — `lib/reference.ts`'s legacy `colorOf`, and
 * `app/globals.css`'s custom properties feeding the debug-only `Panels.tsx`
 * dock (plain CSS on purpose, not part of the MUI migration) — read the same
 * values instead of re-typing hex literals. CSS custom properties can't
 * import from TypeScript, so `globals.css` duplicates these by hand; keep the
 * two in sync if a token changes here.
 *
 * Font families load via `next/font/google` in `app/layout.tsx` as
 * `--font-petrona` (display/serif) and `--font-figtree` (UI/sans, also the
 * numeral face — tabular figures, no monospace anywhere in this system).
 */

export const marnColor = {
  background: '#0C1210',
  surface: '#141C19',
  surfaceRaised: '#1D2724',
  line: '#2A3733',
  lineStrong: '#3A4A44',
  textPrimary: '#F0EFE9',
  textSecondary: '#A6B0AB',
  textMuted: '#7A8781',
  primary: '#C8A46A',
  primaryHover: '#DDBB86',
  secondary: '#8FCBB8',
} as const;

/** Reference only — light-mode tokens for a future web/email/print surface. Not wired into this theme. */
export const marnPaletteLight = {
  background: '#EFECE2',
  surface: '#F9F7F0',
  line: '#DED9C9',
  textPrimary: '#101614',
  textSecondary: '#5A635E',
  primary: '#6E5220',
  secondary: '#1F6152',
} as const;

/**
 * Status bands. "Four states on a journey, not a triage" — ramp runs stone →
 * ochre → jade → celadon, deliberately with no red: green sits in the
 * middle, not the top, so nothing reads as an alarm or an all-clear.
 */
export const bands = {
  restricted: '#8B9691',
  limited: '#A97C42',
  optimal: '#6FA98D',
  excellent: '#8FCBB8',
} as const;

export type Band = keyof typeof bands;

/**
 * MUI's `error` role still needs a colour for genuine app-level failures
 * (network, validation) that are not a status band and must never borrow one
 * — the brand system's bands intentionally exclude red. Not in the handoff;
 * a muted, desaturated rust so it reads as "something failed" without the
 * clinical-alarm connotation CLAUDE.md rules out. See prototype/decisions.md.
 */
const errorColor = '#B9573E';

/** Ambient wash — one soft leak of colour from the top edge per tab, cross-faded on tab change. */
export const ambientWash: Record<'today' | 'progress' | 'sessions', string> = {
  today:
    'radial-gradient(130% 44% at 18% -8%, rgba(200,164,106,.20) 0%, rgba(200,164,106,0) 62%), ' +
    'radial-gradient(95% 30% at 92% 0%, rgba(143,203,184,.10) 0%, rgba(143,203,184,0) 66%)',
  progress:
    'radial-gradient(130% 44% at 20% -8%, rgba(143,203,184,.20) 0%, rgba(143,203,184,0) 62%), ' +
    'radial-gradient(95% 30% at 95% 0%, rgba(200,164,106,.10) 0%, rgba(200,164,106,0) 66%)',
  sessions:
    'radial-gradient(130% 44% at 22% -8%, rgba(111,169,141,.18) 0%, rgba(111,169,141,0) 62%), ' +
    'radial-gradient(95% 30% at 95% 0%, rgba(200,164,106,.10) 0%, rgba(200,164,106,0) 66%)',
};

export const radiusScale = { sm: 12, md: 18, lg: 24, pill: 999 } as const;

/** Three elevation levels, spreadable straight into an `sx` prop. Level 1 is a *selection* treatment, not decoration — a selected panel moves border + glow + background at once, never colour alone. */
export const elevationPreset = {
  resting: {
    bgcolor: marnColor.surface,
    border: '1px solid',
    borderColor: marnColor.line,
    boxShadow: 'none',
  },
  selected: {
    bgcolor: marnColor.surfaceRaised,
    border: '1px solid',
    borderColor: 'rgba(200,164,106,.55)',
    boxShadow:
      'inset 0 1px 0 rgba(240,239,233,.08), 0 0 0 3px rgba(200,164,106,.12), 0 10px 24px rgba(0,0,0,.55)',
  },
  floating: {
    bgcolor: marnColor.surfaceRaised,
    border: '1px solid',
    borderColor: marnColor.lineStrong,
    boxShadow:
      'inset 0 1px 0 rgba(240,239,233,.06), 0 2px 6px rgba(0,0,0,.4), 0 24px 60px rgba(0,0,0,.7)',
  },
} as const;

declare module '@mui/material/styles' {
  interface Theme {
    marn: {
      bands: typeof bands;
      ambientWash: typeof ambientWash;
      radius: typeof radiusScale;
      elevation: typeof elevationPreset;
    };
  }
  interface ThemeOptions {
    marn?: {
      bands: typeof bands;
      ambientWash: typeof ambientWash;
      radius: typeof radiusScale;
      elevation: typeof elevationPreset;
    };
  }
  interface TypeBackground {
    /** `surfaceRaised` — chips, segmented controls, nested cards, selected panels. */
    raised: string;
  }
  interface TypographyVariants {
    /** Measured-value display: Figtree 600 tabular, 60/60, -0.02em. */
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

const display = 'var(--font-petrona), Georgia, serif';
const ui = 'var(--font-figtree), system-ui, -apple-system, sans-serif';

const theme = createTheme({
  cssVariables: true,
  // direction: 'rtl' when the Arabic locale ships. Components already use
  // logical properties (marginInlineStart, not ml) so this is the only change.
  direction: 'ltr',

  spacing: 8,

  shape: {
    borderRadius: radiusScale.md,
  },

  marn: { bands, ambientWash, radius: radiusScale, elevation: elevationPreset },

  palette: {
    mode: 'dark',
    primary: {
      main: marnColor.primary,
      light: marnColor.primaryHover, // hover/press
      dark: marnColor.primary,
      contrastText: marnColor.background,
    },
    secondary: {
      main: marnColor.secondary,
      contrastText: marnColor.background,
    },
    background: {
      default: marnColor.background,
      paper: marnColor.surface,
      raised: marnColor.surfaceRaised,
    },
    text: {
      primary: marnColor.textPrimary,
      secondary: marnColor.textSecondary,
      disabled: marnColor.textMuted,
    },
    divider: marnColor.line,
    // Reserved: an open safety flag / "needs a look" state. Ochre reads as
    // "movement returning", not an alarm — consistent with the no-red rule.
    warning: { main: bands.limited },
    // Measured positive change / everyday target range reached.
    success: { main: bands.optimal },
    // App-level failures only (network, validation) — never a status band.
    error: { main: errorColor },
  },

  typography: {
    htmlFontSize: 16,
    fontSize: 14,
    fontFamily: ui,
    h1: {
      fontFamily: display, fontWeight: 400, fontSize: '4rem', lineHeight: 66 / 64, letterSpacing: '-0.02em',
      '@media (max-width:600px)': { fontSize: '2.5rem', lineHeight: 44 / 40 },
    },
    h2: {
      fontFamily: display, fontWeight: 400, fontSize: '2.75rem', lineHeight: 50 / 44, letterSpacing: '-0.015em',
      '@media (max-width:600px)': { fontSize: '2rem', lineHeight: 38 / 32 },
    },
    h3: {
      fontFamily: display, fontWeight: 400, fontSize: '1.875rem', lineHeight: 38 / 30, letterSpacing: 0,
      '@media (max-width:600px)': { fontSize: '1.625rem', lineHeight: 32 / 26 },
    },
    h4: { fontFamily: ui, fontWeight: 600, fontSize: '1.375rem', lineHeight: 28 / 22, letterSpacing: '-0.01em' },
    h5: { fontFamily: ui, fontWeight: 600, fontSize: '1.125rem', lineHeight: 24 / 18 },
    h6: { fontFamily: ui, fontWeight: 600, fontSize: '1rem', lineHeight: 22 / 16 },
    subtitle1: { fontFamily: ui, fontWeight: 600 },
    subtitle2: { fontFamily: ui, fontWeight: 600, fontSize: '0.875rem' },
    body1: { fontFamily: ui, fontWeight: 400, fontSize: '1rem', lineHeight: 26 / 16 },
    body2: { fontFamily: ui, fontWeight: 400, fontSize: '0.875rem', lineHeight: 22 / 14 },
    button: { fontFamily: ui, fontWeight: 600, textTransform: 'none' },
    caption: { fontFamily: ui },
    overline: {
      fontFamily: ui, fontWeight: 600, fontSize: '0.6875rem', lineHeight: 14 / 11,
      letterSpacing: '0.16em', textTransform: 'uppercase',
    },
    // Every measured value renders in this.
    readout: {
      fontFamily: ui, fontWeight: 600, fontSize: '3.75rem', lineHeight: 1,
      letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
    },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: marnColor.background,
          // "Figtree 600 with font-variant-numeric: tabular-nums set globally" — no third family, no monospace anywhere.
          fontVariantNumeric: 'tabular-nums',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: radiusScale.pill,
          paddingInline: 20,
          paddingBlock: 15,
          fontSize: 15,
          ...(ownerState.variant === 'contained' && ownerState.color === 'primary' && {
            color: marnColor.background,
            '&:hover': { backgroundColor: marnColor.primaryHover },
          }),
          ...(ownerState.variant === 'outlined' && {
            borderColor: marnColor.line,
            '&:hover': { backgroundColor: marnColor.surface, borderColor: marnColor.line },
          }),
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: radiusScale.pill, fontWeight: 600 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: radiusScale.sm } },
    },
    MuiPaper: {
      // Flat, bordered cards — no drop shadow at rest (see theme.marn.elevation).
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: { backgroundImage: 'none', borderColor: marnColor.line, borderRadius: radiusScale.md },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: marnColor.line,
          '&.MuiTableCell-alignRight': { fontVariantNumeric: 'tabular-nums', fontWeight: 600 },
        },
      },
    },
    MuiTypography: {
      defaultProps: {
        variantMapping: { readout: 'span' },
      },
    },
    MuiAppBar: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiBottomNavigation: {
      styleOverrides: { root: { backgroundColor: 'transparent' } },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: marnColor.textMuted,
          '&.Mui-selected': { color: marnColor.primary },
        },
        label: {
          fontWeight: 500,
          '&.Mui-selected': { fontWeight: 600, fontSize: '0.75rem' },
        },
      },
    },
  },
});

export default theme;
