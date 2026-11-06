import { getDatabaseConnection, type DatabaseConnection } from '@/db/client';
import { FeedRepository, DuplicateFeedError } from '@/db/repositories/feed.repository';
import { ArticleRepository } from '@/db/repositories/article.repository';
import {
  fetchAndParseFeed,
  type ParsedFeedResult,
} from '@/services/feed-parser.service';
import { normalizeFeedUrl, type FeedDto } from '@/schemas/feed.schema';
import { logger } from '@/lib/logger';

export type FeedFetcherFn = (
  feedUrl: string,
  discoveredAtIso?: string
) => Promise<ParsedFeedResult>;

export interface SubscribeToFeedOutput {
  feed: FeedDto;
  importedArticlesCount: number;
}

export interface FeedRefreshFailure {
  feedId: string;
  title: string;
  error: string;
}

export interface RefreshFeedsOutput {
  refreshedFeeds: number;
  newArticlesCount: number;
  failures: FeedRefreshFailure[];
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class FeedSyncService {
  private readonly conn: DatabaseConnection;
  private readonly feedRepo: FeedRepository;
  private readonly articleRepo: ArticleRepository;
  private readonly fetcher: FeedFetcherFn;

  constructor(
    conn: DatabaseConnection = getDatabaseConnection(),
    fetcher: FeedFetcherFn = fetchAndParseFeed
  ) {
    this.conn = conn;
    this.feedRepo = new FeedRepository(conn);
    this.articleRepo = new ArticleRepository(conn);
    this.fetcher = fetcher;
  }

  async subscribeToFeed(rawUrl: string): Promise<SubscribeToFeedOutput> {
    const normalizedUrl = normalizeFeedUrl(rawUrl);

    const existing = this.feedRepo.findByUrl(normalizedUrl);
    if (existing) {
      throw new DuplicateFeedError(normalizedUrl);
    }

    const nowIso = new Date().toISOString();
    const parsedFeed = await this.fetcher(normalizedUrl, nowIso);

    let createdFeedId = '';
    let importedArticlesCount = 0;

    const tx = this.conn.sqlite.transaction(() => {
      const created = this.feedRepo.create({
        url: normalizedUrl,
        title: parsedFeed.title,
        description: parsedFeed.description,
        siteUrl: parsedFeed.siteUrl,
        lastSyncedAt: nowIso,
        lastError: null,
        createdAt: nowIso,
      });
      createdFeedId = created.id;
      importedArticlesCount = this.articleRepo.upsertItemsForFeed(created.id, parsedFeed.items);
    });

    tx();

    const finalFeed = this.feedRepo.findById(createdFeedId);
    if (!finalFeed) {
      throw new Error('Não foi possível carregar o feed após a inscrição.');
    }

    logger.info('Feed subscribed successfully', {
      feedId: finalFeed.id,
      url: finalFeed.url,
      importedArticlesCount,
    });

    return {
      feed: finalFeed,
      importedArticlesCount,
    };
  }

  async refreshFeeds(targetFeedId?: string): Promise<RefreshFeedsOutput> {
    const feedsToRefresh: FeedDto[] = [];

    if (targetFeedId) {
      const single = this.feedRepo.findById(targetFeedId);
      if (!single) {
        throw new NotFoundError('Feed não encontrado para atualização.');
      }
      feedsToRefresh.push(single);
    } else {
      feedsToRefresh.push(...this.feedRepo.listAll().feeds);
    }

    let refreshedFeeds = 0;
    let newArticlesCount = 0;
    const failures: FeedRefreshFailure[] = [];

    for (const feed of feedsToRefresh) {
      const nowIso = new Date().toISOString();
      try {
        const parsed = await this.fetcher(feed.url, nowIso);
        const inserted = this.articleRepo.upsertItemsForFeed(feed.id, parsed.items);
        this.feedRepo.updateSyncStatus(feed.id, {
          lastSyncedAt: nowIso,
          lastError: null,
        });
        refreshedFeeds += 1;
        newArticlesCount += inserted;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Falha desconhecida ao atualizar o feed.';
        this.feedRepo.updateSyncStatus(feed.id, {
          lastError: errorMessage,
        });
        failures.push({
          feedId: feed.id,
          title: feed.title,
          error: errorMessage,
        });
        logger.warn('Feed refresh failed for source', {
          feedId: feed.id,
          url: feed.url,
          error: errorMessage,
        });
      }
    }

    return {
      refreshedFeeds,
      newArticlesCount,
      failures,
    };
  }
}
