'use client';

import { createTheme, alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

/**
 * Marn theme — brand system, now dual-scheme (light default, dark kept).
 *
 * This file is visual truth. Every colour, font, radius, spacing step, and
 * elevation used anywhere in the app resolves here. Hardcoding a value in a
 * component is a defect.
 *
 * Light/dark wiring follows the root product's proven pattern exactly
 * (theme/theme.ts there, see its own header comment) — MUI's CSS-variables
 * `colorSchemes`, not two separate `createTheme()` calls: `cssVariables`
 * must use the *literal* attribute name `data-mui-color-scheme`, not the
 * `'data'` shorthand (which targets a boolean `[data-dark]` attribute that
 * nothing sets) — the root product hit and documented this exact bug before
 * catching it in a real browser, not from `tsc`/`build`. `defaultColorScheme`
 * here plus `InitColorSchemeScript`'s own `defaultMode` (app/layout.tsx) both
 * need to agree, and `ThemeProvider` needs its *own* `defaultMode` prop too —
 * three separate places that must all say the same thing, or hydration picks
 * a different scheme than the pre-hydration script painted.
 *
 * Light is the *user-facing default* per explicit product direction — dark
 * was the brand handoff's original default and is kept, reachable via the
 * toggle in Chrome.tsx / Gate.tsx (`useColorScheme()`).
 *
 * The light palette is a deliberate departure from the brand handoff's own
 * light tokens (warm off-white/bronze, see the reference `marnPaletteLight`
 * export below): explicit product direction was "white background, text and
 * outlines in shades of black, colour reserved for what's actually
 * highlighted" — a neutral, high-contrast, editorial look, not a tinted
 * restatement of the dark palette. Brand accent colours (brass/celadon,
 * deepened for AA contrast on white — same values the root product already
 * derived for its own light scheme) are kept for exactly that: primary
 * actions, selection, focus — the "highlighted" case.
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

/** Reference only — the brand handoff's own (warm, tinted) light tokens.
 * Not wired into `colorSchemes.light` below; see the header comment for why. */
export const marnPaletteLight = {
  background: '#EFECE2',
  surface: '#F9F7F0',
  line: '#DED9C9',
  textPrimary: '#101614',
  textSecondary: '#5A635E',
  primary: '#6E5220',
  secondary: '#1F6152',
} as const;

/* Neutral black/white light scheme — white surfaces, grayscale-only text and
   borders ("shades of black," not a tint), colour reserved for primary/
   secondary (the "highlighted" case). */
const lightColor = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceRaised: '#F4F4F4',
  line: '#242424',
  lineStrong: '#141414',
  textPrimary: '#0D0D0D',
  textSecondary: '#4D4D4D',
  textMuted: '#8A8A8A',
  primary: '#6E5220',
  primaryHover: '#8A6A32',
  secondary: '#1F6152',
} as const;

/**
 * Status bands. "Four states on a journey, not a triage" — ramp runs stone →
 * ochre → jade → celadon, deliberately with no red: green sits in the
 * middle, not the top, so nothing reads as an alarm or an all-clear.
 * Kept scheme-invariant (same four hex values in light and dark) — these are
 * data-viz accent colours, not neutrals, and read fine against either
 * background; a per-scheme retune is a follow-up if that stops being true.
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
const errorColorLight = '#A34A34';

/** Ambient wash — one soft leak of colour from the top edge per surface, cross-faded on change.
 * Kept scheme-invariant (low-alpha accent over whichever background is active) — same reasoning as `bands`.
 * Covers the member app's five tabs (today/progress/sessions/body/home) plus one entry per staff
 * console (manager/coach/admin) — CLAUDE.md's "leaks till middle of page" treatment applied everywhere,
 * not just Member. Staff consoles use a lower alpha than the member tabs: they're dense data screens,
 * not a hero moment, so the wash should be felt rather than seen. */
export const ambientWash: Record<
  'today' | 'progress' | 'sessions' | 'body' | 'home' | 'manager' | 'coach' | 'admin',
  string
