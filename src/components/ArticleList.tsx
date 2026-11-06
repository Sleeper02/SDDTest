'use client';

import React from 'react';
import type { ArticleSummaryDto } from '@/schemas/feed.schema';

export interface ArticleListProps {
  articles: ArticleSummaryDto[];
  selectedArticleId: string | null;
  unreadOnly: boolean;
  isRefreshing: boolean;
  isLoading: boolean;
  activeFeedTitle: string;
  hasSubscribedFeeds: boolean;
  onSelectArticle: (article: ArticleSummaryDto) => void;
  onToggleReadState: (articleId: string, nextIsRead: boolean) => Promise<void>;
  onToggleUnreadOnly: (nextUnreadOnly: boolean) => void;
  onRefreshFeeds: () => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}

function formatPublishedDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function ArticleList({
  articles,
  selectedArticleId,
  unreadOnly,
  isRefreshing,
  isLoading,
  activeFeedTitle,
  hasSubscribedFeeds,
  onSelectArticle,
  onToggleReadState,
  onToggleUnreadOnly,
  onRefreshFeeds,
  onMarkAllRead,
}: ArticleListProps): React.JSX.Element {
  const unreadInView = articles.filter((a) => !a.isRead).length;

  return (
    <section className="article-list-panel" aria-label="Lista de artigos">
      <header className="article-list-header">
        <div className="article-list-title-row">
          <h2>{activeFeedTitle}</h2>
          <span className="article-count-pill">{articles.length} artigos</span>
        </div>

        <div className="article-list-controls">
          <label className="unread-filter-toggle">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => onToggleUnreadOnly(e.target.checked)}
            />
            <span>Apenas não lidos</span>
          </label>

          <div className="article-action-buttons">
            <button
              type="button"
              onClick={() => {
                void onMarkAllRead();
              }}
              disabled={unreadInView === 0 || isLoading}
              className="btn btn-secondary btn-sm"
              title="Marcar todos os artigos desta visão como lidos"
            >
              ✓ Marcar todos lidos
            </button>
            <button
              type="button"
              onClick={() => {
                void onRefreshFeeds();
              }}
              disabled={!hasSubscribedFeeds || isRefreshing}
              className="btn btn-secondary btn-sm"
              title="Buscar novos artigos nos feeds inscritos"
            >
              {isRefreshing ? 'Atualizando...' : '↻ Atualizar'}
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="article-list-empty">Carregando artigos...</div>
      ) : !hasSubscribedFeeds ? (
        <div className="article-list-empty">
          <h3>Bem-vindo ao seu Leitor RSS Local</h3>
          <p>
            Seus feeds e marcações de leitura ficam salvos exclusivamente neste dispositivo.
            Informe a URL de um feed RSS 2.0 ou Atom 1.0 na barra lateral para começar!
          </p>
        </div>
      ) : articles.length === 0 ? (
        <div className="article-list-empty">
          <h3>Nenhum artigo encontrado</h3>
          <p>
            {unreadOnly
              ? 'Você está em dia! Não há artigos não lidos para este filtro.'
              : 'Este feed ainda não possui artigos publicados.'}
          </p>
        </div>
      ) : (
        <ul className="article-cards">
          {articles.map((article) => {
            const isSelected = selectedArticleId === article.id;

            return (
              <li
                key={article.id}
                className={`article-card ${article.isRead ? 'read' : 'unread'} ${
                  isSelected ? 'selected' : ''
                }`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectArticle(article)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectArticle(article);
                    }
                  }}
                  className="article-card-main"
                >
                  <div className="article-card-meta">
                    <span
                      className={`status-dot ${article.isRead ? 'read' : 'unread'}`}
                      title={article.isRead ? 'Lido' : 'Não lido'}
                    />
                    <span className="article-feed-name">{article.feedTitle}</span>
                    <time
                      dateTime={article.publishedAt}
                      className="article-date"
                    >
                      {formatPublishedDate(article.publishedAt)}
                    </time>
                  </div>

                  <h3 className="article-card-title">{article.title}</h3>

                  {article.contentSnippet ? (
                    <p className="article-card-snippet">{article.contentSnippet}</p>
                  ) : null}
                </div>

                <div className="article-card-footer">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onToggleReadState(article.id, !article.isRead);
                    }}
                    className="btn-link-toggle"
                  >
                    {article.isRead ? 'Marcar como não lido' : 'Marcar como lido'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
