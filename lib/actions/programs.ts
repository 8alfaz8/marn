'use server';

import { randomUUID } from 'crypto';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { assertMemberInScope, requireCoach, requireStaff } from '@/lib/authz';
import { requireMember } from '@/lib/memberAuth';
import { logAudit } from '@/lib/audit';

/** Coach-prescribed home programme (blueprint §4.1.6). Same widened
 *  scoping as PAR-Q — a coach can prescribe to an unscreened member too,
 *  no reason to narrow it further than readiness screening already is. */
export async function prescribeProgram(input: {
  memberId: string;
  title: string;
  moves: { name: string; description: string; targetMins: number }[];
}) {
  const session = await requireCoach();
  await assertMemberInScope(session, input.memberId);

  const id = `prg_${randomUUID()}`;
  await db.insert(schema.programs).values({
    id,
    memberId: input.memberId,
    coachId: session.staffId,
    title: input.title,
    moves: input.moves,
  });
  await logAudit(session.staffId, 'program_prescribed', 'member', input.memberId);
  return id;
}

/** Unexported query core — every caller below authorizes first, this just
 *  reads. */
async function loadLatestProgram(memberId: string) {
  const [program] = await db
    .select()
    .from(schema.programs)
    .where(eq(schema.programs.memberId, memberId))
    .orderBy(desc(schema.programs.assignedAt))
    .limit(1);
  return program ?? null;
}

/** Staff read, in scope — coach console's Programme section. */
export async function getMemberProgram(memberId: string) {
  const session = await requireStaff();
  await assertMemberInScope(session, memberId);
  return loadLatestProgram(memberId);
}

/** Member's own program — no memberId argument, can only ever be their
 *  own session. */
export async function getMyProgram() {
  const session = await requireMember();
  return loadLatestProgram(session.memberId);
}

/** Idempotent per day — appending today's date twice is a no-op, not two
 *  entries (blueprint §4.1.6). A member can only mark their own program. */
export async function markProgramComplete(programId: string) {
  const session = await requireMember();
  const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, programId)).limit(1);
  if (!program || program.memberId !== session.memberId) throw new Error('Programme not found.');

  const today = new Date().toISOString().slice(0, 10);
  if (program.completions.includes(today)) return;

  await db
    .update(schema.programs)
    .set({ completions: [...program.completions, today] })
    .where(eq(schema.programs.id, programId));
}
