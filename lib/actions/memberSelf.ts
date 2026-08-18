'use server';

import { eq, desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireMember } from '@/lib/memberAuth';
import { getMemberScores } from '@/lib/scores';

/**
 * Session-authorized counterpart to `lib/actions/memberPortal.ts`'s
 * token-based `getMemberPortalData` (Phase 1) — same return shape, so
 * `components/member/MemberPortal.tsx` renders either source unchanged.
 * This is what a self-registered, signed-in member sees at /member;
 * the token link keeps working for members added by staff who haven't
 * signed up for real (docs/adr/0014).
 */
export async function getMyPortalData() {
  const session = await requireMember();

  const [member, scores, sessions] = await Promise.all([
    db
      .select({ id: schema.members.id, name: schema.members.name })
      .from(schema.members)
      .where(eq(schema.members.id, session.memberId))
      .then((rows) => rows[0]),
    getMemberScores(session.memberId),
    db
      .select({
        id: schema.sessions.id,
        completedAt: schema.sessions.completedAt,
        mins: schema.sessions.mins,
        modalities: schema.sessions.modalities,
        painBefore: schema.sessions.painBefore,
        painAfter: schema.sessions.painAfter,
        memberSummary: schema.sessions.memberSummary,
      })
      .from(schema.sessions)
      .where(eq(schema.sessions.memberId, session.memberId))
      .orderBy(desc(schema.sessions.completedAt))
      .limit(20),
  ]);

  return { member, ...scores, sessions };
}
