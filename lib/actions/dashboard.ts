'use server';

import { eq, and, gte } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireStudioManager, requireSuperadmin } from '@/lib/authz';

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

/**
 * Same shape as getManagerDashboard, computed per site plus a platform
 * total — three unscoped queries grouped in JS rather than one query per
 * site, so this doesn't get slower as sites are added (docs/adr/0011).
 */
export async function getSuperadminDashboard() {
  await requireSuperadmin();
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = daysAgo(7);

  const [allSites, todayBookings, weekBookings, activeStaff] = await Promise.all([
    db.select().from(schema.sites).orderBy(schema.sites.name),
    db.select().from(schema.bookings).where(eq(schema.bookings.date, today)),
    db.select().from(schema.bookings).where(gte(schema.bookings.date, weekStart)),
    db.select().from(schema.staff).where(eq(schema.staff.active, true)),
  ]);

  const perSite = allSites.map((site) => {
    const completedThisWeek = weekBookings.filter((b) => b.siteId === site.id && b.status === 'completed');
    const confirmedToday = todayBookings.filter(
      (b) => b.siteId === site.id && (b.status === 'confirmed' || b.status === 'completed'),
    );
    const coaches = activeStaff.filter((s) => s.siteId === site.id && s.role === 'coach');
    return {
      siteId: site.id,
      siteName: site.name,
      sessionsToday: confirmedToday.length,
      sessionsThisWeek: completedThisWeek.length,
      revenue7d: completedThisWeek.reduce((sum, b) => sum + b.aed, 0),
      activeCoachCount: coaches.length,
    };
  });

  const totals = perSite.reduce(
    (acc, s) => ({
      sessionsToday: acc.sessionsToday + s.sessionsToday,
      sessionsThisWeek: acc.sessionsThisWeek + s.sessionsThisWeek,
      revenue7d: acc.revenue7d + s.revenue7d,
      activeCoachCount: acc.activeCoachCount + s.activeCoachCount,
    }),
    { sessionsToday: 0, sessionsThisWeek: 0, revenue7d: 0, activeCoachCount: 0 },
  );

  return { perSite, totals };
}
