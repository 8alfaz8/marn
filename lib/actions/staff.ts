'use server';

import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { auth } from '@/lib/auth';
import { requireStudioManager, requireSuperadmin } from '@/lib/authz';
import { logAudit } from '@/lib/audit';

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

/* --- Superadmin: studios and cross-site staff (docs/adr/0011) --- */

export async function getSites() {
  await requireSuperadmin();
  return db.select().from(schema.sites).orderBy(schema.sites.name);
}

export async function createSite(input: { name: string; city: string }) {
  const session = await requireSuperadmin();
  const id = `site_${randomUUID()}`;
  await db.insert(schema.sites).values({ id, name: input.name, city: input.city });
  await logAudit(session.staffId, 'site_created', 'site', id);
  return id;
}

/** Every coach/studio-manager account, across every site — the roster a
 *  superadmin assigns from. Superadmin accounts are excluded (nothing to
 *  assign; they aren't site-scoped). */
export async function getAllStaff() {
  await requireSuperadmin();
  const rows = await db.select().from(schema.staff).orderBy(schema.staff.name);
  return rows.filter((r) => r.role !== 'superadmin');
}

/** Moves an existing coach/studio-manager to a different site. */
export async function assignStaffToSite(staffId: string, siteId: string) {
  const session = await requireSuperadmin();
  await db.update(schema.staff).set({ siteId }).where(eq(schema.staff.id, staffId));
  await logAudit(session.staffId, 'staff_site_assigned', 'staff', staffId);
}

/** Additive alongside the site-locked createStaffAccount above — a
 *  superadmin can create a coach/studio-manager at any site. Not
 *  'superadmin': that role is seeded only (docs/adr/0011), never
 *  self-service-created, even by another superadmin. */
export async function createStaffAccountForSite(input: {
  name: string;
  email: string;
  password: string;
  role: 'coach' | 'studio_manager';
  siteId: string;
}) {
  const session = await requireSuperadmin();
  const { user } = await auth.api.signUpEmail({ body: { email: input.email, password: input.password, name: input.name } });
  const staffId = `staff_${user.id}`;
  await db.insert(schema.staff).values({
    id: staffId,
    authUserId: user.id,
    name: input.name,
    role: input.role,
    siteId: input.siteId,
  });
  await logAudit(session.staffId, 'staff_site_assigned', 'staff', staffId);
  return staffId;
}
