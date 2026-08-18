'use server';

import { randomUUID } from 'crypto';
import { eq, and, or, desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { assertMemberInScope, requireStaff, requireStudioManager } from '@/lib/authz';
import { requireMember } from '@/lib/memberAuth';
import { logAudit } from '@/lib/audit';
import { STUDIO_HOURS, serviceById } from '@/lib/reference';
import { bookingRange, computeBusyRanges, computeFreeSlots, minutesToTime, rangesOverlap } from '@/lib/scheduling';
import { notifyRecorded } from '@/lib/integrations/notifications';

/** Cancellation policy (docs/decisions.md, 2026-08-12): 24h notice for a
 *  full credit refund; inside that window (or a no-show), the consumed
 *  credit is forfeited. No fee beyond the credit itself — the blueprint
 *  names "cancellation policy" as a P2 item with no concrete numbers of
 *  its own, this is the number chosen. */
const CANCELLATION_NOTICE_HOURS = 24;

function hoursUntil(date: string, time: string): number {
  const target = new Date(`${date}T${time}:00`);
  return (target.getTime() - Date.now()) / (1000 * 60 * 60);
}

const today = () => new Date().toISOString().slice(0, 10);

const ACTIVE_BOOKING = ['requested', 'confirmed'] as const;

/** A member-chosen `siteId` is a client-supplied input, never a fact
 *  (CLAUDE.md Iron Rule) — validated against the real `sites` table before
 *  it can drive an availability read or a booking write. `docs/adr/0018`
 *  point 2: booking is fully decoupled from a member's home site, so this
 *  replaces every place that used to trust `session.siteId` for a booking. */
async function assertActiveSite(siteId: string) {
  const [site] = await db
    .select({ id: schema.sites.id })
    .from(schema.sites)
    .where(and(eq(schema.sites.id, siteId), eq(schema.sites.active, true)))
    .limit(1);
  if (!site) throw new Error('Unknown or inactive studio.');
}

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

/** Shared query core behind `getCoachDayAvailability` (staff) and
 *  `getMemberAvailability` (member self-booking) — same shift/booking read,
 *  same `computeFreeSlots` math, different callers with different
 *  authorization gates around them. Keeping this in one place is what
 *  guarantees a member can only ever pick a slot the write path would also
 *  accept, same guarantee `TimeSlotPicker` already relies on for staff. */
async function computeCoachAvailability(coachId: string, date: string, serviceId: string, siteId: string, excludeBookingId?: string) {
  const service = serviceById(serviceId);
  if (!service) throw new Error('Unknown service.');

  const [shifts, bookings] = await Promise.all([
    db
      .select({ startTime: schema.shifts.startTime, endTime: schema.shifts.endTime })
      .from(schema.shifts)
      .where(and(eq(schema.shifts.staffId, coachId), eq(schema.shifts.date, date), eq(schema.shifts.siteId, siteId))),
    db
      .select({ id: schema.bookings.id, serviceId: schema.bookings.serviceId, time: schema.bookings.time, status: schema.bookings.status })
      .from(schema.bookings)
      .where(and(eq(schema.bookings.coachId, coachId), eq(schema.bookings.date, date), eq(schema.bookings.siteId, siteId))),
  ]);

  return computeFreeSlots({ shifts, bookings, serviceMins: service.mins, excludeBookingId });
}

/** Backs the slot-chip time picker: which start times for `serviceId` are
 *  actually free for `coachId` on `date`, respecting their assigned shifts,
 *  studio hours, and existing bookings (lib/scheduling.ts). `excludeBookingId`
 *  lets a booking's own current slot stay selectable while rescheduling it. */
export async function getCoachDayAvailability(coachId: string, date: string, serviceId: string, excludeBookingId?: string) {
  const session = await requireStudioManager();
  return computeCoachAvailability(coachId, date, serviceId, session.siteId, excludeBookingId);
}

/** Member-facing counterpart — `docs/adr/0018` point 2: a member can book
 *  at any studio, so `siteId` is now a caller-supplied, server-validated
 *  parameter rather than always `session.siteId`. */
export async function getMemberAvailability(coachId: string, date: string, serviceId: string, siteId: string) {
  await requireMember();
  await assertActiveSite(siteId);
  return computeCoachAvailability(coachId, date, serviceId, siteId);
}

/** Active coaches at the chosen site — id/name only, no contact or
 *  internal fields, for the self-booking coach picker. `siteId` is now
 *  caller-supplied and validated, not always the member's own site
 *  (`docs/adr/0018` point 2) — the coach list is site-dependent since a
 *  coach only ever works one site. The site list itself for the studio
 *  picker reuses `getActiveSites` from `lib/actions/memberAuth.ts` (the
 *  same public site list `/join`'s registration picker already uses)
 *  rather than a second copy here. */
export async function getActiveCoachesAtSite(siteId: string) {
  await requireMember();
  await assertActiveSite(siteId);
  return db
    .select({ id: schema.staff.id, name: schema.staff.name })
    .from(schema.staff)
    .where(and(eq(schema.staff.siteId, siteId), eq(schema.staff.role, 'coach'), eq(schema.staff.active, true)))
    .orderBy(schema.staff.name);
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

/**
 * Member self-booking (blueprint Phase 2). Lands as `requested`, not
 * `confirmed` — per the note on `createBooking` above, a caller booking on
 * someone else's behalf (a studio manager, already the approver) can
 * auto-confirm; a member booking for themselves cannot skip approval.
 * `approveBooking` (below) is that not-yet-built sibling to
 * `declineBooking`, now built. `aed` is always derived from the price
 * list, never client-supplied — same rule as everywhere else money touches
 * a form in this codebase. `siteId` is caller-supplied and validated, not
 * derived from `session.siteId` — `docs/adr/0018` point 2, a member can
 * book at any studio, not just their registration site.
 */
export async function createSelfBooking(input: { siteId: string; coachId: string; serviceId: string; date: string; time: string }) {
  const session = await requireMember();
  if (!session.parqCleared) {
    throw new Error('You need a readiness screening with a coach before you can book — visit the studio to get started.');
  }
  await assertActiveSite(input.siteId);
  const service = serviceById(input.serviceId);
  if (!service) throw new Error('Unknown service.');

  const id = `bkg_${randomUUID()}`;
  await db.transaction(async (tx) => {
    await assertNoOverlap(tx, {
      coachId: input.coachId,
      memberId: session.memberId,
      date: input.date,
      serviceId: input.serviceId,
      time: input.time,
    });
    await tx.insert(schema.bookings).values({
      id,
      memberId: session.memberId,
      coachId: input.coachId,
      siteId: input.siteId,
      serviceId: input.serviceId,
      date: input.date,
      time: input.time,
      aed: service.aed,
      status: 'requested',
    });
    // Accounting, not a gate (docs/decisions.md, 2026-08-12) — this pass
    // deliberately does not check balance first, so a zero-or-negative
    // balance never blocks a booking. recordedByStaffId is null: no staff
    // actor, same reasoning as the missing logAudit call below.
    await tx.insert(schema.creditLedger).values({
      memberId: session.memberId,
      type: 'consumption',
      credits: -1,
      relatedBookingId: id,
      note: `Booking ${id}`,
    });
  });
  // No logAudit call here, deliberately: audit_log.actorStaffId is a
  // non-null staff foreign key, and a member booking for themselves has no
  // staff actor to attribute it to — same reasoning as registerMember's
  // (lib/actions/memberAuth.ts). The booking row itself, `requested` with
  // no approver until approveBooking runs, is the record.
  await notifyRecorded({
    memberId: session.memberId,
    template: 'booking_requested',
    channel: 'whatsapp',
    payload: { bookingId: id, date: input.date, time: input.time, serviceId: input.serviceId },
  });
  return id;
}

/** `declineBooking`'s sibling — confirms a `requested` booking (self-booked
 *  by a member, or any other requested-not-yet-approved row). Reuses the
 *  same `booking_approved` audit action `createBooking` already writes. */
export async function approveBooking(bookingId: string) {
  const session = await requireStudioManager();
  const [booking] = await db.select().from(schema.bookings).where(and(eq(schema.bookings.id, bookingId), eq(schema.bookings.siteId, session.siteId))).limit(1);
  await db
    .update(schema.bookings)
    .set({ status: 'confirmed', approvedByStaffId: session.staffId, approvedAt: new Date() })
    .where(and(eq(schema.bookings.id, bookingId), eq(schema.bookings.siteId, session.siteId)));
  await logAudit(session.staffId, 'booking_approved', 'booking', bookingId);
  if (booking) {
    await notifyRecorded({
      memberId: booking.memberId,
      template: 'booking_confirmed',
      channel: 'whatsapp',
      payload: { bookingId, date: booking.date, time: booking.time, serviceId: booking.serviceId },
    });
  }
}

/** The signed-in member's own bookings, newest first — the "My bookings"
 *  section of /member. No `assertMemberInScope` needed: a member can only
 *  ever be their own session's memberId. */
export async function getMemberOwnBookings() {
  const session = await requireMember();
  return db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.memberId, session.memberId))
    .orderBy(desc(schema.bookings.date), desc(schema.bookings.time));
}

