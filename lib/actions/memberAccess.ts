'use server';

import { randomBytes } from 'crypto';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireStaff, assertMemberInScope } from '@/lib/authz';
import { logAudit } from '@/lib/audit';

/**
 * Phase 1 member portal access (blueprint §11 Phase 1 vs. §11 Phase 2's
 * member authentication) — see docs/adr/0013-member-portal-access-link.md.
 * The token itself is the only credential; nothing about the member's
 * identity or health data is ever written into it or into the audit log
 * entry (Iron Rule: health data never in logs, traces, or third-party
 * payloads — the audit row here carries the member id only, same as every
 * other audit entry).
 */
function newToken() {
  return randomBytes(24).toString('base64url');
}

/** The member's current live link, if one exists — lets staff redisplay it
 *  without minting a new one every time the drawer reopens. */
export async function getActiveMemberAccessToken(memberId: string) {
  const session = await requireStaff();
  await assertMemberInScope(session, memberId);
  const [row] = await db
    .select({ token: schema.memberAccessTokens.token })
    .from(schema.memberAccessTokens)
    .where(and(eq(schema.memberAccessTokens.memberId, memberId), isNull(schema.memberAccessTokens.revokedAt)))
    .orderBy(desc(schema.memberAccessTokens.createdAt))
    .limit(1);
  return row?.token ?? null;
}

/** Revokes any existing live token for this member and mints a fresh one —
 *  one live link at a time, so generating again is how a leaked link gets
 *  invalidated. */
export async function generateMemberAccessLink(memberId: string) {
  const session = await requireStaff();
  await assertMemberInScope(session, memberId);

  await db
    .update(schema.memberAccessTokens)
    .set({ revokedAt: new Date(), revokedByStaffId: session.staffId })
    .where(and(eq(schema.memberAccessTokens.memberId, memberId), isNull(schema.memberAccessTokens.revokedAt)));

  const token = newToken();
  await db.insert(schema.memberAccessTokens).values({ token, memberId, createdByStaffId: session.staffId });
  await logAudit(session.staffId, 'member_access_link_created', 'member', memberId);
  return token;
}

export async function revokeMemberAccessLink(memberId: string) {
  const session = await requireStaff();
  await assertMemberInScope(session, memberId);
  await db
    .update(schema.memberAccessTokens)
    .set({ revokedAt: new Date(), revokedByStaffId: session.staffId })
    .where(and(eq(schema.memberAccessTokens.memberId, memberId), isNull(schema.memberAccessTokens.revokedAt)));
  await logAudit(session.staffId, 'member_access_link_revoked', 'member', memberId);
}
