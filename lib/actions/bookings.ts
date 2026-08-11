'use server';

import { randomUUID } from 'crypto';
import { eq, and, or, desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { assertMemberInScope, requireStaff, requireStudioManager } from '@/lib/authz';
import { logAudit } from '@/lib/audit';
import { STUDIO_HOURS, serviceById } from '@/lib/reference';
import { bookingRange, computeBusyRanges, computeFreeSlots, minutesToTime, rangesOverlap } from '@/lib/scheduling';

const today = () => new Date().toISOString().slice(0, 10);

const ACTIVE_BOOKING = ['requested', 'confirmed'] as const;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The one place "is this coach/member free then" gets enforced for a write.
 * Runs inside the caller's transaction so the read-then-insert can't race
 * with a concurrent booking for the same slot. Shared by createBooking,
 * rescheduleBooking, and reassignCoach so the guarantee can't drift between
 * them (docs/adr/0011, lib/scheduling.ts).
 */
async function assertNoOverlap(
  tx: Tx,
  input: { coachId: string; memberId: string; date: string; serviceId: string; time: string; excludeBookingId?: string },
) {
  const candidate = bookingRange(input.serviceId, input.time);
  if (!candidate) throw new Error('Unknown service.');
  if (candidate.start < STUDIO_HOURS.openMinute || candidate.end > STUDIO_HOURS.closeMinute) {
    throw new Error(`Studio hours are ${minutesToTime(STUDIO_HOURS.openMinute)}–${minutesToTime(STUDIO_HOURS.closeMinute)}.`);
  }

  const sameDay = await tx
    .select({
      id: schema.bookings.id,
      serviceId: schema.bookings.serviceId,
      time: schema.bookings.time,
      status: schema.bookings.status,
      coachId: schema.bookings.coachId,
      memberId: schema.bookings.memberId,
    })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.date, input.date), or(eq(schema.bookings.coachId, input.coachId), eq(schema.bookings.memberId, input.memberId))));

  const coachBusy = computeBusyRanges(sameDay.filter((b) => b.coachId === input.coachId), input.excludeBookingId);
  if (coachBusy.some((r) => rangesOverlap(r, candidate))) {
    throw new Error('This coach already has a booking at that time.');
  }

  const memberBusy = computeBusyRanges(sameDay.filter((b) => b.memberId === input.memberId), input.excludeBookingId);
  if (memberBusy.some((r) => rangesOverlap(r, candidate))) {
    throw new Error('This member already has a booking at that time.');
  }
}

/** Read-only for the coach — booking confirm/decline/reassign is the studio
 *  manager's exclusively in this slice (docs/adr/0008). */
export async function getCoachScheduleToday() {
  const session = await requireStaff();
  return db
    .select()
    .from(schema.bookings)
    .where(and(eq(schema.bookings.coachId, session.staffId), eq(schema.bookings.date, today())))
    .orderBy(schema.bookings.time);
}

export async function getManagerScheduleToday() {
  const session = await requireStudioManager();
  return db
    .select()
    .from(schema.bookings)
    .where(and(eq(schema.bookings.siteId, session.siteId), eq(schema.bookings.date, today())))
    .orderBy(schema.bookings.time);
}

/** Generalizes getManagerScheduleToday to any date the manager is viewing
 *  (Floor tab's day picker) — bookings and shifts together, both site-scoped. */
export async function getDaySchedule(date: string) {
  const session = await requireStudioManager();
  const [bookings, shifts] = await Promise.all([
    db
      .select()
      .from(schema.bookings)
      .where(and(eq(schema.bookings.siteId, session.siteId), eq(schema.bookings.date, date)))
      .orderBy(schema.bookings.time),
    db
      .select()
      .from(schema.shifts)
      .where(and(eq(schema.shifts.siteId, session.siteId), eq(schema.shifts.date, date))),
  ]);
  return { bookings, shifts };
}

/** Backs the slot-chip time picker: which start times for `serviceId` are
 *  actually free for `coachId` on `date`, respecting their assigned shifts,
 *  studio hours, and existing bookings (lib/scheduling.ts). `excludeBookingId`
 *  lets a booking's own current slot stay selectable while rescheduling it. */
export async function getCoachDayAvailability(coachId: string, date: string, serviceId: string, excludeBookingId?: string) {
  const session = await requireStudioManager();
  const service = serviceById(serviceId);
  if (!service) throw new Error('Unknown service.');

  const [shifts, bookings] = await Promise.all([
    db
      .select({ startTime: schema.shifts.startTime, endTime: schema.shifts.endTime })
      .from(schema.shifts)
      .where(and(eq(schema.shifts.staffId, coachId), eq(schema.shifts.date, date), eq(schema.shifts.siteId, session.siteId))),
    db
      .select({ id: schema.bookings.id, serviceId: schema.bookings.serviceId, time: schema.bookings.time, status: schema.bookings.status })
      .from(schema.bookings)
      .where(and(eq(schema.bookings.coachId, coachId), eq(schema.bookings.date, date), eq(schema.bookings.siteId, session.siteId))),
  ]);

  return computeFreeSlots({ shifts, bookings, serviceMins: service.mins, excludeBookingId });
}

