'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { getCoachDayAvailability } from '@/lib/actions/bookings';
import { copy } from './copy';
import type { Slot } from '@/lib/scheduling';

/* Replaces a raw <input type="time"> with the coach's actual free slots for
   the chosen date+service — shift-aware and overlap-aware (lib/scheduling.ts),
   so a manager can only ever pick a time that will be accepted. Module-scope
   per CLAUDE.md's known trap: an inline sub-component here would remount
   every time its parent (FloorPanel) re-renders and drop the picked time. */
export default function TimeSlotPicker({
  coachId,
  serviceId,
  date,
  value,
  onChange,
  excludeBookingId,
}: {
  coachId: string;
  serviceId: string;
  date: string;
  value: string;
  onChange: (time: string) => void;
  excludeBookingId?: string;
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
    getCoachDayAvailability(coachId, date, serviceId, excludeBookingId)
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
  }, [coachId, serviceId, date, excludeBookingId]);

  if (!coachId || !serviceId || !date) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {copy.booking.pickCoachFirst}
      </Typography>
    );
  }

  if (loading || slots === null) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {copy.booking.loadingSlots}
      </Typography>
    );
  }

  if (slots.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {copy.booking.noSlots}
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
