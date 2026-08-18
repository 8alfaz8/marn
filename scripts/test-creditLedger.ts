import 'dotenv/config';
import { eq, sum } from 'drizzle-orm';
import { db, schema } from '../db';

/* Integration checks for the credit ledger (blueprint §9.4, Appendix D
   prompt D3's three named cases), run via `npx tsx
   scripts/test-creditLedger.ts` against the real database — the ledger's
   correctness is a DB-transaction concern, not a pure function, so this
   can't be a plain-assertion script like test-scheduling.ts/test-scoring.ts.
   Creates and deletes its own throwaway site/member; touches nothing else. */

let failures = 0;

function check(label: string, condition: boolean) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${label}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

async function balanceOf(memberId: string): Promise<number> {
  const [row] = await db.select({ total: sum(schema.creditLedger.credits) }).from(schema.creditLedger).where(eq(schema.creditLedger.memberId, memberId));
  return Number(row?.total ?? 0);
}

async function main() {
  const siteId = `site_test_ledger_${Date.now()}`;
  const memberId = `mem_test_ledger_${Date.now()}`;
  await db.insert(schema.sites).values({ id: siteId, name: 'Ledger Test Site', city: 'Dubai' });
  await db.insert(schema.members).values({ id: memberId, name: 'Ledger Test Member', phone: '0500000001', siteId });

  try {
    // Case 1: refund after consumption — a purchase, a consumption, then a
    // refund against that same consumption, should net back to the
    // pre-consumption balance.
    await db.insert(schema.creditLedger).values({ memberId, type: 'purchase', credits: 5 });
    check('balance after a 5-credit purchase is 5', (await balanceOf(memberId)) === 5);

    await db.insert(schema.creditLedger).values({ memberId, type: 'consumption', credits: -1, relatedBookingId: null, note: 'test booking' });
    check('balance after one consumption is 4', (await balanceOf(memberId)) === 4);

    await db.insert(schema.creditLedger).values({ memberId, type: 'refund', credits: 1, note: 'refund after consumption' });
    check('balance after refunding that consumption is back to 5', (await balanceOf(memberId)) === 5);

    // Case 2: expiry at a boundary — an expiry entry exactly zeroing the
    // remaining purchased amount lands at zero, not negative or positive.
    await db.insert(schema.creditLedger).values({ memberId, type: 'expiry', credits: -5 });
    check('balance after expiring exactly the remaining 5 is 0', (await balanceOf(memberId)) === 0);

    // Case 3: double-spend — this pass deliberately does NOT gate booking
    // on balance (docs/decisions.md, 2026-08-12), so two consumptions past
    // zero must still be recorded accurately as a negative balance, not
    // silently clamped or rejected at the ledger layer itself. Refusing to
    // book at zero balance is a decision for the booking action, not the
    // ledger's job to enforce.
    await db.insert(schema.creditLedger).values({ memberId, type: 'consumption', credits: -1 });
    await db.insert(schema.creditLedger).values({ memberId, type: 'consumption', credits: -1 });
    check('balance correctly goes negative after two consumptions past zero (ledger is a record, not a gate)', (await balanceOf(memberId)) === -2);
  } finally {
    await db.delete(schema.creditLedger).where(eq(schema.creditLedger.memberId, memberId));
    await db.delete(schema.members).where(eq(schema.members.id, memberId));
    await db.delete(schema.sites).where(eq(schema.sites.id, siteId));
  }

  if (failures > 0) {
    console.error(`\n${failures} failure(s).`);
    process.exit(1);
  } else {
    console.log('\nAll credit ledger checks passed.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
