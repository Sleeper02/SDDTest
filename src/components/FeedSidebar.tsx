'use client';

import React from 'react';
import type { FeedDto } from '@/schemas/feed.schema';

export interface FeedSidebarProps {
  feeds: FeedDto[];
  totalUnreadCount: number;
  selectedFeedId: string | null;
  onSelectFeed: (feedId: string | null) => void;
  onRemoveFeed: (feedId: string) => Promise<void>;
  removingFeedId: string | null;
}

export function FeedSidebar({
  feeds,
  totalUnreadCount,
  selectedFeedId,
  onSelectFeed,
  onRemoveFeed,
  removingFeedId,
}: FeedSidebarProps): React.JSX.Element {
  return (
    <nav className="feed-sidebar-nav" aria-label="Inscrições de feeds">
      <div className="sidebar-section-header">Visualizações</div>
      <button
        type="button"
        onClick={() => onSelectFeed(null)}
        className={`feed-nav-item ${selectedFeedId === null ? 'active' : ''}`}
      >
        <span className="feed-nav-title">Todos os Artigos</span>
        <span className="unread-badge" title="Total de artigos não lidos">
          {totalUnreadCount}
        </span>
      </button>

      <div className="sidebar-section-header">
        Minhas Inscrições ({feeds.length})
      </div>

      {feeds.length === 0 ? (
        <p className="sidebar-empty-hint">
          Nenhum feed inscrito ainda. Adicione uma URL RSS ou Atom acima para começar.
        </p>
      ) : (
        <ul className="feed-list">
          {feeds.map((feed) => {
            const isSelected = selectedFeedId === feed.id;
            const isRemoving = removingFeedId === feed.id;

            return (
              <li
                key={feed.id}
                className={`feed-list-row ${isSelected ? 'active' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => onSelectFeed(feed.id)}
                  className="feed-select-btn"
                  title={feed.description ?? feed.url}
                >
                  <div className="feed-title-wrap">
                    <span className="feed-nav-title">{feed.title}</span>
                    {feed.lastError ? (
                      <span
                        className="feed-error-indicator"
                        title={`Falha na última sincronização: ${feed.lastError}`}
                        aria-label={`Erro ao atualizar ${feed.title}`}
                      >
                        ⚠️
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={`unread-badge ${feed.unreadCount === 0 ? 'zero' : ''}`}
                  >
                    {feed.unreadCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void onRemoveFeed(feed.id);
                  }}
                  disabled={isRemoving}
                  className="feed-delete-btn"
                  title={`Remover inscrição de ${feed.title}`}
                  aria-label={`Remover inscrição de ${feed.title}`}
                >
                  {isRemoving ? '...' : '🗑'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
