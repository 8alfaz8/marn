import 'dotenv/config';
import { eq, and } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { db, authSchema } from './index';

/* One-off: reset a staff member's password directly, using better-auth's own
   hashing so the stored hash is byte-compatible with its verifyPassword.
   Not a permanent script — there is no self-service "forgot password" flow
   yet (docs/adr/0009 accepted that gap for the pilot). Usage:
   EMAIL=... NEW_PASSWORD=... npx tsx db/reset-password.ts */

async function main() {
  const email = process.env.EMAIL;
  const newPassword = process.env.NEW_PASSWORD;
  if (!email || !newPassword) throw new Error('Set EMAIL and NEW_PASSWORD.');

  const [user] = await db.select().from(authSchema.user).where(eq(authSchema.user.email, email)).limit(1);
  if (!user) throw new Error(`No user with email ${email}`);

  const hash = await hashPassword(newPassword);
  await db
    .update(authSchema.account)
    .set({ password: hash })
    .where(and(eq(authSchema.account.userId, user.id), eq(authSchema.account.providerId, 'credential')));

  console.log(`Password reset for ${email}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
