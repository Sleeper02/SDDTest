import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '@/config/env';
import * as schema from './schema';

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseConnection {
  sqlite: Database.Database;
  db: AppDatabase;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS feeds (
  id TEXT PRIMARY KEY NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  site_url TEXT,
  last_synced_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS feeds_url_unique_idx ON feeds (url);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY NOT NULL,
  feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT,
  content_html TEXT NOT NULL,
  content_snippet TEXT NOT NULL,
  author TEXT,
  published_at TEXT NOT NULL,
  discovered_at TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS articles_feed_external_unique_idx
  ON articles (feed_id, external_id);

CREATE INDEX IF NOT EXISTS articles_published_at_idx
  ON articles (published_at DESC, discovered_at DESC);

CREATE INDEX IF NOT EXISTS articles_feed_read_published_idx
  ON articles (feed_id, is_read, published_at DESC);
`;

export function createDatabaseConnection(dbPath: string = env.DATABASE_URL): DatabaseConnection {
  if (dbPath !== ':memory:') {
    const resolvedDir = path.dirname(path.resolve(dbPath));
    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true });
    }
  }

  const sqlite = new Database(dbPath);
  if (dbPath !== ':memory:') {
    sqlite.pragma('journal_mode = WAL');
  }
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(SCHEMA_SQL);

  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

let singletonConnection: DatabaseConnection | null = null;

export function getDatabaseConnection(): DatabaseConnection {
  if (!singletonConnection) {
    singletonConnection = createDatabaseConnection(env.DATABASE_URL);
  }
  return singletonConnection;
}

export function setDatabaseConnectionForTesting(connection: DatabaseConnection | null): void {
  singletonConnection = connection;
}
