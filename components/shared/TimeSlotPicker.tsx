'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type { Slot } from '@/lib/scheduling';

/* Replaces a raw <input type="time"> with a coach's actual free slots for
   the chosen date+service — shift-aware and overlap-aware (lib/scheduling.ts),
   so whoever is booking can only ever pick a time the write path would also
   accept. Shared by the studio manager's booking form and the member
   self-booking form (docs/adr/0014) — same picker, different `fetchSlots`
   (getCoachDayAvailability vs. getMemberAvailability), so the two callers'
   different authorization gates stay in their own server actions rather
   than being threaded through this component. Module-scope per CLAUDE.md's
   known trap: an inline sub-component here would remount on every parent
   re-render and drop the picked time. */
export default function TimeSlotPicker({
  coachId,
  serviceId,
  date,
  value,
  onChange,
  excludeBookingId,
  fetchSlots,
  pickCoachFirstLabel,
  loadingLabel,
  noSlotsLabel,
}: {
  coachId: string;
  serviceId: string;
  date: string;
  value: string;
  onChange: (time: string) => void;
  excludeBookingId?: string;
  fetchSlots: (coachId: string, date: string, serviceId: string, excludeBookingId?: string) => Promise<Slot[]>;
  pickCoachFirstLabel: string;
  loadingLabel: string;
  noSlotsLabel: string;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!coachId || !serviceId || !date) {
      setSlots(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchSlots(coachId, date, serviceId, excludeBookingId)
      .then((result) => {
        if (!cancelled) setSlots(result);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coachId, serviceId, date, excludeBookingId, fetchSlots]);

  if (!coachId || !serviceId || !date) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {pickCoachFirstLabel}
      </Typography>
    );
  }

  if (loading || slots === null) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {loadingLabel}
      </Typography>
    );
  }

  if (slots.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {noSlotsLabel}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {slots.map((slot) => (
        <Chip
          key={slot.time}
          label={slot.time}
          clickable={slot.available}
          disabled={!slot.available}
          color={value === slot.time ? 'primary' : 'default'}
          variant={value === slot.time ? 'filled' : 'outlined'}
          onClick={() => slot.available && onChange(slot.time)}
        />
      ))}
    </Box>
  );
}
