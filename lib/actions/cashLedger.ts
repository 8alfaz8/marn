'use server';

import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireSuperadmin } from '@/lib/authz';
import { logAudit } from '@/lib/audit';

/** Cash movements that aren't a booking — walk-in payments, refunds, till
 *  adjustments (docs/adr/0011). Superadmin-only for now; studio managers
 *  can be added later if wanted (deliberately deferred, not silently). */
export async function recordCashEntry(input: { siteId: string; type: 'manual_in' | 'manual_out'; amountAed: number; note?: string }) {
  const session = await requireSuperadmin();
  const [inserted] = await db
    .insert(schema.cashLedger)
    .values({
      siteId: input.siteId,
      type: input.type,
      amountAed: input.amountAed,
      note: input.note || null,
      recordedByStaffId: session.staffId,
    })
    .returning({ id: schema.cashLedger.id });
  await logAudit(session.staffId, 'cash_entry_recorded', 'cash_ledger', String(inserted.id));
  return inserted.id;
}

/**
 * A ledger view = booking revenue (still derived from `bookings.aed`,
 * unchanged — docs/adr/0007) unioned with manual `cash_ledger` entries,
 * newest first. `siteId` omitted returns every site (superadmin only).
 */
export async function getCashLedger(siteId?: string) {
  await requireSuperadmin();

  const [manualEntries, completedBookings, allSites] = await Promise.all([
    siteId
      ? db.select().from(schema.cashLedger).where(eq(schema.cashLedger.siteId, siteId)).orderBy(desc(schema.cashLedger.recordedAt))
      : db.select().from(schema.cashLedger).orderBy(desc(schema.cashLedger.recordedAt)),
    siteId
      ? db.select().from(schema.bookings).where(eq(schema.bookings.siteId, siteId))
      : db.select().from(schema.bookings),
    db.select().from(schema.sites),
  ]);

  const siteName = new Map(allSites.map((s) => [s.id, s.name]));
  const revenueBookings = completedBookings.filter((b) => b.status === 'completed');

  const entries = [
    ...revenueBookings.map((b) => ({
      kind: 'booking_revenue' as const,
      siteId: b.siteId,
      siteName: siteName.get(b.siteId) ?? b.siteId,
      amountAed: b.aed,
      note: null as string | null,
      at: `${b.date}T${b.time}`,
    })),
    ...manualEntries.map((e) => ({
      kind: e.type,
      siteId: e.siteId,
      siteName: siteName.get(e.siteId) ?? e.siteId,
      amountAed: e.amountAed,
      note: e.note,
      at: e.recordedAt.toISOString(),
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  const total = entries.reduce((sum, e) => sum + (e.kind === 'manual_out' ? -e.amountAed : e.amountAed), 0);

  return { entries, total };
}
