'use client';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { STUDIO_HOURS, serviceById } from '@/lib/reference';
import { timeToMinutes } from '@/lib/scheduling';
import { copy } from './copy';
import { formatDay } from './primitives';
import type { Booking, Shift, StaffMember } from './types';

/* Visual free-slot representation for the Floor tab's viewed date — one row
   per coach, studio-hours axis, shift window shaded, bookings as blocks.
   Module scope (CLAUDE.md's known trap) since it's a sibling of the
   booking form, not nested inside it. Logical CSS properties throughout
   (insetInlineStart/inlineSize, not left/width) per the English-now,
   Arabic-RTL-later Iron Rule — this is a position-heavy component, the
   one place that rule bites hardest. */

const TRACK_MINUTES = STUDIO_HOURS.closeMinute - STUDIO_HOURS.openMinute;
const HOUR_MARKS = Array.from(
  { length: Math.floor(TRACK_MINUTES / 60) + 1 },
  (_, i) => STUDIO_HOURS.openMinute + i * 60,
);

function pct(minutes: number) {
  return ((minutes - STUDIO_HOURS.openMinute) / TRACK_MINUTES) * 100;
}

const STATUS_COLOR: Record<Booking['status'], string> = {
  requested: 'grey.500',
  confirmed: 'primary.main',
  completed: 'grey.600',
  declined: 'error.main',
  cancelled: 'error.main',
};

export default function DayTimeline({
  date,
  coaches,
  bookings,
  shifts,
}: {
  date: string;
  coaches: StaffMember[];
  bookings: Booking[];
  shifts: Shift[];
}) {
  const shiftsByCoach = new Map<string, Shift[]>();
  for (const shift of shifts) {
    shiftsByCoach.set(shift.staffId, [...(shiftsByCoach.get(shift.staffId) ?? []), shift]);
  }
  const bookingsByCoach = new Map<string, Booking[]>();
  for (const booking of bookings) {
    if (!booking.coachId || booking.status === 'declined' || booking.status === 'cancelled') continue;
    bookingsByCoach.set(booking.coachId, [...(bookingsByCoach.get(booking.coachId) ?? []), booking]);
  }
  const rostered = coaches.filter((c) => shiftsByCoach.has(c.id) || bookingsByCoach.has(c.id));

  return (
    <Box>
      {rostered.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {copy.timeline.empty}
        </Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minInlineSize: 640 }}>
            <Box sx={{ display: 'flex', marginInlineStart: '128px', mb: 0.5 }}>
              {HOUR_MARKS.map((m) => (
                <Typography
                  key={m}
                  variant="caption"
                  sx={{ flex: 1, color: 'text.secondary', textAlign: 'start' }}
                >
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
                    <Typography
                      variant="body2"
                      sx={{ inlineSize: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {coach.name}
                    </Typography>
                    <Box
                      sx={{
                        position: 'relative',
                        flexGrow: 1,
                        blockSize: 32,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                      }}
                    >
                      {coachShifts.map((shift) => {
                        const start = pct(timeToMinutes(shift.startTime));
                        const end = pct(timeToMinutes(shift.endTime));
                        return (
                          <Box
                            key={shift.id}
                            sx={{
                              position: 'absolute',
                              insetInlineStart: `${start}%`,
                              inlineSize: `${end - start}%`,
                              insetBlock: 0,
                              bgcolor: 'action.selected',
                              borderRadius: 1,
                            }}
                          />
                        );
                      })}
                      {coachBookings.map((booking) => {
                        const service = serviceById(booking.serviceId);
                        const startMin = timeToMinutes(booking.time);
                        const endMin = startMin + (service?.mins ?? 30);
                        const start = pct(startMin);
                        const width = pct(endMin) - start;
                        return (
                          <Tooltip
                            key={booking.id}
                            title={`${booking.time}–${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')} · ${service?.name ?? booking.serviceId}`}
                          >
                            <Box
                              sx={{
                                position: 'absolute',
                                insetInlineStart: `${start}%`,
                                inlineSize: `${Math.max(width, 1)}%`,
                                insetBlockStart: 2,
                                insetBlockEnd: 2,
                                bgcolor: STATUS_COLOR[booking.status],
                                borderRadius: 0.5,
                              }}
                            />
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
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {formatDay(date)}
      </Typography>
    </Box>
  );
}
