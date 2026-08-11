import type { getMemberContext } from '@/lib/actions/members';
import type { getCoachScheduleToday } from '@/lib/actions/bookings';

/* Derived from the action return types rather than restated, so a schema
   change shows up here as a type error instead of a silently stale shape. */

export type MemberContext = Awaited<ReturnType<typeof getMemberContext>>;

type BookingRow = Awaited<ReturnType<typeof getCoachScheduleToday>>[number];

/** What a coach's schedule row is allowed to carry into the client bundle:
 *  no `aed` (payment data is studio-manager-only, docs/adr/0008). Narrowed
 *  at the page, this type is what enforces it downstream. */
export type ScheduleBooking = {
  id: string;
  memberId: string;
  serviceId: string;
  time: string;
  status: BookingRow['status'];
};

/** Roster row for a coach: no phone/email, ever (docs/adr/0008).
 *  `hasOpenFlag` lets the list itself surface who needs attention, not just
 *  the member-context panel after tapping in (2026-08-11). */
export type RosterMember = {
  id: string;
  name: string;
  parqCleared: boolean;
  hasOpenFlag: boolean;
};
