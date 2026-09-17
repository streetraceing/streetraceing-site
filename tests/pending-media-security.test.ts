import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

import { db } from '../db';
import { devUpdates, pendingMediaUploads, projectContents } from '../db/schema';
import {
  cleanupExpiredPendingMediaUploads,
  confirmPendingMediaUploads,
  discardPendingMediaUploads,
  registerRemovedMediaUploads,
} from '../lib/pending-media-uploads';

const PUBLIC_ID = 'streetraceing/media/dev-updates/first';
const URL = `https://res.cloudinary.com/test-cloud/image/upload/v1/${PUBLIC_ID}.jpg`;

function setup(t: TestContext) {
  for (const [name, value] of Object.entries({
    DATABASE_URL: 'postgresql://unused:test@localhost/test',
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
  })) {
    const previous = process.env[name];
    process.env[name] = value;
    t.after(() => {
      if (previous === undefined) Reflect.deleteProperty(process.env, name);
      else process.env[name] = previous;
    });
  }
  t.mock.method(console, 'error', () => undefined);
}

test('the shared pool catches idle-client errors without logging sensitive details', async (t) => {
  const pool = db.$client;
  const logged: unknown[][] = [];
  t.mock.method(console, 'error', (...args: unknown[]) => {
    logged.push(args);
  });
  assert.equal(pool.listenerCount('error'), 1);
  const sameDatabase = await import('../db');
  assert.equal(sameDatabase.db.$client, pool);
  assert.equal(pool.listenerCount('error'), 1);
  pool.emit(
    'error',
    new Error(
      'postgresql://private-user:private-password@private-host/database',
    ),
  );
  assert.deepEqual(logged, [
    ['PostgreSQL pool encountered an idle-client error.'],
  ]);
});

test('removed assets are deduplicated and refresh pending retention; queue failures propagate', async (t) => {
  setup(t);
  const values: { publicId: string; createdAt: Date }[][] = [];
  const conflicts: { target: unknown; set: { createdAt: Date } }[] = [];
  t.mock.method(db, 'insert', (table: unknown) => {
    assert.equal(table, pendingMediaUploads);
    return {
      values(rows: { publicId: string; createdAt: Date }[]) {
        values.push(rows);
        return {
          async onConflictDoUpdate(options: {
            target: unknown;
            set: { createdAt: Date };
          }) {
            conflicts.push(options);
          },
        };
      },
    };
  });
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('No immediate deletion allowed');
  });
  const before = Date.now();
  await registerRemovedMediaUploads([
    URL,
    URL.replace('/upload/', '/upload/c_fill,w_160/'),
  ]);
  assert.equal(values.length, 1);
  assert.equal(values[0].length, 1);
  assert.equal(values[0][0].publicId, PUBLIC_ID);
  assert.ok(values[0][0].createdAt.getTime() >= before);
  assert.equal(conflicts[0].target, pendingMediaUploads.publicId);
  assert.equal(conflicts[0].set.createdAt, values[0][0].createdAt);
  assert.equal(fetchMock.mock.callCount(), 0);
  const failedExecutor = {
    insert() {
      throw new Error('Inventory unavailable');
    },
  };
  await assert.rejects(
    registerRemovedMediaUploads([URL], failedExecutor),
    /Inventory unavailable/,
  );
});

test('expired cleanup checks references, retains failures, then removes completed retry inventory', async (t) => {
  setup(t);
  const now = new Date('2026-09-14T12:00:00.000Z');
  let referenced = true;
  let pending = true;
  let status = 500;
  let deletedRows = 0;
  t.mock.method(db, 'select', () => ({
    from(table: unknown) {
      if (table === devUpdates)
        return Promise.resolve(referenced ? [{ imageUrls: [URL] }] : []);
      if (table === projectContents) return Promise.resolve([]);
      assert.equal(table, pendingMediaUploads);
      return {
        where(condition: SQL) {
          const query = new PgDialect().sqlToQuery(condition);
          assert.ok(
            query.params.includes(
              new Date(now.getTime() - 86_400_000).toISOString(),
            ),
          );
          return {
            async limit(limit: number) {
              assert.equal(limit, 100);
              return pending ? [{ publicId: PUBLIC_ID }] : [];
            },
          };
        },
      };
    },
  }));
  t.mock.method(db, 'delete', () => ({
    async where() {
      deletedRows += 1;
      pending = false;
    },
  }));
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify(
          status === 200
            ? { result: 'ok' }
            : { error: { message: 'Retry later' } },
        ),
        { status, headers: { 'content-type': 'application/json' } },
      ),
  );
  const protectedResult = await cleanupExpiredPendingMediaUploads(now);
  assert.equal(protectedResult.referenced, 1);
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.equal(deletedRows, 1);

  referenced = false;
  pending = true;
  deletedRows = 0;
  const failed = await cleanupExpiredPendingMediaUploads(now);
  assert.equal(failed.failed, 1);
  assert.equal(deletedRows, 0);
  assert.equal(pending, true);
  status = 200;
  const retried = await cleanupExpiredPendingMediaUploads(now);
  assert.equal(retried.deleted, 1);
  assert.equal(deletedRows, 1);
  assert.equal(pending, false);
});

test('confirmation locks inventory before checking references and preserves re-queued removals', async (t) => {
  setup(t);
  let referenced = false;
  let removedRows = 0;
  const events: string[] = [];
  t.mock.method(
    db,
    'transaction',
    async (callback: (tx: typeof db) => Promise<void>) => callback(db),
  );
  t.mock.method(db, 'delete', () => ({
    async where() {
      removedRows += 1;
    },
  }));
  t.mock.method(db, 'select', () => ({
    from(table: unknown) {
      if (table === pendingMediaUploads) {
        return {
          where() {
            return {
              orderBy() {
                return {
                  async for(mode: string) {
                    assert.equal(mode, 'update');
                    events.push('lock');
                    return [{ publicId: PUBLIC_ID }];
                  },
                };
              },
            };
          },
        };
      }
      events.push('references');
      return Promise.resolve(
        table === devUpdates && referenced ? [{ imageUrls: [URL] }] : [],
      );
    },
  }));
  await confirmPendingMediaUploads([URL]);
  assert.equal(removedRows, 0);
  assert.deepEqual(events, ['lock', 'references', 'references']);
  referenced = true;
  await confirmPendingMediaUploads([URL]);
  assert.equal(removedRows, 1);
});

test('explicit abandoned-upload cleanup keeps existing behavior', async (t) => {
  setup(t);
  let removedRows = 0;
  t.mock.method(db, 'delete', () => ({
    async where() {
      removedRows += 1;
    },
  }));
  t.mock.method(db, 'select', () => ({
    from(table: unknown) {
      if (table === pendingMediaUploads) {
        return {
          async where() {
            return [{ publicId: PUBLIC_ID }];
          },
        };
      }
      return Promise.resolve([]);
    },
  }));
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(JSON.stringify({ result: 'not found' }), {
        headers: { 'content-type': 'application/json' },
      }),
  );
  const abandoned = await discardPendingMediaUploads([URL]);
  assert.equal(abandoned.notFound, 1);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(removedRows, 1);
});
