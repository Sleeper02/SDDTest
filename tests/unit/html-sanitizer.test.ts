import { describe, it, expect } from 'vitest';
import { sanitizeFeedHtml } from '@/services/html-sanitizer.service';

describe('HTML Sanitizer Service (html-sanitizer.service.ts)', () => {
  it('strips malicious script tags, iframes, and inline event handlers', () => {
    const raw = `
      <p onclick="alert('xss')">Olá <strong>mundo</strong>!</p>
      <script>window.stealTokens()</script>
      <iframe src="https://evil.example.com"></iframe>
      <a href="javascript:alert(1)">Link malicioso</a>
      <a href="https://safe.example.com/post">Artigo seguro</a>
    `;

    const result = sanitizeFeedHtml(raw);
    expect(result.contentHtml).not.toContain('<script');
    expect(result.contentHtml).not.toContain('<iframe');
    expect(result.contentHtml).not.toContain('onclick');
    expect(result.contentHtml).not.toContain('javascript:');
    expect(result.contentHtml).toContain('<strong>mundo</strong>');
    expect(result.contentHtml).toContain(
      '<a href="https://safe.example.com/post" target="_blank" rel="noopener noreferrer">Artigo seguro</a>'
    );
    expect(result.contentSnippet).toContain('Olá mundo!');
  });

  it('truncates plain-text snippet to at most 300 characters', () => {
    const longText = `<p>${'a'.repeat(400)}</p>`;
    const result = sanitizeFeedHtml(longText);
    expect(result.contentSnippet.length).toBeLessThanOrEqual(300);
    expect(result.contentSnippet.endsWith('...')).toBe(true);
  });

  it('handles empty or null HTML gracefully', () => {
    expect(sanitizeFeedHtml(null)).toEqual({ contentHtml: '', contentSnippet: '' });
    expect(sanitizeFeedHtml('   ')).toEqual({ contentHtml: '', contentSnippet: '' });
  });
});
