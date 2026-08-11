'use server';

import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireStaff, requireStudioManager } from '@/lib/authz';
import { logAudit } from '@/lib/audit';

const today = () => new Date().toISOString().slice(0, 10);

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

/**
 * Manual booking entry by staff (blueprint Phase 1 — no member self-service
 * yet). Created directly as `confirmed` with a coach assigned: the studio
 * manager is both the intake point and the approver in this slice, so
 * there's no separate requester to wait on. `requested`/`declined` stay in
 * the schema for when member self-service booking (Phase 2) introduces a
 * real request origin distinct from the approver.
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
  const id = `bkg_${randomUUID()}`;
  await db.insert(schema.bookings).values({
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
