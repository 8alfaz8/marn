import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';

/* Staff identity only (blueprint §10.1: separate identity domains for
   members and staff — a coach account is never a member account with a
   flag set). Member auth is a separate concern for Phase 2, not this
   instance.

   Email + password for now, not the blueprint's eventual phone-OTP — see
   docs/adr/0009-staff-auth-simple-credential-first.md for why. `better-auth`
   itself is the blueprint's actual choice; only the credential method is
   staged.

   No public sign-up route is wired to this — `db/seed.ts` bootstraps the
   first studio manager directly; every other staff account is created by
   an authenticated studio manager (lib/authz.ts + a server action), never
   via self-service. */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  session: { expiresIn: 60 * 60 * 24 * 7 },
  /* Temporary, per product owner (2026-08-11): no custom domain purchased
     yet, so every Vercel URL for this project — the stable production
     alias and each per-deployment URL alike — needs to pass better-auth's
     origin check. Tighten this to the real domain only once one exists;
     a wildcard this broad has no place in the final config. */
  trustedOrigins: ['https://marn-*.vercel.app'],
});
