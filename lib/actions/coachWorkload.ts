'use server';

import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { db, schema } from '@/db';
import { ForbiddenError, requireStudioManagerOrSuperadmin } from '@/lib/authz';
import { serviceById } from '@/lib/reference';
import { timeToMinutes } from '@/lib/scheduling';

const daysAhead = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const daysAgoDate = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const ACTIVE_BOOKING = new Set(['requested', 'confirmed']);

/**
 * How packed or free each coach is: shift hours and booked hours over the
 * next 7 days, sessions actually completed in the last 7 — "how packed or
 * free the coaches are" (item #8). A studio manager gets their own site
 * only; a superadmin can pass `siteId` to filter or omit it for every site.
 */
export async function getCoachWorkload(siteId?: string) {
  const session = await requireStudioManagerOrSuperadmin();
  const scopedSiteId = session.role === 'studio_manager' ? session.siteId : siteId;

  const coachFilter = scopedSiteId
    ? and(eq(schema.staff.role, 'coach'), eq(schema.staff.active, true), eq(schema.staff.siteId, scopedSiteId))
    : and(eq(schema.staff.role, 'coach'), eq(schema.staff.active, true));

  const coaches = await db.select().from(schema.staff).where(coachFilter);
  if (coaches.length === 0) return [];
  const coachIds = coaches.map((c) => c.id);

  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = daysAhead(7);
  const weekAgo = daysAgoDate(7);

  const [shifts, bookings, pastSessions] = await Promise.all([
    db
      .select({ staffId: schema.shifts.staffId, startTime: schema.shifts.startTime, endTime: schema.shifts.endTime })
      .from(schema.shifts)
      .where(and(inArray(schema.shifts.staffId, coachIds), gte(schema.shifts.date, today), lte(schema.shifts.date, weekAhead))),
    db
      .select({ coachId: schema.bookings.coachId, serviceId: schema.bookings.serviceId, status: schema.bookings.status })
      .from(schema.bookings)
      .where(
        and(
          inArray(schema.bookings.coachId, coachIds),
          gte(schema.bookings.date, today),
          lte(schema.bookings.date, weekAhead),
        ),
      ),
    db
      .select({ id: schema.sessions.id, coachId: schema.sessions.coachId })
      .from(schema.sessions)
      .where(and(inArray(schema.sessions.coachId, coachIds), gte(schema.sessions.completedAt, weekAgo))),
  ]);

  const hours = (mins: number) => Math.round((mins / 60) * 10) / 10;

  return coaches.map((coach) => {
    const shiftMins = shifts
      .filter((s) => s.staffId === coach.id)
      .reduce((sum, s) => sum + (timeToMinutes(s.endTime) - timeToMinutes(s.startTime)), 0);
    const activeBookings = bookings.filter((b) => b.coachId === coach.id && ACTIVE_BOOKING.has(b.status));
    const bookedMins = activeBookings.reduce((sum, b) => sum + (serviceById(b.serviceId)?.mins ?? 0), 0);

    return {
      coachId: coach.id,
      name: coach.name,
      siteId: coach.siteId,
      shiftHoursNext7d: hours(shiftMins),
      bookedHoursNext7d: hours(bookedMins),
      upcomingBookingCount: activeBookings.length,
      sessionsLast7d: pastSessions.filter((s) => s.coachId === coach.id).length,
    };
  });
}

/**
 * A coach's own session history — the click-through from the workload/staff
 * list (item #4, superadmin console, and the studio manager's own staff
 * list for consistency). Same scoping as `getCoachWorkload`: a studio
 * manager only sees a coach at their own site, a superadmin sees any coach.
 * Unrelated to `docs/adr/0018`'s open member roster — this is staff-to-staff
 * visibility (who worked with whom), not member data access.
 */
export async function getCoachSessionHistory(coachId: string) {
  const session = await requireStudioManagerOrSuperadmin();
  const [coach] = await db
    .select({ id: schema.staff.id, name: schema.staff.name, siteId: schema.staff.siteId, role: schema.staff.role })
    .from(schema.staff)
    .where(eq(schema.staff.id, coachId))
    .limit(1);
  if (!coach || coach.role !== 'coach') throw new ForbiddenError('Coach not found');
  if (session.role === 'studio_manager' && coach.siteId !== session.siteId) {
    throw new ForbiddenError('Coach not at your site');
  }

  return db
    .select({
      id: schema.sessions.id,
      memberId: schema.sessions.memberId,
      memberName: schema.members.name,
      completedAt: schema.sessions.completedAt,
      mins: schema.sessions.mins,
      painBefore: schema.sessions.painBefore,
      painAfter: schema.sessions.painAfter,
      memberSummary: schema.sessions.memberSummary,
    })
    .from(schema.sessions)
    .innerJoin(schema.members, eq(schema.members.id, schema.sessions.memberId))
    .where(eq(schema.sessions.coachId, coachId))
    .orderBy(desc(schema.sessions.completedAt))
    .limit(50);
}
