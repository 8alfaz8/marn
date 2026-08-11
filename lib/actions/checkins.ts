'use server';

import { randomUUID } from 'crypto';
import { eq, gte, and, desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireMember } from '@/lib/memberAuth';

/** Idempotent per day (blueprint §4.1.7) — updates today's row if one
 *  exists, inserts otherwise. No unique constraint added; matches
 *  lib/actions/programs.ts's `markProgramComplete` app-level pattern. */
export async function submitCheckin(input: { sleep: number; pain: number; areas: string[]; note?: string }) {
  const session = await requireMember();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [existing] = await db
    .select({ id: schema.checkins.id })
    .from(schema.checkins)
    .where(and(eq(schema.checkins.memberId, session.memberId), gte(schema.checkins.at, startOfToday)))
    .orderBy(desc(schema.checkins.at))
    .limit(1);

  if (existing) {
    await db
      .update(schema.checkins)
      .set({ sleep: input.sleep, pain: input.pain, areas: input.areas, note: input.note || null })
      .where(eq(schema.checkins.id, existing.id));
    return existing.id;
  }

  const id = `chk_${randomUUID()}`;
  await db.insert(schema.checkins).values({
    id,
    memberId: session.memberId,
    sleep: input.sleep,
    pain: input.pain,
    areas: input.areas,
    note: input.note || null,
  });
  return id;
}
