import { STUDIO_HOURS, serviceById } from '@/lib/reference';

/* Pure scheduling math — no DB access. Single source of truth for "is this
   coach free at this time," reused by the overlap check (lib/actions/
   bookings.ts), the slot-chip picker (components/studio/TimeSlotPicker.tsx),
   the day timeline (components/studio/DayTimeline.tsx), and coach workload
   (lib/actions/coachWorkload.ts). See docs/adr/0011. */

export type Range = { start: number; end: number };

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** [start, end) for a booking given its service and start time. Null if the
 * service id is unrecognized (static reference data, see lib/reference.ts). */
export function bookingRange(serviceId: string, time: string): Range | null {
  const service = serviceById(serviceId);
  if (!service) return null;
  const start = timeToMinutes(time);
  return { start, end: start + service.mins };
}

/** Half-open ranges: a booking ending exactly when another starts is not
 * an overlap. */
export function rangesOverlap(a: Range, b: Range): boolean {
  return a.start < b.end && b.start < a.end;
}

export type BookingLike = { id: string; serviceId: string; time: string; status: string };

const INACTIVE_BOOKING_STATUSES = new Set(['declined', 'cancelled']);

export function computeBusyRanges(bookings: BookingLike[], excludeBookingId?: string): Range[] {
  return bookings
    .filter((b) => b.id !== excludeBookingId && !INACTIVE_BOOKING_STATUSES.has(b.status))
    .map((b) => bookingRange(b.serviceId, b.time))
    .filter((r): r is Range => r !== null);
}

export type ShiftLike = { startTime: string; endTime: string };

function shiftRanges(shifts: ShiftLike[]): Range[] {
  return shifts.map((s) => ({ start: timeToMinutes(s.startTime), end: timeToMinutes(s.endTime) }));
}

function withinAnyRange(range: Range, ranges: Range[]): boolean {
  return ranges.some((r) => range.start >= r.start && range.end <= r.end);
}

export type FreeSlotsInput = {
  shifts: ShiftLike[];
  bookings: BookingLike[];
  serviceMins: number;
  stepMins?: number;
  studioHours?: { openMinute: number; closeMinute: number };
  excludeBookingId?: string;
};

export type Slot = { time: string; available: boolean };

/** Candidate start times across the coach's shift windows (clamped to studio
 * hours), each marked available only if the full service duration fits
 * inside a shift and doesn't overlap an existing active booking. */
export function computeFreeSlots({
  shifts,
  bookings,
  serviceMins,
  stepMins = 30,
  studioHours = STUDIO_HOURS,
  excludeBookingId,
}: FreeSlotsInput): Slot[] {
  const busy = computeBusyRanges(bookings, excludeBookingId);
  const shiftWindows = shiftRanges(shifts);
  const slots: Slot[] = [];

  for (let start = studioHours.openMinute; start + serviceMins <= studioHours.closeMinute; start += stepMins) {
    const candidate: Range = { start, end: start + serviceMins };
    const inShift = withinAnyRange(candidate, shiftWindows);
    const free = inShift && !busy.some((r) => rangesOverlap(r, candidate));
    slots.push({ time: minutesToTime(start), available: free });
  }

  return slots;
}
