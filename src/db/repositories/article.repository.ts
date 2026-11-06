import crypto from 'node:crypto';
import { getDatabaseConnection, type DatabaseConnection } from '@/db/client';
import type { ArticleSummaryDto } from '@/schemas/feed.schema';
import type { ParsedFeedItem } from '@/services/feed-parser.service';

interface RawArticleJoinRow {
  id: string;
  feed_id: string;
  feed_title: string;
  title: string;
  link: string | null;
  content_snippet: string;
  content_html: string;
  author: string | null;
  published_at: string;
  discovered_at: string;
  is_read: number;
  read_at: string | null;
}

function mapRowToArticleDto(row: RawArticleJoinRow): ArticleSummaryDto {
  return {
    id: row.id,
    feedId: row.feed_id,
    feedTitle: row.feed_title,
    title: row.title,
    link: row.link,
    contentSnippet: row.content_snippet,
    contentHtml: row.content_html,
    author: row.author,
    publishedAt: row.published_at,
    isRead: Boolean(row.is_read),
    readAt: row.read_at,
  };
}

export class ArticleRepository {
  private readonly conn: DatabaseConnection;

  constructor(conn: DatabaseConnection = getDatabaseConnection()) {
    this.conn = conn;
  }

  /**
   * Upserts parsed feed items into SQLite.
   * Preserves existing `is_read` and `read_at` states on conflict (FR-011).
   * Returns the count of newly inserted articles.
   */
  upsertItemsForFeed(feedId: string, items: ParsedFeedItem[]): number {
    if (items.length === 0) return 0;

    const findExistingStmt = this.conn.sqlite.prepare<[string, string], { id: string }>(
      'SELECT id FROM articles WHERE feed_id = ? AND external_id = ?'
    );

    const insertStmt = this.conn.sqlite.prepare(`
      INSERT INTO articles (
        id,
        feed_id,
        external_id,
        title,
        link,
        content_html,
        content_snippet,
        author,
        published_at,
        discovered_at,
        is_read,
        read_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
    `);

    const updateMetadataStmt = this.conn.sqlite.prepare(`
      UPDATE articles
      SET
        title = ?,
        link = ?,
        content_html = ?,
        content_snippet = ?,
        author = ?
      WHERE id = ?
    `);

    let insertedCount = 0;

    const tx = this.conn.sqlite.transaction((batch: ParsedFeedItem[]) => {
      for (const item of batch) {
        const existing = findExistingStmt.get(feedId, item.externalId);
        if (!existing) {
          insertStmt.run(
            crypto.randomUUID(),
            feedId,
            item.externalId,
            item.title,
            item.link,
            item.contentHtml,
            item.contentSnippet,
            item.author,
            item.publishedAt,
            item.discoveredAt
          );
          insertedCount += 1;
        } else {
          updateMetadataStmt.run(
            item.title,
            item.link,
            item.contentHtml,
            item.contentSnippet,
            item.author,
            existing.id
          );
        }
      }
    });

    tx(items);
    return insertedCount;
  }

  /**
   * Lists articles ordered strictly by published_at DESC, discovered_at DESC, id DESC (FR-005).
   */
  listArticles(filters?: { feedId?: string; unreadOnly?: boolean }): ArticleSummaryDto[] {
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (filters?.feedId) {
      conditions.push('a.feed_id = ?');
      params.push(filters.feedId);
    }

    if (filters?.unreadOnly) {
      conditions.push('a.is_read = 0');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        a.id,
        a.feed_id,
        f.title AS feed_title,
        a.title,
        a.link,
        a.content_snippet,
        a.content_html,
        a.author,
        a.published_at,
        a.discovered_at,
        a.is_read,
        a.read_at
      FROM articles a
      INNER JOIN feeds f ON f.id = a.feed_id
      ${whereClause}
      ORDER BY a.published_at DESC, a.discovered_at DESC, a.id DESC
    `;

    const stmt = this.conn.sqlite.prepare<Array<string | number>, RawArticleJoinRow>(sql);
    const rows = stmt.all(...params);
    return rows.map(mapRowToArticleDto);
  }

  findById(articleId: string): ArticleSummaryDto | null {
    const stmt = this.conn.sqlite.prepare<[string], RawArticleJoinRow>(`
      SELECT
        a.id,
        a.feed_id,
        f.title AS feed_title,
        a.title,
        a.link,
        a.content_snippet,
        a.content_html,
        a.author,
        a.published_at,
        a.discovered_at,
        a.is_read,
        a.read_at
      FROM articles a
      INNER JOIN feeds f ON f.id = a.feed_id
      WHERE a.id = ?
    `);

    const row = stmt.get(articleId);
    return row ? mapRowToArticleDto(row) : null;
  }

  updateReadState(
    articleId: string,
    isRead: boolean
  ): { id: string; isRead: boolean; readAt: string | null } | null {
    const readAt = isRead ? new Date().toISOString() : null;
    const stmt = this.conn.sqlite.prepare(`
      UPDATE articles
      SET is_read = ?, read_at = ?
      WHERE id = ?
    `);

    const res = stmt.run(isRead ? 1 : 0, readAt, articleId);
    if (res.changes === 0) {
      return null;
    }

    return {
      id: articleId,
      isRead,
      readAt,
    };
  }

  markAllAsRead(feedId?: string): number {
    const nowIso = new Date().toISOString();
    if (feedId) {
      const stmt = this.conn.sqlite.prepare(`
        UPDATE articles
        SET is_read = 1, read_at = ?
        WHERE feed_id = ? AND is_read = 0
      `);
      return stmt.run(nowIso, feedId).changes;
    }

    const stmt = this.conn.sqlite.prepare(`
      UPDATE articles
      SET is_read = 1, read_at = ?
      WHERE is_read = 0
    `);
    return stmt.run(nowIso).changes;
  }
}
