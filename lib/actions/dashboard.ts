'use server';

import { eq, and, gte } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireStudioManager } from '@/lib/authz';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * Deliberately lightweight (docs/adr/0008): session counts, a revenue proxy
 * from `bookings.aed` (there is no real payments/POS system yet — see
 * docs/adr/0007), and a naive booked-vs-staffed capacity read. Not the
 * blueprint's fuller P3 coach-outcome metrics or waitlist-driving
 * utilisation detail — those stay out of scope for this slice.
 */
export async function getManagerDashboard() {
  const session = await requireStudioManager();
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = daysAgo(7);

  const [todayBookings, weekBookings, staff] = await Promise.all([
    db.select().from(schema.bookings).where(and(eq(schema.bookings.siteId, session.siteId), eq(schema.bookings.date, today))),
    db.select().from(schema.bookings).where(and(eq(schema.bookings.siteId, session.siteId), gte(schema.bookings.date, weekStart))),
    db.select().from(schema.staff).where(and(eq(schema.staff.siteId, session.siteId), eq(schema.staff.active, true))),
  ]);

  const completedThisWeek = weekBookings.filter((b) => b.status === 'completed');
  const revenue7d = completedThisWeek.reduce((sum, b) => sum + b.aed, 0);
  const coaches = staff.filter((s) => s.role === 'coach');
  const confirmedToday = todayBookings.filter((b) => b.status === 'confirmed' || b.status === 'completed');

  return {
    sessionsToday: confirmedToday.length,
    sessionsThisWeek: completedThisWeek.length,
    revenue7d,
    activeCoachCount: coaches.length,
    todaySchedule: todayBookings,
  };
}
