import crypto from 'node:crypto';
import { getDatabaseConnection, type DatabaseConnection } from '@/db/client';
import { normalizeFeedUrl, type FeedDto } from '@/schemas/feed.schema';

export interface CreateFeedRecordInput {
  url: string;
  title: string;
  description?: string | null;
  siteUrl?: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  createdAt?: string;
}

export class DuplicateFeedError extends Error {
  constructor(url: string) {
    super(`O feed "${url}" já está cadastrado neste dispositivo.`);
    this.name = 'DuplicateFeedError';
  }
}

interface RawFeedRowWithUnread {
  id: string;
  url: string;
  title: string;
  description: string | null;
  site_url: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
  unread_count: number;
}

function mapRawRowToFeedDto(row: RawFeedRowWithUnread): FeedDto {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    siteUrl: row.site_url,
    lastSyncedAt: row.last_synced_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    unreadCount: Number(row.unread_count ?? 0),
  };
}

export class FeedRepository {
  private readonly conn: DatabaseConnection;

  constructor(conn: DatabaseConnection = getDatabaseConnection()) {
    this.conn = conn;
  }

  findByUrl(rawUrl: string): FeedDto | null {
    const normalizedUrl = normalizeFeedUrl(rawUrl);
    const stmt = this.conn.sqlite.prepare<[string], RawFeedRowWithUnread>(`
      SELECT
        f.id,
        f.url,
        f.title,
        f.description,
        f.site_url,
        f.last_synced_at,
        f.last_error,
        f.created_at,
        COALESCE(SUM(CASE WHEN a.is_read = 0 THEN 1 ELSE 0 END), 0) AS unread_count
      FROM feeds f
      LEFT JOIN articles a ON a.feed_id = f.id
      WHERE f.url = ?
      GROUP BY f.id
    `);

    const row = stmt.get(normalizedUrl);
    return row ? mapRawRowToFeedDto(row) : null;
  }

  findById(feedId: string): FeedDto | null {
    const stmt = this.conn.sqlite.prepare<[string], RawFeedRowWithUnread>(`
      SELECT
        f.id,
        f.url,
        f.title,
        f.description,
        f.site_url,
        f.last_synced_at,
        f.last_error,
        f.created_at,
        COALESCE(SUM(CASE WHEN a.is_read = 0 THEN 1 ELSE 0 END), 0) AS unread_count
      FROM feeds f
      LEFT JOIN articles a ON a.feed_id = f.id
      WHERE f.id = ?
      GROUP BY f.id
    `);

    const row = stmt.get(feedId);
    return row ? mapRawRowToFeedDto(row) : null;
  }

  listAll(): { feeds: FeedDto[]; totalUnreadCount: number } {
    const stmt = this.conn.sqlite.prepare<[], RawFeedRowWithUnread>(`
      SELECT
        f.id,
        f.url,
        f.title,
        f.description,
        f.site_url,
        f.last_synced_at,
        f.last_error,
        f.created_at,
        COALESCE(SUM(CASE WHEN a.is_read = 0 THEN 1 ELSE 0 END), 0) AS unread_count
      FROM feeds f
      LEFT JOIN articles a ON a.feed_id = f.id
      GROUP BY f.id
      ORDER BY f.title COLLATE NOCASE ASC, f.created_at ASC
    `);

    const rows = stmt.all();
    const feedList = rows.map(mapRawRowToFeedDto);
    const totalUnreadCount = feedList.reduce((acc, item) => acc + item.unreadCount, 0);

    return {
      feeds: feedList,
      totalUnreadCount,
    };
  }

  create(input: CreateFeedRecordInput): FeedDto {
    const normalizedUrl = normalizeFeedUrl(input.url);
    const existing = this.findByUrl(normalizedUrl);
    if (existing) {
      throw new DuplicateFeedError(normalizedUrl);
    }

    const id = crypto.randomUUID();
    const nowIso = input.createdAt ?? new Date().toISOString();

    const insertStmt = this.conn.sqlite.prepare(`
      INSERT INTO feeds (
        id, url, title, description, site_url, last_synced_at, last_error, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      normalizedUrl,
      input.title.trim() || normalizedUrl,
      input.description ?? null,
      input.siteUrl ?? null,
      input.lastSyncedAt ?? nowIso,
      input.lastError ?? null,
      nowIso
    );

    const created = this.findById(id);
    if (!created) {
      throw new Error('Falha ao recuperar o feed recém-criado.');
    }
    return created;
  }

  updateSyncStatus(
    feedId: string,
    status: { lastSyncedAt?: string | null; lastError?: string | null }
  ): void {
    if (status.lastSyncedAt !== undefined) {
      const stmt = this.conn.sqlite.prepare(`
        UPDATE feeds
        SET last_synced_at = ?, last_error = ?
        WHERE id = ?
      `);
      stmt.run(status.lastSyncedAt, status.lastError ?? null, feedId);
    } else {
      const stmt = this.conn.sqlite.prepare(`
        UPDATE feeds
        SET last_error = ?
        WHERE id = ?
      `);
      stmt.run(status.lastError ?? null, feedId);
    }
  }

  deleteById(feedId: string): boolean {
    const stmt = this.conn.sqlite.prepare('DELETE FROM feeds WHERE id = ?');
    const result = stmt.run(feedId);
    return result.changes > 0;
  }
}
