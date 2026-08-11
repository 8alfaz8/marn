'use server';

import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireStaff, assertMemberInScope } from '@/lib/authz';
import { logAudit } from '@/lib/audit';

/** Either role can raise a flag (blueprint: "Created by coaches"; a studio
 *  manager is a superset of coach access here). No automatic expiry, no
 *  clearing on the member's own say-so (Iron Rule) — clearing is the same
 *  gate, just a named person recorded on the way out instead of in. */
export async function raiseFlag(memberId: string, text: string) {
  const session = await requireStaff();
  await assertMemberInScope(session, memberId);

  const id = `flg_${randomUUID()}`;
  await db.insert(schema.flags).values({ id, memberId, text, raisedByStaffId: session.staffId });
  await logAudit(session.staffId, 'flag_raised', 'flag', id);
  return id;
}

export async function clearFlag(flagId: string) {
  const session = await requireStaff();
  const [flag] = await db.select().from(schema.flags).where(eq(schema.flags.id, flagId)).limit(1);
  if (!flag) throw new Error('Flag not found');
  await assertMemberInScope(session, flag.memberId);

  await db
    .update(schema.flags)
    .set({ clearedByStaffId: session.staffId, clearedAt: new Date() })
    .where(eq(schema.flags.id, flagId));
  await logAudit(session.staffId, 'flag_cleared', 'flag', flagId);
}
