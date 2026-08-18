'use client';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { STUDIO_HOURS, service } from '@/lib/reference';
import { timeToMinutes } from '@/lib/scheduling';

/* One row per coach, studio-hours axis, shift window shaded, bookings as
   blocks — the floor at a glance. Module scope (CLAUDE.md's known trap),
   ported from the root product's studio/DayTimeline.tsx. Logical CSS
   properties throughout (insetInlineStart/inlineSize, not left/width) per
   the English-now, Arabic-RTL-later Iron Rule. */

const TRACK_MINUTES = STUDIO_HOURS.closeMinute - STUDIO_HOURS.openMinute;
const HOUR_MARKS = Array.from(
  { length: Math.floor(TRACK_MINUTES / 60) + 1 },
  (_, i) => STUDIO_HOURS.openMinute + i * 60,
);
const pct = (minutes: number) => ((minutes - STUDIO_HOURS.openMinute) / TRACK_MINUTES) * 100;

const STATUS_COLOR: Record<string, string> = {
  requested: 'grey.500', confirmed: 'primary.main', completed: 'grey.600', cancelled: 'error.main',
};

export default function DayTimeline({
  coaches, bookings, shifts,
}: {
  coaches: { id: string; name: string }[];
  bookings: { id: string; coachId: string | null; serviceId: string; time: string; status: string }[];
  shifts: { id: string; coachId: string; startTime: string; endTime: string }[];
}) {
  const shiftsByCoach = new Map<string, typeof shifts>();
  for (const shift of shifts) shiftsByCoach.set(shift.coachId, [...(shiftsByCoach.get(shift.coachId) ?? []), shift]);
  const bookingsByCoach = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    if (!booking.coachId || booking.status === 'cancelled') continue;
    bookingsByCoach.set(booking.coachId, [...(bookingsByCoach.get(booking.coachId) ?? []), booking]);
  }
  const rostered = coaches.filter((c) => shiftsByCoach.has(c.id) || bookingsByCoach.has(c.id));

  if (rostered.length === 0) {
    return <Typography variant="body2" color="text.secondary">Nobody rostered on this date.</Typography>;
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minInlineSize: 640 }}>
        <Box sx={{ display: 'flex', marginInlineStart: '128px', mb: 0.5 }}>
          {HOUR_MARKS.map((m) => (
            <Typography key={m} variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: 'start' }}>
              {String(Math.floor(m / 60)).padStart(2, '0')}:00
            </Typography>
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {rostered.map((coach) => {
            const coachShifts = shiftsByCoach.get(coach.id) ?? [];
            const coachBookings = bookingsByCoach.get(coach.id) ?? [];
            return (
              <Box key={coach.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ inlineSize: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {coach.name}
                </Typography>
                <Box sx={{ position: 'relative', flexGrow: 1, blockSize: 32, bgcolor: 'action.hover', borderRadius: 1 }}>
                  {coachShifts.map((shift) => {
                    const start = pct(timeToMinutes(shift.startTime));
                    const end = pct(timeToMinutes(shift.endTime));
                    return (
                      <Box key={shift.id} sx={{
                        position: 'absolute', insetInlineStart: `${start}%`, inlineSize: `${end - start}%`,
                        insetBlock: 0, bgcolor: 'action.selected', borderRadius: 1,
                      }} />
                    );
                  })}
                  {coachBookings.map((booking) => {
                    const sv = service(booking.serviceId);
                    const startMin = timeToMinutes(booking.time);
                    const endMin = startMin + (sv?.mins ?? 30);
                    const start = pct(startMin);
                    const width = pct(endMin) - start;
                    return (
                      <Tooltip key={booking.id} title={`${booking.time}–${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')} · ${sv?.name ?? booking.serviceId}`}>
                        <Box sx={{
                          position: 'absolute', insetInlineStart: `${start}%`, inlineSize: `${Math.max(width, 1)}%`,
                          insetBlockStart: 2, insetBlockEnd: 2, bgcolor: STATUS_COLOR[booking.status] ?? 'grey.500', borderRadius: 0.5,
                        }} />
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
