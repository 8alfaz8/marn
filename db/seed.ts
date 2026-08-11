import 'dotenv/config';
import { auth } from '../lib/auth';
import { db, schema } from './index';

/* One-time bootstrap: the first site and its first studio manager. Every
   other staff account is created by an authenticated studio manager
   afterwards (lib/authz.ts's requireStudioManager gate on that server
   action) — this script exists only because nothing can log in yet the
   very first time. Run once: `SEED_MANAGER_EMAIL=... SEED_MANAGER_PASSWORD=... npm run db:seed`. */

async function main() {
  const email = process.env.SEED_MANAGER_EMAIL;
  const password = process.env.SEED_MANAGER_PASSWORD;
  const name = process.env.SEED_MANAGER_NAME ?? 'Studio Manager';

  if (!email || !password) {
    throw new Error('Set SEED_MANAGER_EMAIL and SEED_MANAGER_PASSWORD before running this script.');
  }

  const [site] = await db
    .insert(schema.sites)
    .values({ id: 'site_1', name: 'Marn — Business Bay', city: 'Dubai' })
    .returning();

  const { user } = await auth.api.signUpEmail({ body: { email, password, name } });

  await db.insert(schema.staff).values({
    id: `staff_${user.id}`,
    authUserId: user.id,
    name,
    role: 'studio_manager',
    siteId: site.id,
  });

  console.log(`Bootstrapped studio manager ${email} at ${site.name}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
