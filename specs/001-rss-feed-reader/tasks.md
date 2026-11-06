---

description: "Task list for RSS Feed Reader Local implementation"
---

# Tasks: RSS Feed Reader Local

**Input**: Design documents from `/specs/001-rss-feed-reader/`

**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required for user stories), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

**Tests**: Included as required by Constitution Principle III (*Testes Automatizados Rigorosos — INEGOCIÁVEL*) and the implementation plan (`Vitest`, `tsc --noEmit`, `ESLint`).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., `US1`, `US2`, `US3`)
- Includes exact file paths and verbatim data model/contract constraints in descriptions

## Path Conventions

- **Fullstack Next.js App Router project**: `src/` and `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, strict TypeScript configuration, and quality gate tooling.

- [X] T001 Initialize Next.js (App Router) + React 19 + TypeScript project with scripts (`dev`, `build`, `start`, `typecheck`, `lint`, `test`) and dependencies (`next`, `react`, `react-dom`, `better-sqlite3`, `drizzle-orm`, `rss-parser`, `sanitize-html`, `zod`, `vitest`, `typescript`, `eslint`) in `package.json`
- [X] T002 Configure TypeScript strict mode (`"strict": true`, `"noEmit": true`, path alias `"@/*": ["./src/*"]`) in `tsconfig.json` and Next.js server external packages (`better-sqlite3`) in `next.config.ts`
- [X] T003 [P] Configure ESLint static analysis in `eslint.config.mjs` and Vitest test runner environment in `vitest.config.ts`
- [X] T004 [P] Create environment template (`DATABASE_URL="./data/rss-reader.sqlite"`, `FEED_FETCH_TIMEOUT_MS="10000"`) in `.env.example` and ignore rules (`node_modules/`, `.next/`, `data/*.sqlite*`, `.env.local`) in `.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure (env validation, logging, shared Zod schemas, SQLite database schema & connection, HTML sanitizer, and RSS/Atom parser) that MUST be complete before any user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Implement runtime environment variable validation with Zod (`DATABASE_URL` defaulting to `"./data/rss-reader.sqlite"` and `FEED_FETCH_TIMEOUT_MS` coerced to positive integer defaulting to `10000`) in `src/config/env.ts`
- [X] T006 [P] Implement structured logger (`info`, `warn`, `error` with ISO-8601 timestamp and context metadata) in `src/lib/logger.ts`
- [X] T007 [P] Define shared Zod validation contracts and inferred DTO types (`FeedIdSchema` as `z.string().uuid()`, `ArticleIdSchema` as `z.string().uuid()`, `CreateFeedInputSchema` with `url` trimmed, valid URL, and `val.startsWith('http://') || val.startsWith('https://')`, `FeedDtoSchema` with `unreadCount: z.number().int().nonnegative()`, `ArticleFilterQuerySchema`, `ArticleSummaryDtoSchema`, `UpdateArticleReadStateSchema`, `MarkAllReadInputSchema`, and `ApiErrorSchema` with code enum `['VALIDATION_ERROR', 'DUPLICATE_FEED', 'INVALID_FEED_SOURCE', 'NOT_FOUND', 'INTERNAL_ERROR']`) in `src/schemas/feed.schema.ts`
- [X] T008 Define Drizzle ORM SQLite schema for `feeds` (`id` `TEXT PRIMARY KEY NOT NULL`, `url` `TEXT UNIQUE NOT NULL`, `title` `TEXT NOT NULL`, `description` `TEXT NULL`, `site_url` `TEXT NULL`, `last_synced_at` `TEXT NULL`, `last_error` `TEXT NULL`, `created_at` `TEXT NOT NULL`, index `feeds_url_unique_idx` on `(url)`) and `articles` (`id` `TEXT PRIMARY KEY NOT NULL`, `feed_id` `TEXT NOT NULL FOREIGN KEY -> feeds.id ON DELETE CASCADE`, `external_id` `TEXT NOT NULL`, `title` `TEXT NOT NULL`, `link` `TEXT NULL`, `content_html` `TEXT NOT NULL`, `content_snippet` `TEXT NOT NULL`, `author` `TEXT NULL`, `published_at` `TEXT NOT NULL`, `discovered_at` `TEXT NOT NULL`, `is_read` `INTEGER (0|1) NOT NULL DEFAULT 0`, `read_at` `TEXT NULL`, indexes `articles_feed_external_unique_idx` on `(feed_id, external_id)`, `articles_published_at_idx` on `(published_at DESC, discovered_at DESC)`, and `articles_feed_read_published_idx` on `(feed_id, is_read, published_at DESC)`) in `src/db/schema.ts`
- [X] T009 Implement SQLite database client using `better-sqlite3` and `drizzle-orm` (enabling `PRAGMA journal_mode = WAL`, `PRAGMA foreign_keys = ON`, automatic table/index creation on startup, and factory support for `:memory:` databases in tests) in `src/db/client.ts`
- [X] T010 [P] Implement server-side HTML sanitization service using `sanitize-html` (stripping `<script>`, `<iframe>`, `<object>`, inline `on*` event handlers, and `javascript:` URLs; allowlisting safe formatting tags and `http`/`https` images; normalizing `<a>` tags with `rel="noopener noreferrer"` and `target="_blank"`; extracting plain-text `contentSnippet` up to 300 chars) in `src/services/html-sanitizer.service.ts`
- [X] T011 [P] Implement RSS 2.0 and Atom 1.0 feed parser service using `rss-parser` (normalizing feed URL and title with hostname fallback, resolving deterministic `externalId` via `guid -> id -> link -> SHA-256 of title + pubDate`, defaulting missing article title to `"Sem título"`, and setting `publishedAt` equal to `discoveredAt` when missing or invalid in XML) in `src/services/feed-parser.service.ts`
- [X] T012 [P] Write foundational unit tests for environment config, Zod contracts, HTML sanitization XSS stripping, and RSS 2.0 / Atom 1.0 parsing in `tests/unit/env.test.ts`, `tests/unit/feed-schema.test.ts`, `tests/unit/html-sanitizer.test.ts`, and `tests/unit/feed-parser.test.ts`

**Checkpoint**: Foundation ready — all core schemas, SQLite tables, parser, and sanitizer are verified by unit tests.

---

## Phase 3: User Story 1 - Inscrição e Gerenciamento de Feeds por URL (Priority: P1) 🎯 MVP

**Goal**: Permitir ao usuário cadastrar fontes de conteúdo informando a URL de um feed RSS 2.0 ou Atom 1.0, validar a fonte, impedir inscrições duplicadas, listar feeds inscritos e remover inscrições com exclusão em cascata dos artigos.

**Independent Test**: Cadastrar uma URL válida de feed, verificar que a inscrição aparece na listagem e persiste no banco SQLite local após reinício, validar que a tentativa de recadastrar a mesma URL retorna erro `409 DUPLICATE_FEED`, validar que URL inválida retorna `400`/`422`, e remover a inscrição confirmando a exclusão em cascata.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 [P] [US1] Write repository integration tests for feed creation, URL uniqueness constraint (`feeds_url_unique_idx`), unread count aggregation, and `ON DELETE CASCADE` article removal in `tests/integration/feed-repository.test.ts`
- [X] T014 [P] [US1] Write Route Handler contract tests for `GET /api/feeds`, `POST /api/feeds` (`201`, `400 VALIDATION_ERROR`, `409 DUPLICATE_FEED`, `422 INVALID_FEED_SOURCE`), and `DELETE /api/feeds/[feedId]` (`204`, `404 NOT_FOUND`) in `tests/integration/api-routes.test.ts`

### Implementation for User Story 1

- [X] T015 [US1] Implement `FeedRepository` (create subscription, find by normalized URL or ID, list all feeds ordered alphabetically with `unreadCount` and `totalUnreadCount`, update `lastSyncedAt`/`lastError`, and delete feed by ID) in `src/db/repositories/feed.repository.ts`
- [X] T016 [US1] Implement initial article ingestion upsert in `ArticleRepository` (matching `(feed_id, external_id)` via `articles_feed_external_unique_idx` and inserting sanitized articles) in `src/db/repositories/article.repository.ts`
- [X] T017 [US1] Implement `subscribeToFeed` service method (URL normalization, duplicate check, XML fetch & parse via `FeedParserService`, HTML sanitization via `HtmlSanitizerService`, and transactional persistence of feed + initial articles) in `src/services/feed-sync.service.ts`
- [X] T018 [US1] Implement `GET /api/feeds` and `POST /api/feeds` Route Handlers using `CreateFeedInputSchema` and `ApiErrorSchema` in `src/app/api/feeds/route.ts`
- [X] T019 [US1] Implement `DELETE /api/feeds/[feedId]` Route Handler validating `FeedIdSchema` in `src/app/api/feeds/[feedId]/route.ts`
- [X] T020 [P] [US1] Create `AddFeedForm` component with URL input, loading state, and error feedback for invalid or duplicate URLs in `src/components/AddFeedForm.tsx`
- [X] T021 [P] [US1] Create `FeedSidebar` component displaying subscribed feeds, unread count badges, feed sync error indicators, and unsubscribe button in `src/components/FeedSidebar.tsx`

**Checkpoint**: User Story 1 is complete and independently testable.

---

## Phase 4: User Story 2 - Visualização de Artigos Ordenados pelos Mais Recentes (Priority: P1)

**Goal**: Apresentar os artigos das inscrições ordenados cronologicamente do mais recente para o mais antigo (`publishedAt DESC`), permitir filtragem por feed específico, exibir o conteúdo sanitizado do artigo com link para a publicação original e permitir atualização manual de feeds.

**Independent Test**: Cadastrar dois feeds com artigos em datas distintas, verificar que "Todos os Artigos" ordena estritamente do mais recente para o mais antigo, filtrar por um único feed na barra lateral, abrir um artigo para ler seu conteúdo sanitizado com link externo seguro e acionar a atualização manual de feeds.

### Tests for User Story 2 ⚠️

- [X] T022 [P] [US2] Add repository integration tests for chronological ordering (`published_at DESC, discovered_at DESC, id DESC`), filtering by `feedId`, and non-blocking partial failure recording (`lastError`) during multi-feed refresh in `tests/integration/feed-repository.test.ts`
- [X] T023 [P] [US2] Add Route Handler contract tests for `GET /api/articles` (with and without `feedId`) and `POST /api/feeds/refresh` in `tests/integration/api-routes.test.ts`

### Implementation for User Story 2

- [X] T024 [US2] Implement `listArticles` query in `ArticleRepository` (joining `feeds` for `feedTitle`, filtering by optional `feedId` and `unreadOnly`, and ordering strictly by `published_at DESC, discovered_at DESC, id DESC`) in `src/db/repositories/article.repository.ts`
- [X] T025 [US2] Implement `refreshFeeds` method in `FeedSyncService` (fetching all feeds or a single `feedId`, upserting newly discovered articles without overwriting existing `is_read`/`read_at`, and recording non-blocking per-feed failures in `lastError`) in `src/services/feed-sync.service.ts`
- [X] T026 [US2] Implement `GET /api/articles` Route Handler validating query parameters with `ArticleFilterQuerySchema` in `src/app/api/articles/route.ts`
- [X] T027 [US2] Implement `POST /api/feeds/refresh` Route Handler returning `{ refreshedFeeds, newArticlesCount, failures }` in `src/app/api/feeds/refresh/route.ts`
- [X] T028 [P] [US2] Create `ArticleList` component rendering chronological article cards (title, `feedTitle`, formatted `publishedAt`, `contentSnippet`, and manual refresh button) in `src/components/ArticleList.tsx`
- [X] T029 [P] [US2] Create `ArticleReaderPane` component displaying the selected article's sanitized `contentHtml`, author, publication timestamp, and external link (`rel="noopener noreferrer" target="_blank"`) in `src/components/ArticleReaderPane.tsx`

**Checkpoint**: User Stories 1 and 2 are complete and work together or independently.

---

## Phase 5: User Story 3 - Rastreamento do Status de Lido e Não Lido com Persistência no Dispositivo (Priority: P2)

**Goal**: Rastrear o status de lido/não lido de cada artigo localmente no dispositivo, marcar automaticamente como lido ao abrir um artigo, permitir alternância manual entre lido e não lido, permitir "Marcar todos como lidos" e filtrar por "Apenas não lidos".

**Independent Test**: Abrir um artigo não lido e verificar sua transição imediata para "lido" com atualização do contador da fonte; alternar manualmente para "não lido"; ativar o filtro "Apenas não lidos"; usar "Marcar todos como lidos"; recarregar a página e confirmar que 100% dos estados persistem no SQLite.

### Tests for User Story 3 ⚠️

- [X] T030 [P] [US3] Add repository integration tests for `updateReadState`, `markAllAsRead` (global and scoped by `feedId`), `unreadOnly` filtering, and preservation of `is_read = true` when a feed is refreshed in `tests/integration/feed-repository.test.ts`
- [X] T031 [P] [US3] Add Route Handler contract tests for `PATCH /api/articles/[articleId]/read` (`200`, `404 NOT_FOUND`) and `POST /api/articles/mark-all-read` in `tests/integration/api-routes.test.ts`

### Implementation for User Story 3

- [X] T032 [US3] Implement `updateReadState(articleId, isRead)` (updating `is_read` and setting/clearing `read_at` ISO-8601 timestamp) and `markAllAsRead(feedId?)` in `src/db/repositories/article.repository.ts`
- [X] T033 [US3] Implement `PATCH /api/articles/[articleId]/read` Route Handler validated with `ArticleIdSchema` and `UpdateArticleReadStateSchema` in `src/app/api/articles/[articleId]/read/route.ts`
- [X] T034 [US3] Implement `POST /api/articles/mark-all-read` Route Handler validated with `MarkAllReadInputSchema` in `src/app/api/articles/mark-all-read/route.ts`
- [X] T035 [US3] Enhance `ArticleList` and `ArticleReaderPane` with visual distinction for read vs. unread items, automatic mark-as-read on article selection, manual "Marcar como lido / não lido" toggle button, "Apenas não lidos" filter toggle, and "Marcar todos como lidos" button in `src/components/ArticleList.tsx` and `src/components/ArticleReaderPane.tsx`
- [X] T036 [US3] Integrate `FeedSidebar`, `AddFeedForm`, `ArticleList`, and `ArticleReaderPane` into the main responsive reader workspace in `src/app/layout.tsx`, `src/app/globals.css`, and `src/app/page.tsx`

**Checkpoint**: All three user stories (US1, US2, US3) are complete, integrated, and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Onboarding UX, performance verification against SC-004 (`<200ms` for 1,000 articles), and full quality gates validation.

- [X] T037 [P] Add friendly empty-state onboarding view when no feeds are subscribed or when the current filter has zero articles in `src/app/page.tsx` and `src/components/ArticleList.tsx`
- [X] T038 [P] Add performance verification test asserting `<200ms` query execution for filtering and sorting 1,000 stored articles (SC-004) in `tests/integration/feed-repository.test.ts`
- [X] T039 Run full quality gates (`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`) and verify end-to-end scenarios defined in `specs/001-rss-feed-reader/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup (`T001`–`T004`)**: No dependencies — starts immediately.
- **Phase 2: Foundational (`T005`–`T012`)**: Depends on Phase 1 — **BLOCKS** all user story phases.
- **Phase 3: User Story 1 (`T013`–`T021`)**: Depends on Phase 2 completion. Delivers feed subscription and management MVP.
- **Phase 4: User Story 2 (`T022`–`T029`)**: Depends on Phase 2 and integrates with `FeedRepository` from US1 (`T015`–`T017`).
- **Phase 5: User Story 3 (`T030`–`T036`)**: Depends on Phase 2 and integrates with article listing/viewing from US2 (`T024`, `T028`, `T029`).
- **Phase 6: Polish (`T037`–`T039`)**: Depends on Phases 3–5 completion.

### Within Each User Story

1. Integration & contract tests (`T013`–`T014`, `T022`–`T023`, `T030`–`T031`) are written first.
2. Repository & domain service methods (`src/db/repositories/*`, `src/services/*`) are implemented next.
3. Next.js Route Handlers (`src/app/api/*`) are implemented and verified against contract tests.
4. React UI components (`src/components/*`, `src/app/page.tsx`) connect to the verified endpoints.

---

## Parallel Opportunities

- **Setup (Phase 1)**: `T003` (ESLint/Vitest configs) and `T004` (`.env.example`/`.gitignore`) can run in parallel after `T001`–`T002`.
- **Foundational (Phase 2)**: `T006` (`logger.ts`), `T007` (`feed.schema.ts`), `T010` (`html-sanitizer.service.ts`), and `T011` (`feed-parser.service.ts`) operate on independent files and can be executed in parallel; `T012` unit tests can also be authored in parallel.
- **User Story 1 (Phase 3)**: Tests `T013` and `T014` run in parallel; UI components `T020` (`AddFeedForm.tsx`) and `T021` (`FeedSidebar.tsx`) run in parallel.
- **User Story 2 (Phase 4)**: Tests `T022` and `T023` run in parallel; UI components `T028` (`ArticleList.tsx`) and `T029` (`ArticleReaderPane.tsx`) run in parallel.
- **User Story 3 (Phase 5)**: Tests `T030` and `T031` run in parallel; Route Handlers `T033` and `T034` touch separate route files and can be implemented in parallel after `T032`.

---

## Parallel Example: User Story 1

```bash
# 1. Run User Story 1 tests in parallel:
Task T013: "Write repository integration tests in tests/integration/feed-repository.test.ts"
Task T014: "Write Route Handler contract tests in tests/integration/api-routes.test.ts"

# 2. Build User Story 1 UI components in parallel once API contracts are ready:
Task T020: "Create AddFeedForm component in src/components/AddFeedForm.tsx"
Task T021: "Create FeedSidebar component in src/components/FeedSidebar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 Core)

1. Complete **Phase 1: Setup** (`T001`–`T004`).
2. Complete **Phase 2: Foundational** (`T005`–`T012`) and verify unit tests pass.
3. Complete **Phase 3: User Story 1** (`T013`–`T021`) so users can subscribe to feeds by URL and persist them in SQLite.
4. Complete **Phase 4: User Story 2** (`T022`–`T029`) so users can browse and read articles ordered newest-first.

### Incremental Delivery

1. **Increment 1 (Foundation)**: Config + Zod contracts + SQLite Drizzle schema + Parser + Sanitizer (`T001`–`T012`).
2. **Increment 2 (US1 — Subscriptions)**: Feed CRUD + initial article ingestion + Sidebar/Add Feed UI (`T013`–`T021`).
3. **Increment 3 (US2 — Timeline & Reading)**: Chronological article listing + feed refresh + sanitized Reader Pane (`T022`–`T029`).
4. **Increment 4 (US3 — Read/Unread Tracking & Polish)**: Auto/manual read status toggles + bulk mark-as-read + unread filter + 1,000-article performance check (`T030`–`T039`).
