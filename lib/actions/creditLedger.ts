'use server';

import { eq, sum } from 'drizzle-orm';
import { db, schema } from '@/db';
import { assertMemberInScope, requireStudioManager } from '@/lib/authz';
import { requireMember } from '@/lib/memberAuth';
import { logAudit } from '@/lib/audit';
import { chargeManual } from '@/lib/integrations/payments';

/** Balance is `sum(credits)`, computed on read — never stored, per the
 *  blueprint's explicit warning against a `sessions_remaining` integer
 *  (§9.4). Studio-manager-only: credits are payment-adjacent data, and
 *  coaches are excluded from payment data (docs/adr/0008), same boundary
 *  `getMemberBookingHistory` already enforces. A member sees only their
 *  own via a separate code path below. */
export async function getMemberCreditBalance(memberId: string) {
  const session = await requireStudioManager();
  await assertMemberInScope(session, memberId);
  const [row] = await db.select({ total: sum(schema.creditLedger.credits) }).from(schema.creditLedger).where(eq(schema.creditLedger.memberId, memberId));
  return Number(row?.total ?? 0);
}

/** Member's own balance — no memberId argument, can only ever be their
 *  own session. */
export async function getMyCreditBalance() {
  const session = await requireMember();
  const [row] = await db.select({ total: sum(schema.creditLedger.credits) }).from(schema.creditLedger).where(eq(schema.creditLedger.memberId, session.memberId));
  return Number(row?.total ?? 0);
}

/**
 * Staff-administered package sale — payment is collected outside the
 * system (cash, card terminal, bank transfer) and recorded via the
 * swappable payment port (lib/integrations/payments, docs/adr/0015).
 * No member self-checkout this pass: without a real gateway, a member
 * "buying" a package with no real charge captured would be misleading.
 */
export async function purchasePackage(input: { memberId: string; credits: number; amountAed: number }) {
  const session = await requireStudioManager();
  await assertMemberInScope(session, input.memberId);
  if (input.credits <= 0) throw new Error('Credits must be a positive number.');

  const result = chargeManual({ amountAed: input.amountAed, note: `Package for ${input.memberId}` });

  await db.insert(schema.creditLedger).values({
    memberId: input.memberId,
    type: 'purchase',
    credits: input.credits,
    note: `${input.credits} credits, AED ${input.amountAed}`,
    recordedByStaffId: session.staffId,
    paymentReference: result.reference,
  });

  await logAudit(session.staffId, 'credit_purchase_recorded', 'member', input.memberId);
  return result;
}

/** Manual admin adjustments — freeze/unfreeze/gift/corporate_grant/expiry.
 *  Automatic consumption/refund entries are written inline by
 *  lib/actions/bookings.ts, not through this function. */
export async function recordLedgerAdjustment(input: {
  memberId: string;
  type: 'freeze' | 'unfreeze' | 'gift' | 'corporate_grant' | 'expiry';
  credits: number;
  note: string;
}) {
  const session = await requireStudioManager();
  await assertMemberInScope(session, input.memberId);
  const signed = input.type === 'freeze' || input.type === 'expiry' ? -Math.abs(input.credits) : Math.abs(input.credits);

  await db.insert(schema.creditLedger).values({
    memberId: input.memberId,
    type: input.type,
    credits: signed,
    note: input.note,
    recordedByStaffId: session.staffId,
  });
  await logAudit(session.staffId, 'credit_adjustment_recorded', 'member', input.memberId);
}
