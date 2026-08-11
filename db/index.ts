import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import * as authSchema from './auth-schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
}

/* postgres-js talks plain Postgres wire protocol — works against Neon, RDS,
   Cloud SQL, or a local instance with no code change, only DATABASE_URL. */
const sql = postgres(process.env.DATABASE_URL);

/* auth-schema.ts is better-auth's own generated tables (user/session/account/
   verification) — regenerate it with `npx @better-auth/cli generate` after
   changing lib/auth.ts, don't hand-edit it. Merged here so drizzleAdapter can
   find them and drizzle-kit migrates them alongside the business schema. */
export const db = drizzle(sql, { schema: { ...schema, ...authSchema } });
export { schema, authSchema };
