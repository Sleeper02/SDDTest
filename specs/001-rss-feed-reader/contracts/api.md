# Phase 1 Interface Contracts: RSS Feed Reader Local

**Feature**: `001-rss-feed-reader`  
**Date**: 2026-11-05  
**Protocol**: Next.js App Router Route Handlers (`application/json`) validated with `zod`

---

## Shared Zod Data Contracts (`src/schemas/feed.schema.ts`)

```typescript
import { z } from 'zod';

export const FeedIdSchema = z.string().uuid();
export const ArticleIdSchema = z.string().uuid();

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

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      'VALIDATION_ERROR',
      'DUPLICATE_FEED',
      'INVALID_FEED_SOURCE',
      'NOT_FOUND',
      'INTERNAL_ERROR',
    ]),
    message: z.string(),
  }),
});
```

---

## HTTP Endpoints (Next.js Route Handlers)

### 1. `GET /api/feeds`
Returns all subscribed feeds ordered alphabetically by title, including the unread article count for each feed and total unread count.

- **Response `200 OK`**:
  ```json
  {
    "feeds": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "url": "https://example.com/feed.xml",
        "title": "Example Tech Blog",
        "description": "Latest articles from Example",
        "siteUrl": "https://example.com",
        "lastSyncedAt": "2026-11-05T23:20:00.000Z",
        "lastError": null,
        "createdAt": "2026-11-05T23:00:00.000Z",
        "unreadCount": 4
      }
    ],
    "totalUnreadCount": 4
  }
  ```

---

### 2. `POST /api/feeds`
Validates a feed URL, fetches and parses its RSS 2.0 / Atom 1.0 XML, persists the subscription and its initial articles (with sanitized HTML), and returns the created feed.

- **Request Body**: `CreateFeedInputSchema`
  ```json
  {
    "url": "https://example.com/feed.xml"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "feed": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "url": "https://example.com/feed.xml",
      "title": "Example Tech Blog",
      "description": "Latest articles from Example",
      "siteUrl": "https://example.com",
      "lastSyncedAt": "2026-11-05T23:20:00.000Z",
      "lastError": null,
      "createdAt": "2026-11-05T23:20:00.000Z",
      "unreadCount": 10
    },
    "importedArticlesCount": 10
  }
  ```
- **Error Responses**:
  - `400 Bad Request` (`VALIDATION_ERROR`): Malformed URL or non-HTTP/HTTPS scheme.
  - `409 Conflict` (`DUPLICATE_FEED`): Feed URL is already subscribed on this device (FR-003).
  - `422 Unprocessable Entity` (`INVALID_FEED_SOURCE`): URL could not be reached or did not return valid RSS 2.0 / Atom 1.0 XML (FR-002).

---

### 3. `DELETE /api/feeds/[feedId]`
Removes a feed subscription and cascades deletion of its articles from the device (FR-004).

- **Response `204 No Content`**
- **Error Responses**:
  - `404 Not Found` (`NOT_FOUND`): Feed ID does not exist.

---

### 4. `POST /api/feeds/refresh`
Refreshes all subscribed feeds (or a single feed if `feedId` is passed in the optional body). Preserves existing `isRead` states and records non-blocking errors per feed if a source is temporarily unreachable (FR-011, Edge Cases).

- **Request Body (optional)**:
  ```json
  {
    "feedId": "550e8400-e29b-41d4-a716-446655440000"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "refreshedFeeds": 3,
    "newArticlesCount": 5,
    "failures": [
      {
        "feedId": "660e8400-e29b-41d4-a716-446655440111",
        "title": "Offline Blog",
        "error": "Falha ao conectar com a fonte (timeout)."
      }
    ]
  }
  ```

---

### 5. `GET /api/articles`
Lists articles ordered strictly by `publishedAt DESC, discoveredAt DESC` (newest first — FR-005).

- **Query Parameters**:
  - `feedId` (optional UUID): Filter articles by a specific feed (FR-006).
  - `unreadOnly` (optional `'true' | 'false'`): When `'true'`, returns only articles with `isRead === false` (FR-006).
- **Response `200 OK`**:
  ```json
  {
    "articles": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440222",
        "feedId": "550e8400-e29b-41d4-a716-446655440000",
        "feedTitle": "Example Tech Blog",
        "title": "Understanding Spec-Driven Development",
        "link": "https://example.com/posts/sdd",
        "contentSnippet": "Spec-Driven Development aligns requirements and implementation...",
        "contentHtml": "<p>Spec-Driven Development aligns requirements and implementation...</p>",
        "author": "Jane Doe",
        "publishedAt": "2026-11-05T22:00:00.000Z",
        "isRead": false,
        "readAt": null
      }
    ]
  }
  ```

---

### 6. `PATCH /api/articles/[articleId]/read`
Updates the read/unread status of a single article (triggered automatically when opening an unread article or manually via toggle button — FR-009).

- **Request Body**: `UpdateArticleReadStateSchema`
  ```json
  {
    "isRead": true
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "article": {
      "id": "770e8400-e29b-41d4-a716-446655440222",
      "isRead": true,
      "readAt": "2026-11-05T23:25:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `404 Not Found` (`NOT_FOUND`): Article ID does not exist.

---

### 7. `POST /api/articles/mark-all-read`
Marks all unread articles (globally or scoped to `feedId`) as read in a single operation (FR-010).

- **Request Body**: `MarkAllReadInputSchema`
  ```json
  {
    "feedId": "550e8400-e29b-41d4-a716-446655440000"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "updatedCount": 4
  }
  ```
