'use client';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import type { PaperProps } from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useColorScheme } from '@mui/material/styles';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';

/* ---------------------------------------------------------------------------
   Two reusable "premium" pieces, built strictly on theme/theme.ts's existing
   tokens (elevation presets, radius scale, palette) — nothing here invents a
   colour or shadow outside them, per CLAUDE.md's "MUI + Marn tokens,
   strictly." Named precedents, per design-system.md's "name the closest
   precedent you're designing to":

     PremiumCard  → Cred's confident, glowing, elevated card. Swaps the flat
                    "resting" Paper default (theme's MuiPaper override) for
                    `theme.marn.elevation(theme).floating`, optional hover-lift.

     GroupedList / SettingRow → Apple Settings' inset grouped list row —
                    label, trailing value/control, hairline divider between
                    rows, optional chevron when the row navigates somewhere.
--------------------------------------------------------------------------- */

export function PremiumCard({
  children, sx, hover = false, ...rest
}: PaperProps & { hover?: boolean }) {
  return (
    <Paper
      {...rest}
      sx={[
        (t) => ({
          ...t.marn.elevation(t).floating,
          borderRadius: `${t.marn.radius.lg}px`,
          ...(hover && {
            cursor: 'pointer',
            transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
            '&:hover': {
              borderColor: alpha(t.palette.primary.main, 0.45),
              transform: 'translateY(-2px)',
            },
          }),
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Paper>
  );
}

export function GroupedList({ children, sx }: { children: React.ReactNode; sx?: PaperProps['sx'] }) {
  return (
    <Paper
      variant="outlined"
      sx={[
        (t) => ({ borderRadius: `${t.marn.radius.lg}px`, overflow: 'hidden' }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Paper>
  );
}

export function SettingRow({
  label, secondary, value, onClick, icon, last = false,
}: {
  label: string;
  secondary?: string;
  value?: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <>
      <Stack
        direction="row"
        spacing={1.5}
        onClick={onClick}
        sx={{
          alignItems: 'center',
          px: 2.5,
          py: 1.75,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'background-color 120ms ease',
          '&:hover': onClick ? { bgcolor: 'action.hover' } : undefined,
        }}
      >
        {icon && <Box sx={{ display: 'flex', color: 'primary.main' }}>{icon}</Box>}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1">{label}</Typography>
          {secondary && <Typography variant="body2" color="text.secondary">{secondary}</Typography>}
        </Box>
        {typeof value === 'string'
          ? <Typography variant="body2" color="text.secondary">{value}</Typography>
          : value}
        {onClick && <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />}
      </Stack>
      {!last && <Divider sx={{ marginInlineStart: icon ? 6.5 : 2.5 }} />}
    </>
  );
}

/** Light/dark switch — light is the default scheme (theme.ts), dark stays one
 * click away. `useColorScheme()` persists the choice itself (MUI writes it to
 * localStorage under its own key) and every open tab picks it up via the
 * `data-mui-color-scheme` attribute InitColorSchemeScript/ThemeProvider both
 * read — no app-level state needed here. Renders nothing until mounted:
 * `mode` is undefined during SSR/first paint, and guessing wrong for one
 * frame is worse than a blank slot. */
export function ThemeToggle({ size = 'medium' }: { size?: 'small' | 'medium' }) {
  const { mode, setMode } = useColorScheme();
  if (!mode) return <Box sx={{ width: size === 'small' ? 34 : 40, height: size === 'small' ? 34 : 40 }} />;
  const dark = mode === 'dark';
  return (
    <Tooltip title={dark ? 'Switch to light' : 'Switch to dark'}>
      <IconButton
        size={size}
        onClick={() => setMode(dark ? 'light' : 'dark')}
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        sx={{ color: 'text.secondary' }}
      >
        {dark ? <LightModeOutlinedIcon fontSize={size} /> : <DarkModeOutlinedIcon fontSize={size} />}
      </IconButton>
    </Tooltip>
  );
}
