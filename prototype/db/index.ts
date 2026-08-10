import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
}

/* The only Neon-specific line in the codebase. To move to RDS / Cloud SQL /
   any Postgres, swap these two lines for postgres-js + drizzle-orm/postgres-js
   and change DATABASE_URL. Nothing else in the app changes. */
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
export { schema };
