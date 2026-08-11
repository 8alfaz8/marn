import { db, schema } from '@/db';

/* Append-only, per blueprint §10.3. Never pass health-data content as
   `entityId` or through any other field here — action + entity reference
   only (Iron Rule: health data never enters logs). */
export async function logAudit(
  actorStaffId: string,
  action: (typeof schema.auditLog.$inferInsert)['action'],
  entityType: string,
  entityId: string,
) {
  await db.insert(schema.auditLog).values({ actorStaffId, action, entityType, entityId });
}
