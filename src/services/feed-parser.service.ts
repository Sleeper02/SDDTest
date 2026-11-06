import Parser from 'rss-parser';
import crypto from 'node:crypto';
import { env } from '@/config/env';
import { sanitizeFeedHtml } from './html-sanitizer.service';

export interface ParsedFeedItem {
  externalId: string;
  title: string;
  link: string | null;
  contentHtml: string;
  contentSnippet: string;
  author: string | null;
  publishedAt: string;
  discoveredAt: string;
}

export interface ParsedFeedResult {
  title: string;
  description: string | null;
  siteUrl: string | null;
  items: ParsedFeedItem[];
}

type CustomItem = Parser.Item & {
  id?: string;
  'content:encoded'?: string;
  author?: string;
  creator?: string;
  updated?: string;
};

export class InvalidFeedSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFeedSourceError';
  }
}

function resolveValidHttpLink(rawLink: string | undefined): string | null {
  if (!rawLink) return null;
  try {
    const parsed = new URL(rawLink.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function resolvePublishedAtIso(
  rawDateCandidates: Array<string | undefined>,
  discoveredAtIso: string
): string {
  for (const candidate of rawDateCandidates) {
    if (!candidate || !candidate.trim()) continue;
    const parsedMs = Date.parse(candidate.trim());
    if (!Number.isNaN(parsedMs)) {
      return new Date(parsedMs).toISOString();
    }
  }
  return discoveredAtIso;
}

export function computeExternalId(item: {
  guid?: string;
  id?: string;
  link?: string;
  title?: string;
  pubDate?: string;
  isoDate?: string;
}): string {
  const direct = (item.guid || item.id || item.link || '').trim();
  if (direct) {
    return direct;
  }
  const fallbackPayload = `${(item.title ?? '').trim()}|${(item.isoDate ?? item.pubDate ?? '').trim()}`;
  return crypto.createHash('sha256').update(fallbackPayload).digest('hex');
}

export async function parseFeedXmlString(
  xml: string,
  feedUrl: string,
  discoveredAtIso: string = new Date().toISOString()
): Promise<ParsedFeedResult> {
  const parser = new Parser<Record<string, unknown>, CustomItem>({
    customFields: {
      item: ['id', 'content:encoded', 'author', 'updated'],
    },
  });

  return parseWithParserSyncOrThrow(parser, xml, feedUrl, discoveredAtIso);
}

async function parseWithParserSyncOrThrow(
  parser: Parser<Record<string, unknown>, CustomItem>,
  xml: string,
  feedUrl: string,
  discoveredAtIso: string
): Promise<ParsedFeedResult> {
  if (!xml || !xml.trim()) {
    throw new InvalidFeedSourceError('A resposta da URL está vazia e não contém um feed RSS/Atom.');
  }

  let parsed: Parser.Output<CustomItem>;
  try {
    parsed = await parser.parseString(xml);
  } catch {
    throw new InvalidFeedSourceError(
      'O conteúdo retornado pela URL não é um feed RSS 2.0 ou Atom 1.0 válido.'
    );
  }

  const fallbackHostname = (() => {
    try {
      return new URL(feedUrl).hostname;
    } catch {
      return 'Feed sem título';
    }
  })();

  const feedTitle = (parsed.title ?? '').trim() || fallbackHostname;
  const description = (parsed.description ?? '').trim() || null;
  const siteUrl = resolveValidHttpLink(parsed.link);

  const seenExternalIds = new Set<string>();
  const items: ParsedFeedItem[] = [];

  for (const rawItem of parsed.items ?? []) {
    const externalId = computeExternalId(rawItem);
    if (seenExternalIds.has(externalId)) {
      continue;
    }
    seenExternalIds.add(externalId);

    const title = (rawItem.title ?? '').trim() || 'Sem título';
    const link = resolveValidHttpLink(rawItem.link);
    const rawBody =
      rawItem['content:encoded'] ?? rawItem.content ?? rawItem.summary ?? rawItem.contentSnippet ?? '';
    const { contentHtml, contentSnippet } = sanitizeFeedHtml(rawBody);

    const authorRaw = (rawItem.creator ?? rawItem.author ?? '').trim();
    const author = authorRaw || null;

    const publishedAt = resolvePublishedAtIso(
      [rawItem.isoDate, rawItem.pubDate, rawItem.updated],
      discoveredAtIso
    );

    items.push({
      externalId,
      title,
      link,
      contentHtml,
      contentSnippet,
      author,
      publishedAt,
      discoveredAt: discoveredAtIso,
    });
  }

  return {
    title: feedTitle,
    description,
    siteUrl,
    items,
  };
}

export async function fetchAndParseFeed(
  feedUrl: string,
  discoveredAtIso: string = new Date().toISOString()
): Promise<ParsedFeedResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.FEED_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SDD-RSS-Feed-Reader/1.0 (+http://localhost:3000)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Tempo limite excedido ao tentar buscar o feed.'
        : 'Não foi possível conectar à URL informada.';
    throw new InvalidFeedSourceError(message);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new InvalidFeedSourceError(
      `A fonte retornou status HTTP ${response.status} ao buscar o feed.`
    );
  }

  const xml = await response.text();
  return parseFeedXmlString(xml, feedUrl, discoveredAtIso);
}
