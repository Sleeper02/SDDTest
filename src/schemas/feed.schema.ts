import { z } from 'zod';

export const FeedIdSchema = z.string().uuid('Identificador de feed inválido.');
export const ArticleIdSchema = z.string().uuid('Identificador de artigo inválido.');

export const CreateFeedInputSchema = z.object({
  url: z
    .string()
    .trim()
    .url('Informe uma URL válida.')
    .refine(
      (val) => val.startsWith('http://') || val.startsWith('https://'),
      'A URL deve utilizar o protocolo http:// ou https://.'
    ),
});

export const FeedDtoSchema = z.object({
  id: FeedIdSchema,
  url: z.string().url(),
  title: z.string(),
  description: z.string().nullable(),
  siteUrl: z.string().nullable(),
  lastSyncedAt: z.string().datetime().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string().datetime(),
  unreadCount: z.number().int().nonnegative(),
});

export const ArticleFilterQuerySchema = z.object({
  feedId: FeedIdSchema.optional(),
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const ArticleSummaryDtoSchema = z.object({
  id: ArticleIdSchema,
  feedId: FeedIdSchema,
  feedTitle: z.string(),
  title: z.string(),
  link: z.string().nullable(),
  contentSnippet: z.string(),
  contentHtml: z.string(),
  author: z.string().nullable(),
  publishedAt: z.string().datetime(),
  isRead: z.boolean(),
  readAt: z.string().datetime().nullable(),
});

export const UpdateArticleReadStateSchema = z.object({
  isRead: z.boolean(),
});

export const MarkAllReadInputSchema = z.object({
  feedId: FeedIdSchema.optional(),
});

export const RefreshFeedsInputSchema = z.object({
  feedId: FeedIdSchema.optional(),
});

export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'DUPLICATE_FEED',
  'INVALID_FEED_SOURCE',
  'NOT_FOUND',
  'INTERNAL_ERROR',
]);

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
  }),
});

export type CreateFeedInput = z.infer<typeof CreateFeedInputSchema>;
export type FeedDto = z.infer<typeof FeedDtoSchema>;
export type ArticleFilterQuery = z.infer<typeof ArticleFilterQuerySchema>;
export type ArticleSummaryDto = z.infer<typeof ArticleSummaryDtoSchema>;
export type UpdateArticleReadStateInput = z.infer<typeof UpdateArticleReadStateSchema>;
export type MarkAllReadInput = z.infer<typeof MarkAllReadInputSchema>;
export type RefreshFeedsInput = z.infer<typeof RefreshFeedsInputSchema>;
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorSchema>;

/**
 * Normalizes a validated HTTP/HTTPS feed URL so duplicate checks are consistent.
 */
export function normalizeFeedUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl.trim());
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  if ((parsed.protocol === 'http:' && parsed.port === '80') || (parsed.protocol === 'https:' && parsed.port === '443')) {
    parsed.port = '';
  }
  return parsed.toString();
}
