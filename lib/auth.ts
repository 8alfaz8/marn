import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';
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
  trustedOrigins: [
    'https://marn-*.vercel.app',
    // The mobile app's custom scheme (native) and its Expo-web dev origin
    // (verification only, docs/adr/0017) — same instance, additive.
    'marn://',
    'http://localhost:8081',
    'http://localhost:8082',
  ],
  /* Additive only — neither plugin changes staff or web-member cookie auth.
     `expo()` (the official @better-auth/expo companion, docs/adr/0017)
     recognizes the mobile app's custom URL scheme as a trusted origin;
     its client-side expoClient() stores the session cookie in
     expo-secure-store and replays it automatically, same cookie mechanism
     as the browser, just persisted differently. `bearer()` is kept too —
     harmless, additive, and useful for hitting app/api/mobile/* routes
     directly (curl, tests) with a plain Authorization header instead of a
     cookie jar. */
  plugins: [bearer(), expo()],
});
