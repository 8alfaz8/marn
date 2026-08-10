import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
}

/* postgres-js talks plain Postgres wire protocol — works against Neon, RDS,
   Cloud SQL, or a local instance with no code change, only DATABASE_URL. */
const sql = postgres(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
export { schema };
