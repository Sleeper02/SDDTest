import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createDatabaseConnection,
  setDatabaseConnectionForTesting,
  type DatabaseConnection,
} from '@/db/client';
import { GET as getFeeds, POST as postFeed } from '@/app/api/feeds/route';
import { DELETE as deleteFeed } from '@/app/api/feeds/[feedId]/route';
import { POST as refreshFeeds } from '@/app/api/feeds/refresh/route';
import { GET as getArticles } from '@/app/api/articles/route';
import { PATCH as patchArticleRead } from '@/app/api/articles/[articleId]/read/route';
import { POST as postMarkAllRead } from '@/app/api/articles/mark-all-read/route';

const MOCK_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Mock Tech Blog</title>
    <link>https://mockblog.example.com</link>
    <description>Artigos para teste de rota</description>
    <item>
      <guid>post-old</guid>
      <title>Post Antigo</title>
      <link>https://mockblog.example.com/old</link>
      <description><![CDATA[<p>Antigo</p>]]></description>
      <pubDate>Tue, 03 Nov 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <guid>post-new</guid>
      <title>Post Novo</title>
      <link>https://mockblog.example.com/new</link>
      <description><![CDATA[<p>Novo</p><script>evil()</script>]]></description>
      <pubDate>Thu, 05 Nov 2026 18:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

describe('Next.js API Route Handlers Contract Tests', () => {
  let conn: DatabaseConnection;

  beforeEach(() => {
    conn = createDatabaseConnection(':memory:');
    setDatabaseConnectionForTesting(conn);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('invalid-xml.example.com')) {
          return new Response('<html>Not XML</html>', { status: 200 });
        }
        return new Response(MOCK_XML, { status: 200 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setDatabaseConnectionForTesting(null);
    conn.sqlite.close();
  });

  it('[US1] POST /api/feeds subscribes to valid feed, rejects duplicates (409) and invalid URLs (400/422)', async () => {
    // 1. Valid subscription -> 201
    const createReq = new Request('http://localhost:3000/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://mockblog.example.com/feed.xml' }),
    });
    const createRes = await postFeed(createReq);
    expect(createRes.status).toBe(201);
    const createdBody = (await createRes.json()) as {
      feed: { id: string; title: string; unreadCount: number };
      importedArticlesCount: number;
    };
    expect(createdBody.feed.title).toBe('Mock Tech Blog');
    expect(createdBody.feed.unreadCount).toBe(2);
    expect(createdBody.importedArticlesCount).toBe(2);

    // 2. Duplicate subscription -> 409 DUPLICATE_FEED
    const dupReq = new Request('http://localhost:3000/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://mockblog.example.com/feed.xml' }),
    });
    const dupRes = await postFeed(dupReq);
    expect(dupRes.status).toBe(409);
    const dupErr = (await dupRes.json()) as { error: { code: string } };
    expect(dupErr.error.code).toBe('DUPLICATE_FEED');

    // 3. Invalid URL format -> 400 VALIDATION_ERROR
    const badUrlReq = new Request('http://localhost:3000/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-valid-url' }),
    });
    const badUrlRes = await postFeed(badUrlReq);
    expect(badUrlRes.status).toBe(400);

    // 4. Non-RSS XML content -> 422 INVALID_FEED_SOURCE
    const nonFeedReq = new Request('http://localhost:3000/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://invalid-xml.example.com/page' }),
    });
    const nonFeedRes = await postFeed(nonFeedReq);
    expect(nonFeedRes.status).toBe(422);
  });

  it('[US2 & US3] lists articles newest-first, toggles read state, marks all read, refreshes, and deletes feed', async () => {
    // Subscribe first
    const createRes = await postFeed(
      new Request('http://localhost:3000/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://mockblog.example.com/feed.xml' }),
      })
    );
    const { feed } = (await createRes.json()) as { feed: { id: string } };

    // GET /api/articles -> ordered newest-first and sanitized
    const listRes = await getArticles(new Request('http://localhost:3000/api/articles'));
    expect(listRes.status).toBe(200);
    const { articles } = (await listRes.json()) as {
      articles: Array<{
        id: string;
        title: string;
        contentHtml: string;
        isRead: boolean;
      }>;
    };
    expect(articles).toHaveLength(2);
    expect(articles[0]!.title).toBe('Post Novo');
    expect(articles[0]!.contentHtml).toBe('<p>Novo</p>');
    expect(articles[1]!.title).toBe('Post Antigo');

    // PATCH /api/articles/[articleId]/read -> mark newest as read
    const patchRes = await patchArticleRead(
      new Request(`http://localhost:3000/api/articles/${articles[0]!.id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      }),
      { params: Promise.resolve({ articleId: articles[0]!.id }) }
    );
    expect(patchRes.status).toBe(200);

    // GET /api/articles?unreadOnly=true -> only 1 unread article remains
    const unreadRes = await getArticles(
      new Request('http://localhost:3000/api/articles?unreadOnly=true')
    );
    const unreadBody = (await unreadRes.json()) as { articles: Array<{ title: string }> };
    expect(unreadBody.articles).toHaveLength(1);
    expect(unreadBody.articles[0]!.title).toBe('Post Antigo');

    // POST /api/articles/mark-all-read -> marks remaining article as read
    const markAllRes = await postMarkAllRead(
      new Request('http://localhost:3000/api/articles/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedId: feed.id }),
      })
    );
    expect(markAllRes.status).toBe(200);
    const markAllBody = (await markAllRes.json()) as { updatedCount: number };
    expect(markAllBody.updatedCount).toBe(1);

    // POST /api/feeds/refresh -> refreshes feed and preserves read status
    const refreshRes = await refreshFeeds(
      new Request('http://localhost:3000/api/feeds/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedId: feed.id }),
      })
    );
    expect(refreshRes.status).toBe(200);

    // GET /api/feeds -> totalUnreadCount is still 0 after refresh
    const feedsRes = await getFeeds();
    const feedsBody = (await feedsRes.json()) as { totalUnreadCount: number };
    expect(feedsBody.totalUnreadCount).toBe(0);

    // DELETE /api/feeds/[feedId] -> 204 No Content
    const delRes = await deleteFeed(
      new Request(`http://localhost:3000/api/feeds/${feed.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ feedId: feed.id }) }
    );
    expect(delRes.status).toBe(204);
  });
});
