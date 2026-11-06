import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabaseConnection, type DatabaseConnection } from '@/db/client';
import { FeedRepository, DuplicateFeedError } from '@/db/repositories/feed.repository';
import { ArticleRepository } from '@/db/repositories/article.repository';
import { FeedSyncService } from '@/services/feed-sync.service';
import type { ParsedFeedResult } from '@/services/feed-parser.service';

describe('SQLite Feed & Article Repository Integration Tests', () => {
  let conn: DatabaseConnection;
  let feedRepo: FeedRepository;
  let articleRepo: ArticleRepository;

  beforeEach(() => {
    conn = createDatabaseConnection(':memory:');
    feedRepo = new FeedRepository(conn);
    articleRepo = new ArticleRepository(conn);
  });

  afterEach(() => {
    conn.sqlite.close();
  });

  it('[US1] creates feed subscription, normalizes URL, and rejects duplicate URLs', () => {
    const feed = feedRepo.create({
      url: 'https://Example.com/rss.xml#top',
      title: 'Example Feed',
      description: 'Tech updates',
      siteUrl: 'https://example.com',
    });

    expect(feed.url).toBe('https://example.com/rss.xml');
    expect(feed.title).toBe('Example Feed');
    expect(feed.unreadCount).toBe(0);

    expect(() =>
      feedRepo.create({
        url: 'https://example.com:443/rss.xml',
        title: 'Duplicate Feed',
      })
    ).toThrow(DuplicateFeedError);
  });

  it('[US1] cascades deletion of articles when a feed is deleted', () => {
    const feed = feedRepo.create({
      url: 'https://cascade.example.com/feed.xml',
      title: 'Cascade Feed',
    });

    articleRepo.upsertItemsForFeed(feed.id, [
      {
        externalId: 'art-1',
        title: 'Artigo 1',
        link: 'https://cascade.example.com/1',
        contentHtml: '<p>Conteúdo 1</p>',
        contentSnippet: 'Conteúdo 1',
        author: 'Autor',
        publishedAt: '2026-11-05T10:00:00.000Z',
        discoveredAt: '2026-11-05T10:05:00.000Z',
      },
    ]);

    expect(articleRepo.listArticles()).toHaveLength(1);
    expect(feedRepo.deleteById(feed.id)).toBe(true);
    expect(articleRepo.listArticles()).toHaveLength(0);
  });

  it('[US2] orders articles strictly by published_at DESC (newest first) across multiple feeds', () => {
    const feedA = feedRepo.create({
      url: 'https://feeda.example.com/rss',
      title: 'Feed A',
    });
    const feedB = feedRepo.create({
      url: 'https://feedb.example.com/rss',
      title: 'Feed B',
    });

    articleRepo.upsertItemsForFeed(feedA.id, [
      {
        externalId: 'older-a',
        title: 'Artigo Antigo (A)',
        link: null,
        contentHtml: '<p>A</p>',
        contentSnippet: 'A',
        author: null,
        publishedAt: '2026-11-01T08:00:00.000Z',
        discoveredAt: '2026-11-05T00:00:00.000Z',
      },
      {
        externalId: 'newest-a',
        title: 'Artigo Mais Recente (A)',
        link: null,
        contentHtml: '<p>A2</p>',
        contentSnippet: 'A2',
        author: null,
        publishedAt: '2026-11-05T20:00:00.000Z',
        discoveredAt: '2026-11-05T20:00:00.000Z',
      },
    ]);

    articleRepo.upsertItemsForFeed(feedB.id, [
      {
        externalId: 'middle-b',
        title: 'Artigo Intermediário (B)',
        link: null,
        contentHtml: '<p>B</p>',
        contentSnippet: 'B',
        author: null,
        publishedAt: '2026-11-03T15:00:00.000Z',
        discoveredAt: '2026-11-05T10:00:00.000Z',
      },
    ]);

    const allArticles = articleRepo.listArticles();
    expect(allArticles.map((a) => a.title)).toEqual([
      'Artigo Mais Recente (A)',
      'Artigo Intermediário (B)',
      'Artigo Antigo (A)',
    ]);

    const onlyFeedB = articleRepo.listArticles({ feedId: feedB.id });
    expect(onlyFeedB).toHaveLength(1);
    expect(onlyFeedB[0]!.title).toBe('Artigo Intermediário (B)');
  });

  it('[US2 & US3] preserves read status on feed refresh and records non-blocking errors for failing feeds', async () => {
    const mockFeeds: Record<string, ParsedFeedResult> = {
      'https://working.example.com/rss': {
        title: 'Working Feed',
        description: null,
        siteUrl: 'https://working.example.com',
        items: [
          {
            externalId: 'item-1',
            title: 'Post Inicial',
            link: 'https://working.example.com/1',
            contentHtml: '<p>Post 1</p>',
            contentSnippet: 'Post 1',
            author: null,
            publishedAt: '2026-11-05T10:00:00.000Z',
            discoveredAt: '2026-11-05T10:00:00.000Z',
          },
        ],
      },
      'https://flaky.example.com/rss': {
        title: 'Flaky Feed',
        description: null,
        siteUrl: null,
        items: [],
      },
    };

    let flakyShouldFail = false;

    const service = new FeedSyncService(conn, async (url) => {
      if (url === 'https://flaky.example.com/rss' && flakyShouldFail) {
        throw new Error('Fonte temporariamente indisponível');
      }
      const found = mockFeeds[url];
      if (!found) throw new Error('Unknown feed');
      return found;
    });

    const sub1 = await service.subscribeToFeed('https://working.example.com/rss');
    await service.subscribeToFeed('https://flaky.example.com/rss');

    const articlesBefore = articleRepo.listArticles({ feedId: sub1.feed.id });
    expect(articlesBefore).toHaveLength(1);

    // Mark the existing article as read
    articleRepo.updateReadState(articlesBefore[0]!.id, true);
    expect(feedRepo.findById(sub1.feed.id)?.unreadCount).toBe(0);

    // Add a second article to the working feed and make the flaky feed fail
    mockFeeds['https://working.example.com/rss']!.items.push({
      externalId: 'item-2',
      title: 'Novo Post Após Refresh',
      link: 'https://working.example.com/2',
      contentHtml: '<p>Post 2</p>',
      contentSnippet: 'Post 2',
      author: null,
      publishedAt: '2026-11-05T12:00:00.000Z',
      discoveredAt: '2026-11-05T12:00:00.000Z',
    });
    flakyShouldFail = true;

    const refreshResult = await service.refreshFeeds();
    expect(refreshResult.refreshedFeeds).toBe(1);
    expect(refreshResult.newArticlesCount).toBe(1);
    expect(refreshResult.failures).toHaveLength(1);
    expect(refreshResult.failures[0]!.title).toBe('Flaky Feed');

    // Verify existing article is STILL read, while the new article is unread
    const articlesAfter = articleRepo.listArticles({ feedId: sub1.feed.id });
    expect(articlesAfter).toHaveLength(2);
    const item2 = articlesAfter.find((a) => a.title === 'Novo Post Após Refresh')!;
    const item1 = articlesAfter.find((a) => a.title === 'Post Inicial')!;
    expect(item2.isRead).toBe(false);
    expect(item1.isRead).toBe(true);
  });

  it('[US3] supports unreadOnly filtering and bulk markAllAsRead', () => {
    const feed = feedRepo.create({
      url: 'https://bulk.example.com/rss',
      title: 'Bulk Feed',
    });

    articleRepo.upsertItemsForFeed(feed.id, [
      {
        externalId: 'b1',
        title: 'Artigo 1',
        link: null,
        contentHtml: '<p>1</p>',
        contentSnippet: '1',
        author: null,
        publishedAt: '2026-11-05T01:00:00.000Z',
        discoveredAt: '2026-11-05T01:00:00.000Z',
      },
      {
        externalId: 'b2',
        title: 'Artigo 2',
        link: null,
        contentHtml: '<p>2</p>',
        contentSnippet: '2',
        author: null,
        publishedAt: '2026-11-05T02:00:00.000Z',
        discoveredAt: '2026-11-05T02:00:00.000Z',
      },
    ]);

    expect(articleRepo.listArticles({ unreadOnly: true })).toHaveLength(2);
    expect(articleRepo.markAllAsRead(feed.id)).toBe(2);
    expect(articleRepo.listArticles({ unreadOnly: true })).toHaveLength(0);
    expect(feedRepo.listAll().totalUnreadCount).toBe(0);
  });

  it('[SC-004] filters and sorts 1,000 stored articles in under 200ms', () => {
    const feed = feedRepo.create({
      url: 'https://perf.example.com/rss',
      title: 'Performance Feed',
    });

    const baseMs = Date.parse('2026-01-01T00:00:00.000Z');
    const items = Array.from({ length: 1000 }, (_, idx) => {
      const iso = new Date(baseMs + idx * 60_000).toISOString();
      return {
        externalId: `perf-${idx}`,
        title: `Artigo #${idx}`,
        link: `https://perf.example.com/${idx}`,
        contentHtml: `<p>Conteúdo do artigo ${idx}</p>`,
        contentSnippet: `Conteúdo do artigo ${idx}`,
        author: 'Bench',
        publishedAt: iso,
        discoveredAt: iso,
      };
    });

    articleRepo.upsertItemsForFeed(feed.id, items);

    const start = performance.now();
    const allSorted = articleRepo.listArticles({ unreadOnly: true });
    const elapsedMs = performance.now() - start;

    expect(allSorted).toHaveLength(1000);
    expect(allSorted[0]!.title).toBe('Artigo #999');
    expect(allSorted[999]!.title).toBe('Artigo #0');
    expect(elapsedMs).toBeLessThan(200);
  });
});
