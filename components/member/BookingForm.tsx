'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { SERVICES, serviceById } from '@/lib/reference';
import { createSelfBooking, getActiveCoachesAtSite, getMemberAvailability } from '@/lib/actions/bookings';
import { getActiveSites } from '@/lib/actions/memberAuth';
import TimeSlotPicker from '@/components/shared/TimeSlotPicker';
import { copy } from './copy';
import type { ActiveCoach, ActiveSite } from './types';

/* Module-scope per CLAUDE.md's known trap — survives MemberConsole's tab
   switches and any background refresh with the half-filled form intact. */
export default function BookingForm({
  parqCleared,
  referredToDoctor,
  onBooked,
}: {
  parqCleared: boolean;
  referredToDoctor: boolean;
  onBooked: () => void;
}) {
  const [sites, setSites] = useState<ActiveSite[] | null>(null);
  const [siteId, setSiteId] = useState('');
  const [coaches, setCoaches] = useState<ActiveCoach[] | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [coachId, setCoachId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (parqCleared) getActiveSites().then(setSites);
  }, [parqCleared]);

  useEffect(() => {
    if (!siteId) {
      setCoaches(null);
      return;
    }
    getActiveCoachesAtSite(siteId).then(setCoaches);
  }, [siteId]);

  // docs/adr/0018 point 2 — availability is per chosen studio; bound here so
  // TimeSlotPicker's `fetchSlots` prop keeps its existing (coachId, date,
  // serviceId, excludeBookingId?) shape. Recreated only when siteId changes,
  // not on every render, so it doesn't retrigger the picker's effect.
  const fetchSlots = useCallback(
    (coachId: string, date: string, serviceId: string) => getMemberAvailability(coachId, date, serviceId, siteId),
    [siteId],
  );

  if (!parqCleared) {
    return (
      <Alert severity="warning">
        <Typography variant="subtitle2">
          {referredToDoctor ? copy.readiness.referred : copy.readiness.pending}
        </Typography>
        <Typography variant="body2">
          {referredToDoctor ? copy.readiness.referredBody : copy.readiness.pendingBody}
        </Typography>
      </Alert>
    );
  }

  const service = serviceById(serviceId);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setStatus('saving');
    try {
      await createSelfBooking({ siteId, coachId, serviceId, date, time });
      setTime('');
      setSaved(true);
      onBooked();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.booking.failed);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <Stack component="form" onSubmit={onSubmit} spacing={2} sx={{ maxWidth: 420 }}>
      <Typography variant="h6">{copy.booking.heading}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success">{copy.booking.requested}</Alert>}

      <TextField
        select
        label={copy.booking.studio}
        value={siteId}
        onChange={(e) => {
          setSiteId(e.target.value);
          setCoachId('');
          setTime('');
        }}
        disabled={!sites || sites.length === 0}
      >
        {(sites ?? []).map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label={copy.booking.service}
        value={serviceId}
        onChange={(e) => {
          setServiceId(e.target.value);
          setTime('');
        }}
      >
        {SERVICES.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>
      {service && (
        <Typography variant="body2" color="text.secondary">
          {copy.booking.priceHint(service.mins, service.aed)}
        </Typography>
      )}

      <TextField
        select
        label={copy.booking.coach}
        value={coachId}
        onChange={(e) => {
          setCoachId(e.target.value);
          setTime('');
        }}
        disabled={!siteId || !coaches || coaches.length === 0}
      >
        {(coaches ?? []).map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        type="date"
        label={copy.booking.date}
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          setTime('');
        }}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <Box>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {copy.booking.time}
        </Typography>
        <TimeSlotPicker
          coachId={coachId}
          serviceId={serviceId}
          date={date}
          value={time}
          onChange={setTime}
          fetchSlots={fetchSlots}
          pickCoachFirstLabel={copy.booking.pickCoachFirst}
          loadingLabel={copy.booking.loadingSlots}
          noSlotsLabel={copy.booking.noSlots}
        />
      </Box>

      <Box>
        <Button type="submit" variant="contained" disabled={status === 'saving' || !time}>
          {status === 'saving' ? copy.booking.submitting : copy.booking.submit}
        </Button>
      </Box>
    </Stack>
  );
}
