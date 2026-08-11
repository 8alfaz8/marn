'use server';

import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { auth } from '@/lib/auth';
import { requireStudioManager } from '@/lib/authz';

/** The only way a coach or studio-manager account gets created after the
 *  initial db/seed.ts bootstrap — never a public sign-up route
 *  (docs/decisions.md, 2026-08-11). */
export async function createStaffAccount(input: {
  name: string;
  email: string;
  password: string;
  role: 'coach' | 'studio_manager';
}) {
  const session = await requireStudioManager();

  const { user } = await auth.api.signUpEmail({ body: { email: input.email, password: input.password, name: input.name } });

  const staffId = `staff_${randomUUID()}`;
  await db.insert(schema.staff).values({
    id: staffId,
    authUserId: user.id,
    name: input.name,
    role: input.role,
    siteId: session.siteId,
  });
  return staffId;
}

export async function getStaffRoster() {
  const session = await requireStudioManager();
  return db.select().from(schema.staff).where(eq(schema.staff.siteId, session.siteId)).orderBy(schema.staff.name);
}

export async function getCoaches() {
  const session = await requireStudioManager();
  const rows = await db.select().from(schema.staff).where(eq(schema.staff.siteId, session.siteId));
  return rows.filter((r) => r.role === 'coach' && r.active);
}
