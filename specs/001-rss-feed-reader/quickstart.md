# Phase 1 Quickstart & Validation Guide: RSS Feed Reader Local

**Feature**: `001-rss-feed-reader`  
**Date**: 2026-11-05  
**References**: [spec.md](spec.md) | [data-model.md](data-model.md) | [contracts/api.md](contracts/api.md)

## 1. Prerequisites

- **Node.js**: LTS (`v20.x` or `v22.x`)
- **Package Manager**: `npm` (bundled with Node.js LTS)
- **Operating System**: Windows, macOS, or Linux (with local filesystem write access for SQLite file storage)

---

## 2. Environment Configuration

Create a `.env.local` file in the project root (or copy from `.env.example`; never commit `.env.local`):

```dotenv
# Path to the local SQLite database file on this device
DATABASE_URL="./data/rss-reader.sqlite"

# Network timeout (ms) when fetching external RSS/Atom feeds
FEED_FETCH_TIMEOUT_MS="10000"
```

---

## 3. Setup & Quality Gates Execution

Run the following commands from the repository root to install dependencies, verify static types, lint, and execute the automated test suite:

```powershell
# 1. Install project dependencies
npm install

# 2. TypeScript strict type checking (Gate: 0 errors)
npm run typecheck

# 3. ESLint static analysis (Gate: 0 errors)
npm run lint

# 4. Run unit and integration test suites via Vitest (Gate: 100% pass)
npm run test
```

---

## 4. Running the Application Locally

```powershell
# Start the Next.js development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 5. End-to-End Validation Scenarios

### Scenario A — Subscribe to Feed by URL & Prevent Duplicates (User Story 1)
1. On the initial empty state screen, paste a valid RSS or Atom feed URL (e.g., `https://hnrss.org/newest` or `https://blog.nodejs.org/feed/`) into the subscription input and click **Adicionar Feed**.
2. **Expected**:
   - The feed appears in the sidebar list with its publication title and unread article counter.
   - Attempting to submit the exact same URL again returns a clear conflict message (`409 DUPLICATE_FEED`) without duplicating the subscription.
   - Submitting an invalid URL or non-feed webpage displays a clear validation error (`400` or `422`) without affecting existing subscriptions.

### Scenario B — Chronological Ordering & Filtering (User Story 2)
1. Subscribe to a second feed URL so multiple sources exist.
2. Select **Todos os Artigos** in the sidebar.
3. **Expected**:
   - Articles from all subscribed feeds are consolidated and ordered strictly from newest (`publishedAt` descending) to oldest.
   - Clicking a specific feed in the sidebar filters the list to show only articles from that source while maintaining newest-first order.
   - Clicking an article opens its sanitized content/summary in the reading pane and provides a safe external link (`rel="noopener noreferrer"`) to the original publication.

### Scenario C — Read/Unread Tracking & Local Device Persistence (User Story 3)
1. Click an unread article in the list.
2. **Expected**:
   - The article status transitions automatically from **Não lido** to **Lido**, and the sidebar unread counter decrements immediately.
3. Click the **Marcar como não lido** toggle button on the article.
4. **Expected**:
   - The article returns to **Não lido** and the unread counter increments.
5. Enable the **Apenas não lidos** filter toggle, then reload the browser page (or restart `npm run dev`).
6. **Expected**:
   - All subscriptions, articles, and exact read/unread states persist intact from the local SQLite database (`./data/rss-reader.sqlite`).
