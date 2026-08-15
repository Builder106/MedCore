import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

const here = dirname(fileURLToPath(import.meta.url));

let cached: { db: LibSQLDatabase<typeof schema>; raw: Client } | null = null;

export async function getDb(databaseUrl?: string) {
  if (cached) return cached;

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuth = process.env.TURSO_AUTH_TOKEN;
  let raw: Client;

  if (!databaseUrl && tursoUrl) {
    // Remote Turso (libSQL over HTTPS). Used in Vercel deploys.
    raw = createClient({ url: tursoUrl, authToken: tursoAuth });
  } else {
    // Local file or :memory: (dev + tests).
    const url = databaseUrl ?? process.env.DATABASE_URL ?? resolve(here, '../../data/medcore.db');
    let libsqlUrl: string;
    if (url === ':memory:') {
      libsqlUrl = 'file::memory:?cache=shared';
    } else {
      mkdirSync(dirname(url), { recursive: true });
      libsqlUrl = `file:${url}`;
    }
    raw = createClient({ url: libsqlUrl });
  }

  const migrationSql = readFileSync(resolve(here, 'migrations.sql'), 'utf8');
  const statements = migrationSql
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await raw.execute(stmt);
  }
  const db = drizzle(raw, { schema });
  cached = { db, raw };
  return cached;
}

export async function resetDbCacheForTests() {
  if (cached) {
    cached.raw.close();
    cached = null;
  }
}

export type AppDb = LibSQLDatabase<typeof schema>;
export { schema };