/**
 * Manual booking entry by staff (blueprint Phase 1 — no member self-service
 * yet). Created directly as `confirmed`: confirmed by the product owner
 * 2026-08-11 — "if creator is manager, then no need of approval, anyone
 * else need approve." This function is `requireStudioManager()`-gated, so
 * every caller today *is* the approver, which is why auto-confirm is safe
 * here. If a future caller creates a booking on someone else's behalf (a
 * coach quick-add, Phase 2 member self-service), that path must land the
 * booking as `requested` and go through `declineBooking`'s sibling
 * (a not-yet-built `approveBooking`) rather than reusing this function's
 * auto-confirm behaviour.
 */
export async function createBooking(input: {
  memberId: string;
  coachId: string;
  serviceId: string;
  date: string;
  time: string;
  aed: number;
}) {
  const session = await requireStudioManager();
  const member = await assertMemberInScope(session, input.memberId);
  if (!member.parqCleared) {
    throw new Error('This member has not been cleared by a readiness screening yet — book their PAR-Q with a coach first.');
  }
  const id = `bkg_${randomUUID()}`;
  await db.transaction(async (tx) => {
    await assertNoOverlap(tx, input);
    await tx.insert(schema.bookings).values({
      id,
      memberId: input.memberId,
      coachId: input.coachId,
      siteId: session.siteId,
      serviceId: input.serviceId,
      date: input.date,
      time: input.time,
      aed: input.aed,
      status: 'confirmed',
      approvedByStaffId: session.staffId,
      approvedAt: new Date(),
    });
  });
  await logAudit(session.staffId, 'booking_approved', 'booking', id);
  return id;
}

export async function declineBooking(bookingId: string) {
  const session = await requireStudioManager();
  await db
    .update(schema.bookings)
    .set({ status: 'declined', approvedByStaffId: session.staffId, approvedAt: new Date() })
    .where(and(eq(schema.bookings.id, bookingId), eq(schema.bookings.siteId, session.siteId)));
  await logAudit(session.staffId, 'booking_declined', 'booking', bookingId);
}

/** Loads a booking scoped to the manager's site, rejecting one that's
 *  already past the point of being moved (blueprint: a completed/declined/
 *  cancelled booking is a record, not something still on the floor). */
async function loadActiveBooking(tx: Tx, bookingId: string, siteId: string) {
  const [booking] = await tx
    .select()
    .from(schema.bookings)
    .where(and(eq(schema.bookings.id, bookingId), eq(schema.bookings.siteId, siteId)));
  if (!booking) throw new Error('Booking not found.');
  if (!ACTIVE_BOOKING.includes(booking.status as (typeof ACTIVE_BOOKING)[number])) {
    throw new Error('Only a requested or confirmed booking can be moved.');
  }
  return booking;
}

export async function rescheduleBooking(bookingId: string, date: string, time: string) {
  const session = await requireStudioManager();
  await db.transaction(async (tx) => {
    const booking = await loadActiveBooking(tx, bookingId, session.siteId);
    await assertNoOverlap(tx, {
      coachId: booking.coachId ?? '',
      memberId: booking.memberId,
      date,
      time,
      serviceId: booking.serviceId,
      excludeBookingId: bookingId,
    });
    await tx.update(schema.bookings).set({ date, time }).where(eq(schema.bookings.id, bookingId));
  });
  await logAudit(session.staffId, 'booking_rescheduled', 'booking', bookingId);
}

export async function reassignCoach(bookingId: string, coachId: string) {
  const session = await requireStudioManager();
  await db.transaction(async (tx) => {
    const booking = await loadActiveBooking(tx, bookingId, session.siteId);
    await assertNoOverlap(tx, {
      coachId,
      memberId: booking.memberId,
      date: booking.date,
      time: booking.time,
      serviceId: booking.serviceId,
      excludeBookingId: bookingId,
    });
    await tx.update(schema.bookings).set({ coachId }).where(eq(schema.bookings.id, bookingId));
  });
  await logAudit(session.staffId, 'booking_reassigned', 'booking', bookingId);
}

/** A member's booking/charge history — studio-manager-only, deliberately not
 *  part of `getMemberContext` (lib/actions/members.ts), which a coach also
 *  calls: coaches are excluded from payment data (docs/adr/0008). */
export async function getMemberBookingHistory(memberId: string) {
  const session = await requireStudioManager();
  await assertMemberInScope(session, memberId);
  return db
    .select()
    .from(schema.bookings)
    .where(and(eq(schema.bookings.memberId, memberId), eq(schema.bookings.siteId, session.siteId)))
    .orderBy(desc(schema.bookings.date), desc(schema.bookings.time));
}