> = {
  today:
    'radial-gradient(130% 44% at 18% -8%, rgba(200,164,106,.20) 0%, rgba(200,164,106,0) 62%), ' +
    'radial-gradient(95% 30% at 92% 0%, rgba(143,203,184,.10) 0%, rgba(143,203,184,0) 66%)',
  progress:
    'radial-gradient(130% 44% at 20% -8%, rgba(143,203,184,.20) 0%, rgba(143,203,184,0) 62%), ' +
    'radial-gradient(95% 30% at 95% 0%, rgba(200,164,106,.10) 0%, rgba(200,164,106,0) 66%)',
  sessions:
    'radial-gradient(130% 44% at 22% -8%, rgba(111,169,141,.18) 0%, rgba(111,169,141,0) 62%), ' +
    'radial-gradient(95% 30% at 95% 0%, rgba(200,164,106,.10) 0%, rgba(200,164,106,0) 66%)',
  body:
    'radial-gradient(130% 44% at 16% -8%, rgba(200,164,106,.16) 0%, rgba(200,164,106,0) 62%), ' +
    'radial-gradient(95% 30% at 90% 0%, rgba(111,169,141,.12) 0%, rgba(111,169,141,0) 66%)',
  home:
    'radial-gradient(130% 44% at 24% -8%, rgba(111,169,141,.20) 0%, rgba(111,169,141,0) 62%), ' +
    'radial-gradient(95% 30% at 95% 0%, rgba(200,164,106,.10) 0%, rgba(200,164,106,0) 66%)',
  manager:
    'radial-gradient(120% 38% at 15% -10%, rgba(143,203,184,.14) 0%, rgba(143,203,184,0) 60%), ' +
    'radial-gradient(90% 26% at 92% 0%, rgba(200,164,106,.08) 0%, rgba(200,164,106,0) 64%)',
  coach:
    'radial-gradient(120% 38% at 15% -10%, rgba(200,164,106,.14) 0%, rgba(200,164,106,0) 60%), ' +
    'radial-gradient(90% 26% at 92% 0%, rgba(143,203,184,.08) 0%, rgba(143,203,184,0) 64%)',
  admin:
    'radial-gradient(120% 38% at 15% -10%, rgba(111,169,141,.12) 0%, rgba(111,169,141,0) 60%), ' +
    'radial-gradient(90% 26% at 92% 0%, rgba(200,164,106,.08) 0%, rgba(200,164,106,0) 64%)',
};

export type AmbientWashKey = keyof typeof ambientWash;

export const radiusScale = { sm: 12, md: 18, lg: 24, pill: 999 } as const;

/**
 * Three elevation levels. A function of the active theme (not a static
 * object) so the shadow/border recipe can read the live palette — bgcolor
 * and borderColor are plain theme-token strings (`'background.paper'`,
 * `'divider'`, ...), which MUI's sx system resolves against whichever
 * colour scheme is active; the boxShadow strings need real rgba() (can't
 * embed a bare token inside a shadow value), so those alone branch on
 * `t.palette.mode` — a light surface wants a true dark drop-shadow, a dark
 * surface wants a faint highlight instead. Level 1 ("selected") is a
 * *selection* treatment, not decoration — a selected panel moves border +
 * glow + background at once, never colour alone.
 */