/** 24h cancellation policy (docs/decisions.md, 2026-08-12): ≥24h notice
 *  refunds the consumed credit; inside that window, it's forfeited — no
 *  refund entry written. A member can only cancel their own booking, and
 *  only while it's still active. */
export async function cancelSelfBooking(bookingId: string) {
  const session = await requireMember();
  const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).limit(1);
  if (!booking || booking.memberId !== session.memberId) throw new Error('Booking not found.');
  if (!ACTIVE_BOOKING.includes(booking.status as (typeof ACTIVE_BOOKING)[number])) {
    throw new Error('Only a requested or confirmed booking can be cancelled.');
  }

  const refunded = hoursUntil(booking.date, booking.time) >= CANCELLATION_NOTICE_HOURS;
  await db.transaction(async (tx) => {
    await tx.update(schema.bookings).set({ status: 'cancelled' }).where(eq(schema.bookings.id, bookingId));
    if (refunded) {
      await tx.insert(schema.creditLedger).values({
        memberId: session.memberId,
        type: 'refund',
        credits: 1,
        relatedBookingId: bookingId,
        note: `Cancelled ${CANCELLATION_NOTICE_HOURS}h+ before ${booking.date} ${booking.time}`,
      });
    }
  });
  await notifyRecorded({
    memberId: session.memberId,
    template: 'booking_cancelled',
    channel: 'whatsapp',
    payload: { bookingId, date: booking.date, time: booking.time, refunded },
  });
  return { refunded };
}

