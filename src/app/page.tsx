'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AddFeedForm } from '@/components/AddFeedForm';
import { FeedSidebar } from '@/components/FeedSidebar';
import { ArticleList } from '@/components/ArticleList';
import { ArticleReaderPane } from '@/components/ArticleReaderPane';
import type { ArticleSummaryDto, FeedDto } from '@/schemas/feed.schema';

interface FeedsResponse {
  feeds: FeedDto[];
  totalUnreadCount: number;
}

interface ArticlesResponse {
  articles: ArticleSummaryDto[];
}

export default function RssReaderPage(): React.JSX.Element {
  const [feeds, setFeeds] = useState<FeedDto[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState<number>(0);
  const [articles, setArticles] = useState<ArticleSummaryDto[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleSummaryDto | null>(null);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);

  const [isLoadingArticles, setIsLoadingArticles] = useState<boolean>(true);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [removingFeedId, setRemovingFeedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFeeds = useCallback(async (): Promise<void> => {
    const res = await fetch('/api/feeds', { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as FeedsResponse;
    setFeeds(data.feeds);
    setTotalUnreadCount(data.totalUnreadCount);
  }, []);

  const loadArticles = useCallback(
    async (feedId: string | null, onlyUnread: boolean): Promise<void> => {
      setIsLoadingArticles(true);
      try {
        const params = new URLSearchParams();
        if (feedId) params.set('feedId', feedId);
        if (onlyUnread) params.set('unreadOnly', 'true');

        const queryString = params.toString();
        const url = queryString ? `/api/articles?${queryString}` : '/api/articles';

        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as ArticlesResponse;
        setArticles(data.articles);

        setSelectedArticle((prev) => {
          if (!prev) return null;
          return data.articles.find((a) => a.id === prev.id) ?? prev;
        });
      } finally {
        setIsLoadingArticles(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadFeeds();
  }, [loadFeeds]);

  useEffect(() => {
    void loadArticles(selectedFeedId, unreadOnly);
  }, [loadArticles, selectedFeedId, unreadOnly]);

  async function handleSubscribe(url: string): Promise<void> {
    setIsSubscribing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const errPayload = (await res.json()) as { error?: { message?: string } };
        const msg = errPayload.error?.message ?? 'Não foi possível adicionar o feed.';
        setErrorMessage(msg);
        throw new Error(msg);
      }

      await Promise.all([loadFeeds(), loadArticles(selectedFeedId, unreadOnly)]);
    } finally {
      setIsSubscribing(false);
    }
  }

  async function handleRemoveFeed(feedId: string): Promise<void> {
    setRemovingFeedId(feedId);
    try {
      const res = await fetch(`/api/feeds/${feedId}`, { method: 'DELETE' });
      if (res.ok) {
        const nextFeedId = selectedFeedId === feedId ? null : selectedFeedId;
        if (selectedFeedId === feedId) {
          setSelectedFeedId(null);
        }
        if (selectedArticle?.feedId === feedId) {
          setSelectedArticle(null);
        }
        await Promise.all([loadFeeds(), loadArticles(nextFeedId, unreadOnly)]);
      }
    } finally {
      setRemovingFeedId(null);
    }
  }

  async function handleToggleReadState(articleId: string, nextIsRead: boolean): Promise<void> {
    const res = await fetch(`/api/articles/${articleId}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: nextIsRead }),
    });

    if (!res.ok) return;

    setSelectedArticle((prev) =>
      prev && prev.id === articleId ? { ...prev, isRead: nextIsRead } : prev
    );

    await Promise.all([loadFeeds(), loadArticles(selectedFeedId, unreadOnly)]);
  }

  function handleSelectArticle(article: ArticleSummaryDto): void {
    setSelectedArticle(article);
    if (!article.isRead) {
      void handleToggleReadState(article.id, true);
    }
  }

  async function handleRefreshFeeds(): Promise<void> {
    setIsRefreshing(true);
    try {
      await fetch('/api/feeds/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedFeedId ? { feedId: selectedFeedId } : {}),
      });
      await Promise.all([loadFeeds(), loadArticles(selectedFeedId, unreadOnly)]);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleMarkAllRead(): Promise<void> {
    const res = await fetch('/api/articles/mark-all-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedFeedId ? { feedId: selectedFeedId } : {}),
    });

    if (res.ok) {
      setSelectedArticle((prev) => (prev ? { ...prev, isRead: true } : null));
      await Promise.all([loadFeeds(), loadArticles(selectedFeedId, unreadOnly)]);
    }
  }

  const activeFeedTitle = selectedFeedId
    ? (feeds.find((f) => f.id === selectedFeedId)?.title ?? 'Artigos do Feed')
    : 'Todos os Artigos';

  return (
    <main className="rss-workspace">
      <div className="sidebar-column">
        <div className="app-brand">
          <h1>RSS Reader</h1>
          <span className="local-badge" title="Persistência 100% no dispositivo">
            Local SQLite
          </span>
        </div>

        <AddFeedForm
          onSubscribe={handleSubscribe}
          isSubmitting={isSubscribing}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
        />

        <FeedSidebar
          feeds={feeds}
          totalUnreadCount={totalUnreadCount}
          selectedFeedId={selectedFeedId}
          onSelectFeed={(feedId) => {
            setSelectedFeedId(feedId);
            setSelectedArticle(null);
          }}
          onRemoveFeed={handleRemoveFeed}
          removingFeedId={removingFeedId}
        />
      </div>

      <ArticleList
        articles={articles}
        selectedArticleId={selectedArticle?.id ?? null}
        unreadOnly={unreadOnly}
        isRefreshing={isRefreshing}
        isLoading={isLoadingArticles}
        activeFeedTitle={activeFeedTitle}
        hasSubscribedFeeds={feeds.length > 0}
        onSelectArticle={handleSelectArticle}
        onToggleReadState={handleToggleReadState}
        onToggleUnreadOnly={setUnreadOnly}
        onRefreshFeeds={handleRefreshFeeds}
        onMarkAllRead={handleMarkAllRead}
      />

      <ArticleReaderPane
        article={selectedArticle}
        onToggleReadState={handleToggleReadState}
      />
    </main>
  );
}