export function elevationPreset(t: Theme) {
  const dark = t.palette.mode === 'dark';
  return {
    resting: {
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      boxShadow: 'none',
    },
    selected: {
      bgcolor: 'background.raised',
      border: '1px solid',
      borderColor: alpha(t.palette.primary.main, 0.55),
      boxShadow: [
        `inset 0 1px 0 ${alpha(dark ? '#F0EFE9' : '#FFFFFF', dark ? 0.08 : 0.6)}`,
        `0 0 0 3px ${alpha(t.palette.primary.main, 0.12)}`,
        `0 10px 24px ${alpha('#000000', dark ? 0.55 : 0.12)}`,
      ].join(', '),
    },
    floating: {
      bgcolor: 'background.raised',
      border: '1px solid',
      borderColor: 'lineStrong',
      boxShadow: [
        `inset 0 1px 0 ${alpha(dark ? '#F0EFE9' : '#FFFFFF', dark ? 0.06 : 0.5)}`,
        `0 2px 6px ${alpha('#000000', dark ? 0.4 : 0.06)}`,
        `0 24px 60px ${alpha('#000000', dark ? 0.7 : 0.12)}`,
      ].join(', '),
    },
  } as const;
}

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
  interface Palette {
    /** Chips, segmented controls, nested/selected panels. */
    lineStrong: string;
  }
  interface PaletteOptions {
    lineStrong?: string;
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
  // Must be the literal attribute name, not the 'data' shorthand — see the
  // header comment; confirmed against the root product's own documented fix.
  cssVariables: { colorSchemeSelector: 'data-mui-color-scheme' },
  defaultColorScheme: 'light',
  // direction: 'rtl' when the Arabic locale ships. Components already use
  // logical properties (marginInlineStart, not ml) so this is the only change.
  direction: 'ltr',

  spacing: 8,

  shape: {
    borderRadius: radiusScale.md,
  },

  marn: { bands, ambientWash, radius: radiusScale, elevation: elevationPreset },

  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: lightColor.primary,
          light: lightColor.primaryHover,
          dark: lightColor.primary,
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: lightColor.secondary,
          contrastText: '#FFFFFF',
        },
        background: {
          default: lightColor.background,
          paper: lightColor.surface,
          raised: lightColor.surfaceRaised,
        },
        text: {
          primary: lightColor.textPrimary,
          secondary: lightColor.textSecondary,
          disabled: lightColor.textMuted,
        },
        divider: lightColor.line,
        lineStrong: lightColor.lineStrong,
        warning: { main: bands.limited },
        success: { main: bands.optimal },
        error: { main: errorColorLight },
      },
    },
    dark: {
      palette: {
        primary: {
          main: marnColor.primary,
          light: marnColor.primaryHover,
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
        lineStrong: marnColor.lineStrong,
        warning: { main: bands.limited },
        success: { main: bands.optimal },
        error: { main: errorColor },
      },
    },
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
          backgroundColor: 'var(--mui-palette-background-default)',
          // "Figtree 600 with font-variant-numeric: tabular-nums set globally" — no third family, no monospace anywhere.
          fontVariantNumeric: 'tabular-nums',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme: t, ownerState }) => ({
          borderRadius: radiusScale.pill,
          paddingInline: 20,
          paddingBlock: 15,
          fontSize: 15,
          ...(ownerState.variant === 'contained' && ownerState.color === 'primary' && {
            color: t.vars.palette.primary.contrastText,
            '&:hover': { backgroundColor: t.vars.palette.primary.light },
          }),
          ...(ownerState.variant === 'outlined' && {
            borderColor: t.vars.palette.divider,
            '&:hover': { backgroundColor: t.vars.palette.background.paper, borderColor: t.vars.palette.divider },
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
        root: ({ theme: t }) => ({ backgroundImage: 'none', borderColor: t.vars.palette.divider, borderRadius: radiusScale.md }),
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderColor: t.vars.palette.divider,
          '&.MuiTableCell-alignRight': { fontVariantNumeric: 'tabular-nums', fontWeight: 600 },
        }),
      },
    },
    MuiTypography: {
      defaultProps: {
        variantMapping: { readout: 'span' },
      },
    },
    /* Glass app bar — translucent + blurred rather than a flat opaque strip.
       Applies everywhere Chrome.tsx's AppBar is used, no per-screen work. */
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundImage: 'none',
          backgroundColor: alpha(t.palette.mode === 'dark' ? marnColor.surface : lightColor.surface, 0.72),
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        }),
      },
    },
    /* Segmented pill control — a track with a solid selected pill, not
       bordered buttons in a row. One change here upgrades every category /
       role / site toggle in the app (Gate, Chrome, Manager, Admin, Member's
       booking picker) without touching each call site. */
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundColor: t.vars.palette.background.raised,
          borderRadius: radiusScale.pill,
          padding: 4,
          gap: 4,
        }),
        grouped: {
          border: 'none',
          '&.Mui-disabled': { border: 'none' },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          border: 'none',
          borderRadius: `${radiusScale.pill}px !important`,
          fontWeight: 600,
          fontSize: 14,
          textTransform: 'none',
          paddingInline: 16,
          color: t.vars.palette.text.secondary,
          transition: 'background-color 160ms ease, color 160ms ease, box-shadow 160ms ease',
          '&.Mui-selected, &.Mui-selected:hover': {
            backgroundColor: t.vars.palette.primary.main,
            color: t.vars.palette.primary.contrastText,
            boxShadow: `0 4px 14px ${alpha(t.palette.primary.main, 0.35)}`,
          },
          '&:hover': { backgroundColor: alpha(t.palette.text.primary, 0.06) },
        }),
      },
    },
    /* Rounded pill indicator instead of MUI's default hairline underline. */
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: { height: 3, borderRadius: radiusScale.pill },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 44,
          fontSize: 15,
          color: t.vars.palette.text.secondary,
          '&.Mui-selected': { color: t.vars.palette.primary.main },
        }),
      },
    },
    /* Floating elevation (theme.marn.elevation(t).floating, restated as raw
       CSS here since styleOverrides can't call back into itself) for every
       popover-style surface — dropdown menus, the reschedule/reassign
       popovers — so they read as lifted, not flat. */
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          borderRadius: radiusScale.md,
          border: `1px solid ${t.vars.palette.lineStrong}`,
          boxShadow: `inset 0 1px 0 ${alpha('#FFFFFF', t.palette.mode === 'dark' ? 0.06 : 0.5)}, 0 2px 6px ${alpha('#000000', t.palette.mode === 'dark' ? 0.4 : 0.08)}, 0 24px 60px ${alpha('#000000', t.palette.mode === 'dark' ? 0.7 : 0.14)}`,
        }),
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          borderRadius: radiusScale.md,
          border: `1px solid ${t.vars.palette.lineStrong}`,
          boxShadow: `inset 0 1px 0 ${alpha('#FFFFFF', t.palette.mode === 'dark' ? 0.06 : 0.5)}, 0 2px 6px ${alpha('#000000', t.palette.mode === 'dark' ? 0.4 : 0.08)}, 0 24px 60px ${alpha('#000000', t.palette.mode === 'dark' ? 0.7 : 0.14)}`,
        }),
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 120ms ease',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: { root: { backgroundColor: 'transparent' } },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          color: t.vars.palette.text.disabled,
          '&.Mui-selected': { color: t.vars.palette.primary.main },
        }),
        label: {
          fontWeight: 500,
          '&.Mui-selected': { fontWeight: 600, fontSize: '0.75rem' },
        },
      },
    },
  },
});

export default theme;
