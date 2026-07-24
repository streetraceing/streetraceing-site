import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

const globalForDatabase = globalThis as typeof globalThis & {
  postgresPool?: Pool;
};

function readPositiveInteger(value: string | undefined, fallback: number) {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

const pool =
  globalForDatabase.postgresPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: readPositiveInteger(process.env.DATABASE_POOL_MAX, 5),
    idleTimeoutMillis: readPositiveInteger(
      process.env.DATABASE_IDLE_TIMEOUT_MS,
      10_000,
    ),
    connectionTimeoutMillis: readPositiveInteger(
      process.env.DATABASE_CONNECTION_TIMEOUT_MS,
      5_000,
    ),
    statement_timeout: readPositiveInteger(
      process.env.DATABASE_STATEMENT_TIMEOUT_MS,
      10_000,
    ),
    query_timeout: readPositiveInteger(
      process.env.DATABASE_QUERY_TIMEOUT_MS,
      15_000,
    ),
  });

globalForDatabase.postgresPool = pool;

export const db = drizzle({ client: pool, schema });
