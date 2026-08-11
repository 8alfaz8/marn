import {
  timeToMinutes,
  minutesToTime,
  bookingRange,
  rangesOverlap,
  computeBusyRanges,
  computeFreeSlots,
} from '../lib/scheduling';

/* Plain-assertion checks for lib/scheduling.ts, run via `npx tsx
   scripts/test-scheduling.ts`. No test-runner dependency added — matches
   the repo's existing tsx-for-scripts pattern (db/seed.ts). */

let failures = 0;

function check(label: string, condition: boolean) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${label}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

// timeToMinutes / minutesToTime round-trip
check('timeToMinutes parses 09:30', timeToMinutes('09:30') === 570);
check('minutesToTime formats 570', minutesToTime(570) === '09:30');
check('minutesToTime pads single digits', minutesToTime(65) === '01:05');

// bookingRange
check('bookingRange st60 at 14:00 -> 14:00-15:00', (() => {
  const r = bookingRange('st60', '14:00');
  return r?.start === 840 && r?.end === 900;
})());
check('bookingRange unknown service -> null', bookingRange('nope', '14:00') === null);

// rangesOverlap — adjacent (end == start) is NOT an overlap
check('adjacent ranges do not overlap', !rangesOverlap({ start: 840, end: 900 }, { start: 900, end: 930 }));
check('overlapping ranges detected', rangesOverlap({ start: 840, end: 900 }, { start: 870, end: 930 }));
check('non-overlapping ranges detected as free', !rangesOverlap({ start: 840, end: 900 }, { start: 1000, end: 1030 }));

// computeBusyRanges excludes declined/cancelled and the excluded id
const bookings = [
  { id: 'b1', serviceId: 'st60', time: '14:00', status: 'confirmed' },
  { id: 'b2', serviceId: 'st30', time: '16:00', status: 'declined' },
  { id: 'b3', serviceId: 'st30', time: '17:00', status: 'cancelled' },
  { id: 'b4', serviceId: 'st30', time: '18:00', status: 'requested' },
];
check('computeBusyRanges drops declined/cancelled', computeBusyRanges(bookings).length === 2);
check('computeBusyRanges honors excludeBookingId', computeBusyRanges(bookings, 'b1').length === 1);

// computeFreeSlots respects shift boundaries
const shifts = [{ startTime: '09:00', endTime: '12:00' }];
const slotsInShift = computeFreeSlots({ shifts, bookings: [], serviceMins: 30, stepMins: 30 });
check(
  'computeFreeSlots marks 09:00 available (inside shift)',
  slotsInShift.find((s) => s.time === '09:00')?.available === true,
);
check(
  'computeFreeSlots marks 13:00 unavailable (outside shift)',
  slotsInShift.find((s) => s.time === '13:00')?.available === false,
);

// computeFreeSlots respects studio hours clamp
const slotsNoShift = computeFreeSlots({
  shifts: [{ startTime: '06:00', endTime: '23:00' }],
  bookings: [],
  serviceMins: 30,
  stepMins: 30,
});
check('computeFreeSlots never offers a slot before studio open (08:00)', !slotsNoShift.some((s) => timeToMinutesGuard(s.time) < 480));
check('computeFreeSlots never offers a slot that would run past studio close (22:00)', slotsNoShift.every((s) => timeToMinutesGuard(s.time) + 30 <= 1320));

function timeToMinutesGuard(t: string) {
  return timeToMinutes(t);
}

// computeFreeSlots respects existing bookings
const busyShift = [{ startTime: '08:00', endTime: '22:00' }];
const busyBookings = [{ id: 'b1', serviceId: 'st60', time: '14:00', status: 'confirmed' }];
const slotsBusy = computeFreeSlots({ shifts: busyShift, bookings: busyBookings, serviceMins: 30, stepMins: 30 });
check('computeFreeSlots blocks 14:00 (overlaps existing booking)', slotsBusy.find((s) => s.time === '14:00')?.available === false);
check('computeFreeSlots blocks 14:30 (overlaps existing booking)', slotsBusy.find((s) => s.time === '14:30')?.available === false);
check('computeFreeSlots allows 15:00 (booking just ended)', slotsBusy.find((s) => s.time === '15:00')?.available === true);
check('computeFreeSlots allows 13:30 (30-min service ends exactly at 14:00)', slotsBusy.find((s) => s.time === '13:30')?.available === true);

// computeFreeSlots excludeBookingId lets a booking's own slot stay available (for reschedule)
const slotsExcluded = computeFreeSlots({
  shifts: busyShift,
  bookings: busyBookings,
  serviceMins: 60,
  stepMins: 30,
  excludeBookingId: 'b1',
});
check('computeFreeSlots with excludeBookingId frees the booking\'s own slot', slotsExcluded.find((s) => s.time === '14:00')?.available === true);

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nAll scheduling checks passed.');
}
