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

/* Module-scope per CLAUDE.md's known trap. */
export default function MyBookings({ bookings, onChanged }: { bookings: OwnBooking[]; onChanged: () => void }) {
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

  return (
    <Stack spacing={2} sx={{ maxWidth: 560 }}>
      <Typography variant="h6">{copy.myBookings.heading}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      {bookings.length === 0 && (
        <Typography variant="body2" color="text.secondary">{copy.myBookings.empty}</Typography>
      )}
      {bookings.map((b) => (
        <Box key={b.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body1">{b.date} · {b.time}</Typography>
            <Typography variant="body2" color="text.secondary">
              {serviceById(b.serviceId)?.name ?? b.serviceId}
            </Typography>
            <Chip size="small" variant="outlined" label={copy.myBookings.status[b.status] ?? b.status} />
          </Stack>
          {ACTIVE.has(b.status) && (
            <Box sx={{ mt: 1 }}>
              {confirming === b.id ? (
                <Collapse in>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      {willRefund(b.date, b.time) ? copy.myBookings.cancelConfirmRefund : copy.myBookings.cancelConfirmForfeit}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="contained" disabled={busy} onClick={() => onCancel(b.id)}>
                        {copy.myBookings.cancelYes}
                      </Button>
                      <Button size="small" onClick={() => setConfirming(null)}>{copy.myBookings.cancelNo}</Button>
                    </Stack>
                  </Stack>
                </Collapse>
              ) : (
                <Button size="small" onClick={() => setConfirming(b.id)}>{copy.myBookings.cancel}</Button>
              )}
            </Box>
          )}
        </Box>
      ))}
    </Stack>
  );
}
