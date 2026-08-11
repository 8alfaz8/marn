'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { copy } from './copy';
import type { Booking } from './types';

/* Shared pieces of the studio manager console. All at module scope, never
   nested in a parent's render body (CLAUDE.md's known trap: an inline
   sub-component remounts on every parent render and drops in-progress form
   input — a manager mid-booking would lose it on the next revalidation). */

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  // Fixed zone: the data layer writes dates as UTC ISO days, and a formatter
  // that read the local zone would render one day on the server and another
  // in the browser.
  timeZone: 'UTC',
});

/** `YYYY-MM-DD` or a timestamp, rendered as a stable, non-hydration-shifting day. */
export function formatDay(value: string | Date) {
  return DATE_FORMAT.format(typeof value === 'string' ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value);
}

const NUMBER_FORMAT = new Intl.NumberFormat('en-AE');

export function formatNumber(value: number) {
  return NUMBER_FORMAT.format(value);
}

export function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">{title}</Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {children}
      </Stack>
    </Paper>
  );
}

/** Label + value + unit. No delta or sparkline: the dashboard action returns a
 *  single window with no prior period to compare against (docs/adr/0008 keeps
 *  it deliberately light), and a comparison we cannot compute is not one to fake. */
export function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
      <Stack spacing={1}>
        <Typography variant="overline" sx={{ color: 'text.muted' }}>
          {label}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
          <Typography variant="h4" component="p">
            {value}
          </Typography>
          {unit && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {unit}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

/** Empty and first-run copy. `children` so a caller can hand the manager the
 *  next action (a button into the tab that fixes the emptiness). */
export function EmptyState({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <Stack spacing={2} sx={{ alignItems: 'start', py: 2 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {message}
      </Typography>
      {children}
    </Stack>
  );
}

/* `success` is reserved for measured positive change (theme.ts: "Measured
   positive change / everyday target range reached"), not a routine
   operational state — a completed booking isn't itself a proof point, so it
   stays neutral rather than borrowing that colour. */
const BOOKING_STATUS: Record<Booking['status'], { label: string; color: 'default' | 'primary' }> = {
  requested: { label: copy.bookingStatus.requested, color: 'default' },
  confirmed: { label: copy.bookingStatus.confirmed, color: 'primary' },
  completed: { label: copy.bookingStatus.completed, color: 'default' },
  declined: { label: copy.bookingStatus.declined, color: 'default' },
  cancelled: { label: copy.bookingStatus.cancelled, color: 'default' },
};

export function BookingStatusChip({ status }: { status: Booking['status'] }) {
  const { label, color } = BOOKING_STATUS[status];
  return <Chip size="small" variant="outlined" label={label} color={color} />;
}

/**
 * One submit path for every write on this console: run the server action,
 * surface a plain-language failure, confirm success, and revalidate so the
 * new row appears. `router.refresh()` re-renders the server tree without
 * remounting these client panels, so a half-typed form in another tab
 * survives it.
 */
export function useFormSubmit() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (successMessage: string, action: () => Promise<unknown>, onSuccess?: () => void) => {
    setPending(true);
    setError(null);
    try {
      await action();
      onSuccess?.();
      setNotice(successMessage);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : copy.form.failed);
    } finally {
      setPending(false);
    }
  };

  return { pending, error, notice, setError, setNotice, run };
}
