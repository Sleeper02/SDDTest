'use client';

import React, { useState } from 'react';

export interface AddFeedFormProps {
  onSubscribe: (url: string) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export function AddFeedForm({
  onSubscribe,
  isSubmitting,
  errorMessage,
  onClearError,
}: AddFeedFormProps): React.JSX.Element {
  const [url, setUrl] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || isSubmitting) return;

    try {
      await onSubscribe(trimmed);
      setUrl('');
    } catch {
      // Error is handled and displayed via errorMessage prop
    }
  }

  return (
    <form onSubmit={handleSubmit} className="add-feed-form" aria-label="Adicionar novo feed RSS">
      <div className="add-feed-input-group">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (errorMessage) onClearError();
          }}
          placeholder="https://exemplo.com/feed.xml"
          disabled={isSubmitting}
          required
          aria-label="URL do feed RSS ou Atom"
          className="add-feed-input"
        />
        <button
          type="submit"
          disabled={isSubmitting || !url.trim()}
          className="btn btn-primary"
        >
          {isSubmitting ? 'Adicionando...' : 'Adicionar Feed'}
        </button>
      </div>
      {errorMessage ? (
        <div role="alert" className="form-error-banner">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={onClearError}
            className="btn-dismiss"
            aria-label="Fechar aviso de erro"
          >
            ✕
          </button>
        </div>
      ) : null}
    </form>
  );
}
