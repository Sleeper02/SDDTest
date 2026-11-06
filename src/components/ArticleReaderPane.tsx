'use client';

import React from 'react';
import type { ArticleSummaryDto } from '@/schemas/feed.schema';

export interface ArticleReaderPaneProps {
  article: ArticleSummaryDto | null;
  onToggleReadState: (articleId: string, nextIsRead: boolean) => Promise<void>;
}

function formatFullDate(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function ArticleReaderPane({
  article,
  onToggleReadState,
}: ArticleReaderPaneProps): React.JSX.Element {
  if (!article) {
    return (
      <aside className="article-reader-pane empty" aria-label="Leitor de artigo">
        <div className="reader-placeholder">
          <h3>Selecione um artigo para ler</h3>
          <p>
            Escolha qualquer item na lista ao lado para visualizar seu conteúdo e gerenciar
            seu status de leitura.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <article className="article-reader-pane" aria-label="Leitor de artigo">
      <header className="reader-header">
        <div className="reader-meta-top">
          <span className="reader-feed-badge">{article.feedTitle}</span>
          <span className={`reader-status-tag ${article.isRead ? 'read' : 'unread'}`}>
            {article.isRead ? 'Lido' : 'Não lido'}
          </span>
        </div>

        <h1 className="reader-title">{article.title}</h1>

        <div className="reader-byline">
          {article.author ? <span>Por {article.author} • </span> : null}
          <time dateTime={article.publishedAt}>
            {formatFullDate(article.publishedAt)}
          </time>
        </div>

        <div className="reader-toolbar">
          <button
            type="button"
            onClick={() => {
              void onToggleReadState(article.id, !article.isRead);
            }}
            className="btn btn-secondary btn-sm"
          >
            {article.isRead ? 'Marcar como não lido' : 'Marcar como lido'}
          </button>

          {article.link ? (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              Abrir artigo original ↗
            </a>
          ) : null}
        </div>
      </header>

      <div
        className="reader-content"
        dangerouslySetInnerHTML={{
          __html:
            article.contentHtml ||
            '<p><em>Este artigo não possui conteúdo detalhado no feed. Utilize o botão acima para abrir a publicação original.</em></p>',
        }}
      />
    </article>
  );
}
