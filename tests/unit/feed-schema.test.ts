import { describe, it, expect } from 'vitest';
import {
  CreateFeedInputSchema,
  ArticleFilterQuerySchema,
  UpdateArticleReadStateSchema,
  normalizeFeedUrl,
} from '@/schemas/feed.schema';

describe('Feed & Article Zod Schemas (feed.schema.ts)', () => {
  it('validates valid HTTP and HTTPS feed URLs', () => {
    const res1 = CreateFeedInputSchema.safeParse({ url: '  https://example.com/rss.xml  ' });
    expect(res1.success).toBe(true);
    if (res1.success) {
      expect(res1.data.url).toBe('https://example.com/rss.xml');
    }
  });

  it('rejects non-HTTP/HTTPS schemes and malformed URLs', () => {
    const ftpRes = CreateFeedInputSchema.safeParse({ url: 'ftp://example.com/feed.xml' });
    expect(ftpRes.success).toBe(false);

    const jsRes = CreateFeedInputSchema.safeParse({ url: 'javascript:alert(1)' });
    expect(jsRes.success).toBe(false);

    const invalidRes = CreateFeedInputSchema.safeParse({ url: 'not-a-url' });
    expect(invalidRes.success).toBe(false);
  });

  it('normalizes feed URLs consistently for duplicate prevention', () => {
    expect(normalizeFeedUrl('HTTPS://Example.COM:443/feed.xml#section')).toBe(
      'https://example.com/feed.xml'
    );
  });

  it('transforms unreadOnly query string into boolean', () => {
    const parsedTrue = ArticleFilterQuerySchema.parse({ unreadOnly: 'true' });
    expect(parsedTrue.unreadOnly).toBe(true);

    const parsedFalse = ArticleFilterQuerySchema.parse({ unreadOnly: 'false' });
    expect(parsedFalse.unreadOnly).toBe(false);
  });

  it('validates UpdateArticleReadStateSchema boolean payload', () => {
    expect(UpdateArticleReadStateSchema.safeParse({ isRead: true }).success).toBe(true);
    expect(UpdateArticleReadStateSchema.safeParse({ isRead: 'yes' }).success).toBe(false);
  });
});
