import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const feeds = sqliteTable(
  'feeds',
  {
    id: text('id').primaryKey().notNull(),
    url: text('url').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    siteUrl: text('site_url'),
    lastSyncedAt: text('last_synced_at'),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('feeds_url_unique_idx').on(table.url)]
);

export const articles = sqliteTable(
  'articles',
  {
    id: text('id').primaryKey().notNull(),
    feedId: text('feed_id')
      .notNull()
      .references(() => feeds.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    link: text('link'),
    contentHtml: text('content_html').notNull(),
    contentSnippet: text('content_snippet').notNull(),
    author: text('author'),
    publishedAt: text('published_at').notNull(),
    discoveredAt: text('discovered_at').notNull(),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    readAt: text('read_at'),
  },
  (table) => [
    uniqueIndex('articles_feed_external_unique_idx').on(table.feedId, table.externalId),
    index('articles_published_at_idx').on(table.publishedAt, table.discoveredAt),
    index('articles_feed_read_published_idx').on(table.feedId, table.isRead, table.publishedAt),
  ]
);

export type FeedRow = typeof feeds.$inferSelect;
export type NewFeedRow = typeof feeds.$inferInsert;
export type ArticleRow = typeof articles.$inferSelect;
export type NewArticleRow = typeof articles.$inferInsert;
