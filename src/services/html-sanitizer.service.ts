import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p',
  'br',
  'hr',
  'div',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'figure',
  'figcaption',
];

export interface SanitizedArticleContent {
  contentHtml: string;
  contentSnippet: string;
}

export function sanitizeFeedHtml(rawHtml: string | undefined | null): SanitizedArticleContent {
  const input = (rawHtml ?? '').trim();
  if (!input) {
    return {
      contentHtml: '',
      contentSnippet: '',
    };
  }

  const contentHtml = sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
    },
  }).trim();

  const plainText = sanitizeHtml(contentHtml, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, ' ')
    .trim();

  const contentSnippet =
    plainText.length > 300 ? `${plainText.slice(0, 297).trimEnd()}...` : plainText;

  return {
    contentHtml,
    contentSnippet,
  };
}
