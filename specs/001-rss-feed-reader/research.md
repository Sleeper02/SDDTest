# Phase 0 Research: RSS Feed Reader Local

**Feature**: `001-rss-feed-reader`  
**Date**: 2026-11-05  
**Spec**: [spec.md](spec.md)

## Technical Decisions & Best Practices

### 1. Application Framework & Runtime

- **Decision**: Next.js (App Router) with React and TypeScript (`strict: true`) running locally on Node.js LTS.
- **Rationale**:
  - Next.js App Router provides both a modern React UI and local server-side Route Handlers (`/api/...`) within a single unified project.
  - Server-side Route Handlers bypass browser CORS restrictions when fetching external RSS/Atom XML feeds while keeping all persistence strictly on the user's local device.
  - Aligns directly with the project Constitution's fullstack TypeScript stack constraints.
- **Alternatives Considered**:
  - *SPA-only (Vite + React) with browser `fetch`*: Rejected because most third-party RSS feeds block cross-origin browser requests via CORS headers, which would require an external third-party proxy.
  - *Separate Frontend + Backend repositories*: Rejected under Principle V (Simplicidade & YAGNI); a single Next.js App Router project cleanly separates UI (`src/components`, `src/app`) from backend services (`src/services`, `src/db`) without multi-process operational overhead.

---

### 2. Local Device Persistence (SQLite Strategy)

- **Decision**: Local SQLite database file (`./data/rss-reader.sqlite`, configurable via `DATABASE_URL` environment variable) accessed via `better-sqlite3` + `drizzle-orm`.
- **Rationale**:
  - `better-sqlite3` runs synchronously in-process on Node.js with high speed (<5ms queries for thousands of articles), WAL mode support, and zero external database server dependencies.
  - Pairing `drizzle-orm` with `better-sqlite3` enforces Principle II (Tipagem Estrita) by providing end-to-end compile-time type safety for SQL queries, foreign keys, and schema migrations while remaining lightweight.
  - Supports in-memory databases (`:memory:`) out of the box for fast, isolated Vitest integration tests.
- **Alternatives Considered**:
  - *Browser `localStorage`*: Rejected because of 5MB storage limits, lack of indexed queries for chronological sorting/filtering across 1,000+ articles, and main-thread serialization overhead.
  - *Prisma ORM*: Rejected in favor of Drizzle + `better-sqlite3` due to heavier binary engine overhead and slower test initialization.

---

### 3. RSS 2.0 & Atom 1.0 Feed Parsing

- **Decision**: `rss-parser` wrapped in a dedicated domain service (`src/services/feed-parser.ts`) with custom timeout and User-Agent configuration.
- **Rationale**:
  - `rss-parser` natively normalizes differences between RSS 2.0 (`<item>`, `<pubDate>`, `<guid>`) and Atom 1.0 (`<entry>`, `<updated>`, `<id>`) into a consistent structure.
  - Fallback date resolution (using `isoDate` -> `pubDate` -> `discoveredAt` timestamp) and deterministic item deduplication key (`guid || id || link || hash(title + pubDate)`) are straightforward to implement in a thin wrapper.
- **Alternatives Considered**:
  - *`fast-xml-parser` directly*: Considered as a low-level XML parser, but requires manually writing normalization logic for RSS 2.0, RSS 1.0/RDF, and Atom 1.0 namespaces. `rss-parser` handles standard feed variations out of the box while remaining small and well-tested.

---

### 4. HTML Content Sanitization

- **Decision**: `sanitize-html` executed on the server before persisting and returning feed article summaries/content.
- **Rationale**:
  - RSS/Atom feeds frequently embed untrusted HTML (`content:encoded`, `description`, `<summary>`).
  - `sanitize-html` is purpose-built for Node.js, strips `<script>`, `<iframe>`, `<object>`, inline `on*` event handlers, and `javascript:` URLs without requiring a simulated browser DOM (`jsdom`), keeping memory usage low and Vitest execution fast.
  - Safe formatting tags (`p`, `a`, `ul`, `ol`, `li`, `strong`, `em`, `blockquote`, `code`, `pre`, `img` with `http/https` src) are allowlisted, and links are normalized with `rel="noopener noreferrer"` and `target="_blank"`.
- **Alternatives Considered**:
  - *`DOMPurify` + `jsdom`*: Viable, but `jsdom` adds significant dependency weight and slower cold-start/test overhead on Node.js compared to `sanitize-html`.

---

### 5. Runtime Validation & Configuration

- **Decision**: `zod` for all runtime boundary validations (environment variables in `src/config/env.ts`, API request payloads/query params in `src/schemas/`).
- **Rationale**:
  - Directly satisfies Principle II (Tipagem Estrita e Contratos Explícitos) and the Constitution's security rule that environment variables must be validated at startup.
  - URL validation (`z.string().url()`) combined with protocol restriction (`http:` or `https:` only) prevents SSRF/file-scheme injection when subscribing to feed URLs.
- **Alternatives Considered**:
  - *Manual `typeof` checks*: Error-prone and does not automatically infer static TypeScript types (`z.infer<typeof Schema>`).

---

### 6. Testing & Quality Gates

- **Decision**: `vitest` for unit and integration testing, paired with `tsc --noEmit` and `eslint` as mandatory pre-completion gates.
- **Rationale**:
  - Vitest natively supports TypeScript and ESM, enabling fast unit tests for feed parsing, HTML sanitization, date fallback, and Zod validation, as well as integration tests against an isolated SQLite `:memory:` database and Route Handlers.
  - Satisfies Principle III (Testes Automatizados Rigorosos — INEGOCIÁVEL).
- **Alternatives Considered**:
  - *Jest*: Requires extra transform configuration (`ts-jest` or `@swc/jest`) for modern Next.js/ESM setups compared to Vitest.
