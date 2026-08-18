'use client';
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { api } from '@/lib/store';
import type { Slot } from '@/lib/scheduling';

/* Replaces a raw time input with a coach's actual free slots for the chosen
   date+service — shift-aware and overlap-aware (lib/scheduling.ts via
   GET /coaches/:id/availability), so a manager can only pick a time that
   will be accepted. Module scope per CLAUDE.md's known trap: an inline
   sub-component here would remount on every snapshot poll and drop the
   picked time. Ported from the root product's TimeSlotPicker, adapted to
   the prototype's fetch-through-api() pattern instead of a server action. */
export default function TimeSlotPicker({
  coachId, serviceId, date, value, onChange, excludeBookingId,
}: {
  coachId: string; serviceId: string; date: string; value: string;
  onChange: (time: string) => void; excludeBookingId?: string;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);

  useEffect(() => {
    if (!coachId || !serviceId || !date) { setSlots(null); return; }
    let cancelled = false;
    const qs = new URLSearchParams({ date, serviceId, ...(excludeBookingId ? { excludeBookingId } : {}) });
    api('GET', `/coaches/${coachId}/availability?${qs}`, undefined, 'SYSTEM')
      .then((r) => { if (!cancelled) setSlots(r.slots); })
      .catch(() => { if (!cancelled) setSlots([]); });
    return () => { cancelled = true; };
  }, [coachId, serviceId, date, excludeBookingId]);

  if (!coachId || !serviceId || !date) {
    return <Typography variant="body2" color="text.secondary">Pick a coach, service and date first.</Typography>;
  }
  if (slots === null) {
    return <Typography variant="body2" color="text.secondary">Checking availability…</Typography>;
  }
  if (slots.length === 0) {
    return <Typography variant="body2" color="text.secondary">No slots — that coach has no shift on this date.</Typography>;
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
