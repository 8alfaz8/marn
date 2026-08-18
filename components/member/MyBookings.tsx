'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { cancelSelfBooking } from '@/lib/actions/bookings';
import { serviceById } from '@/lib/reference';
import { copy } from './copy';
import type { OwnBooking } from './types';

const ACTIVE = new Set(['requested', 'confirmed']);
const CANCELLATION_NOTICE_HOURS = 24;

/** Client-side mirror of lib/actions/bookings.ts's `hoursUntil` — only for
 *  showing the right message before confirming; the server is the actual
 *  source of truth for what gets refunded. */
function willRefund(date: string, time: string): boolean {
  const target = new Date(`${date}T${time}:00`);
  return (target.getTime() - Date.now()) / (1000 * 60 * 60) >= CANCELLATION_NOTICE_HOURS;
}

/* One booking row — upcoming and past sections render the same shape.
   Module scope per CLAUDE.md's known trap. */
function BookingRow({
  booking,
  confirming,
  busy,
  onConfirm,
  onCancelClick,
  onCancelCancel,
}: {
  booking: OwnBooking;
  confirming: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancelClick: () => void;
  onCancelCancel: () => void;
}) {
  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body1">{booking.date} · {booking.time}</Typography>
        <Typography variant="body2" color="text.secondary">
          {serviceById(booking.serviceId)?.name ?? booking.serviceId}
        </Typography>
        <Chip size="small" variant="outlined" label={copy.myBookings.status[booking.status] ?? booking.status} />
      </Stack>
      {ACTIVE.has(booking.status) && (
        <Box sx={{ mt: 1 }}>
          {confirming ? (
            <Collapse in>
              <Stack spacing={1}>
                <Typography variant="body2">
                  {willRefund(booking.date, booking.time) ? copy.myBookings.cancelConfirmRefund : copy.myBookings.cancelConfirmForfeit}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" disabled={busy} onClick={onConfirm}>
                    {copy.myBookings.cancelYes}
                  </Button>
                  <Button size="small" onClick={onCancelCancel}>{copy.myBookings.cancelNo}</Button>
                </Stack>
              </Stack>
            </Collapse>
          ) : (
            <Button size="small" onClick={onCancelClick}>{copy.myBookings.cancel}</Button>
          )}
        </Box>
      )}
    </Box>
  );
}

/* Product owner (batch UI/UX review, 2026-08-19): upcoming bookings on top,
   a "Book a session" action, then past sessions below — not one
   newest-date-first list mixing both. Module-scope per CLAUDE.md's known
   trap. */
export default function MyBookings({
  bookings,
  onChanged,
  onGoToBook,
}: {
  bookings: OwnBooking[];
  onChanged: () => void;
  onGoToBook: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onCancel = async (id: string) => {
    setError(null);
    setBusy(true);
    try {
      const { refunded } = await cancelSelfBooking(id);
      setConfirming(null);
      setMessage(refunded ? copy.myBookings.cancelledRefunded : copy.myBookings.cancelledForfeited);
      onChanged();
    } catch {
      setError(copy.myBookings.cancelFailed);
    } finally {
      setBusy(false);
    }
  };

  // `bookings` arrives newest-date-first (getMemberOwnBookings). Upcoming
  // (active status) shows soonest-first instead — the opposite ordering —
  // past (everything else) keeps the most-recent-first order it already has.
  const upcoming = bookings
    .filter((b) => ACTIVE.has(b.status))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const past = bookings.filter((b) => !ACTIVE.has(b.status));

  const rowProps = (b: OwnBooking) => ({
    booking: b,
    confirming: confirming === b.id,
    busy,
    onConfirm: () => onCancel(b.id),
    onCancelClick: () => setConfirming(b.id),
    onCancelCancel: () => setConfirming(null),
  });

  return (
    <Stack spacing={2} sx={{ maxWidth: 560 }}>
      <Typography variant="h6">{copy.myBookings.heading}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}

      <Stack spacing={1.5}>
        <Typography variant="overline" color="text.secondary">{copy.myBookings.upcomingHeading}</Typography>
        {upcoming.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{copy.myBookings.noUpcoming}</Typography>
        ) : (
          upcoming.map((b) => <BookingRow key={b.id} {...rowProps(b)} />)
        )}
      </Stack>

      <Box>
        <Button variant="contained" onClick={onGoToBook}>{copy.myBookings.bookAction}</Button>
      </Box>

      <Stack spacing={1.5}>
        <Typography variant="overline" color="text.secondary">{copy.myBookings.pastHeading}</Typography>
        {past.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{copy.myBookings.noPast}</Typography>
        ) : (
          past.map((b) => <BookingRow key={b.id} {...rowProps(b)} />)
        )}
      </Stack>
    </Stack>
  );
}