/** Declining a self-booking (which already wrote a `consumption` entry at
 *  request time, unlike a staff-created booking, which never touches the
 *  ledger) must refund it — the member did nothing wrong; the studio
 *  said no. Refund is unconditional here, not subject to the 24h policy
 *  above, which only applies to a member's own choice to cancel. */
export async function declineBooking(bookingId: string) {
  const session = await requireStudioManager();
  const [booking] = await db.select().from(schema.bookings).where(and(eq(schema.bookings.id, bookingId), eq(schema.bookings.siteId, session.siteId))).limit(1);
  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({ status: 'declined', approvedByStaffId: session.staffId, approvedAt: new Date() })
      .where(and(eq(schema.bookings.id, bookingId), eq(schema.bookings.siteId, session.siteId)));

    if (booking) {
      const [consumed] = await tx
        .select({ id: schema.creditLedger.id })
        .from(schema.creditLedger)
        .where(and(eq(schema.creditLedger.relatedBookingId, bookingId), eq(schema.creditLedger.type, 'consumption')))
        .limit(1);
      if (consumed) {
        await tx.insert(schema.creditLedger).values({
          memberId: booking.memberId,
          type: 'refund',
          credits: 1,
          relatedBookingId: bookingId,
          note: `Declined by studio — ${bookingId}`,
          recordedByStaffId: session.staffId,
        });
      }
    }
  });
  await logAudit(session.staffId, 'booking_declined', 'booking', bookingId);
  if (booking) {
    await notifyRecorded({
      memberId: booking.memberId,
      template: 'booking_declined',
      channel: 'whatsapp',
      payload: { bookingId, date: booking.date, time: booking.time },
    });
  }
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
 *  calls: coaches are excluded from payment data (docs/adr/0008). Not
 *  site-filtered: `assertMemberInScope` already grants open-roster access
 *  to this member regardless of site (`docs/adr/0018` point 3), and a
 *  member can now book at any studio (point 2) — filtering this read to
 *  `session.siteId` would silently hide bookings made elsewhere instead of
 *  showing the member's real history. */
export async function getMemberBookingHistory(memberId: string) {
  const session = await requireStudioManager();
  await assertMemberInScope(session, memberId);
  return db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.memberId, memberId))
    .orderBy(desc(schema.bookings.date), desc(schema.bookings.time));
}
