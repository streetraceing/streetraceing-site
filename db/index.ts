import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

const globalForDatabase = globalThis as typeof globalThis & {
  postgresPool?: Pool;
};

const pool =
  globalForDatabase.postgresPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.postgresPool = pool;
}

export const db = drizzle({ client: pool, schema });
