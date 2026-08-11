'use server';

import { randomUUID } from 'crypto';
import { eq, and, gte } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireStaff, requireStudioManager } from '@/lib/authz';
import { logAudit } from '@/lib/audit';

export async function assignShift(input: { staffId: string; date: string; startTime: string; endTime: string }) {
  const session = await requireStudioManager();
  const id = `sft_${randomUUID()}`;
  await db.insert(schema.shifts).values({
    id,
    staffId: input.staffId,
    siteId: session.siteId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    createdByStaffId: session.staffId,
  });
  await logAudit(session.staffId, 'shift_assigned', 'shift', id);
  return id;
}

/** Upcoming shifts at the manager's site (today onward), for the roster view. */
export async function getUpcomingShifts() {
  const session = await requireStudioManager();
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(schema.shifts)
    .where(and(eq(schema.shifts.siteId, session.siteId), gte(schema.shifts.date, today)))
    .orderBy(schema.shifts.date, schema.shifts.startTime);
}

/** A coach's own upcoming shifts — read-only, no assignment capability. */
export async function getMyShifts() {
  const session = await requireStaff();
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(schema.shifts)
    .where(and(eq(schema.shifts.staffId, session.staffId), gte(schema.shifts.date, today)))
    .orderBy(schema.shifts.date, schema.shifts.startTime);
}
