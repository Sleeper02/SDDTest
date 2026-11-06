import { describe, it, expect } from 'vitest';
import { parseFeedXmlString, InvalidFeedSourceError } from '@/services/feed-parser.service';

const SAMPLE_RSS_2_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Tech News RSS</title>
    <link>https://technews.example.com</link>
    <description>Notícias de tecnologia</description>
    <item>
      <guid>item-1</guid>
      <title>Primeiro Artigo</title>
      <link>https://technews.example.com/post-1</link>
      <description><![CDATA[<p>Resumo seguro</p><script>alert(1)</script>]]></description>
      <pubDate>Wed, 04 Nov 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <guid>item-no-date</guid>
      <title>Artigo Sem Data</title>
      <link>https://technews.example.com/post-2</link>
      <description>Texto simples</description>
    </item>
  </channel>
</rss>`;

const SAMPLE_ATOM_XML = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Dev Feed</title>
  <link href="https://atom.example.com/"/>
  <updated>2026-11-05T12:00:00Z</updated>
  <id>urn:uuid:60a76c80-d399-11d9-b93C-0003939e0af6</id>
  <entry>
    <title>Atom Entry 1</title>
    <link href="https://atom.example.com/entry-1"/>
    <id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>
    <updated>2026-11-05T11:30:00Z</updated>
    <summary type="html">&lt;p&gt;Conteúdo Atom&lt;/p&gt;</summary>
    <author><name>Ada Lovelace</name></author>
  </entry>
</feed>`;

describe('Feed Parser Service (feed-parser.service.ts)', () => {
  it('parses RSS 2.0 XML, sanitizes HTML, and falls back to discoveredAt when pubDate is missing', async () => {
    const discoveredAt = '2026-11-05T23:00:00.000Z';
    const parsed = await parseFeedXmlString(
      SAMPLE_RSS_2_XML,
      'https://technews.example.com/rss.xml',
      discoveredAt
    );

    expect(parsed.title).toBe('Tech News RSS');
    expect(parsed.siteUrl).toBe('https://technews.example.com/');
    expect(parsed.items).toHaveLength(2);

    const first = parsed.items[0]!;
    expect(first.externalId).toBe('item-1');
    expect(first.title).toBe('Primeiro Artigo');
    expect(first.contentHtml).toBe('<p>Resumo seguro</p>');
    expect(first.publishedAt).toBe('2026-11-04T10:00:00.000Z');

    const second = parsed.items[1]!;
    expect(second.externalId).toBe('item-no-date');
    expect(second.publishedAt).toBe(discoveredAt);
  });

  it('parses Atom 1.0 XML entries accurately', async () => {
    const discoveredAt = '2026-11-05T23:00:00.000Z';
    const parsed = await parseFeedXmlString(
      SAMPLE_ATOM_XML,
      'https://atom.example.com/atom.xml',
      discoveredAt
    );

    expect(parsed.title).toBe('Atom Dev Feed');
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]!.externalId).toBe('urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a');
    expect(parsed.items[0]!.publishedAt).toBe('2026-11-05T11:30:00.000Z');
    expect(parsed.items[0]!.contentHtml).toContain('<p>Conteúdo Atom</p>');
  });

  it('throws InvalidFeedSourceError on invalid XML or non-feed HTML', async () => {
    await expect(
      parseFeedXmlString('<html><body>Not a feed</body></html>', 'https://example.com')
    ).rejects.toThrow(InvalidFeedSourceError);
  });
});
