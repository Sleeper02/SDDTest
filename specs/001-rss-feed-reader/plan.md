# Implementation Plan: RSS Feed Reader Local

**Branch**: `001-rss-feed-reader` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-rss-feed-reader/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Build a local-first RSS/Atom Feed Reader web application using **Next.js (App Router)**, **React**, and **TypeScript (`strict: true`)** on **Node.js LTS**. Users can subscribe to feeds by URL, view articles ordered newest-first across all feeds or filtered by feed/read status, read sanitized article content in-app, and track read/unread status. All subscriptions, articles, and read states persist exclusively on the user's device in a local **SQLite** database via **`better-sqlite3`** and **Drizzle ORM**, with **`rss-parser`** for feed ingestion, **`sanitize-html`** for XSS prevention, **`zod`** for runtime boundary validation, and **Vitest + `tsc --noEmit` + ESLint** as mandatory quality gates.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`) on Node.js LTS (v20+)

**Primary Dependencies**: Next.js (App Router), React 19, `better-sqlite3`, `drizzle-orm`, `rss-parser`, `sanitize-html`, `zod`

**Storage**: Local SQLite database file (`./data/rss-reader.sqlite` via `better-sqlite3`, configurable via `DATABASE_URL`; `:memory:` in automated tests)

**Testing**: Vitest (unit and integration tests), Testing Library (component/UI flow tests), `tsc --noEmit` (typecheck gate), ESLint (lint gate)

**Target Platform**: Local device running Node.js LTS + modern desktop/mobile web browser (`http://localhost:3000`)

**Project Type**: Fullstack Web Application (Next.js App Router)

**Performance Goals**: Feed subscription + initial fetch < 10s (SC-001); read/unread toggle and filtering < 200ms for up to 1,000 stored articles (SC-004)

**Constraints**: 100% local device persistence (no cloud database or user accounts); strict HTML sanitization before rendering untrusted feed content; no secrets committed to repository

**Scale/Scope**: Single-user local device deployment supporting dozens of feed subscriptions and 1,000+ cached articles

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution Principle | Pre-Research Check | Post-Design Check | Evidence / Enforcement |
|------------------------|--------------------|-------------------|------------------------|
| **I. Spec-First** | ✅ PASS | ✅ PASS | Complete `spec.md` (12 FRs, 4 SCs, 3 User Stories) mapped to `data-model.md`, `contracts/api.md`, and `quickstart.md`. |
| **II. Tipagem Estrita e Contratos Explícitos** | ✅ PASS | ✅ PASS | `tsconfig.json` enforces `"strict": true`; shared Zod schemas (`src/schemas/feed.schema.ts`) validate API inputs and startup env vars (`src/config/env.ts`); Drizzle ORM types SQLite tables. |
| **III. Testes Automatizados Rigorosos (INEGOCIÁVEL)** | ✅ PASS | ✅ PASS | Vitest unit tests (parser, sanitizer, schemas) + integration tests (SQLite repositories and API Route Handlers using `:memory:` DB) + `tsc --noEmit` and ESLint gates. |
| **IV. Arquitetura Modular e Separação de Responsabilidades** | ✅ PASS | ✅ PASS | Strict separation between `src/app` & `src/components` (UI/HTTP), `src/services` (domain logic: feed fetching, parsing, sanitization), `src/db` (SQLite persistence), and `src/schemas` (contracts). |
| **V. Simplicidade, YAGNI e Observabilidade** | ✅ PASS | ✅ PASS | Single Next.js App Router codebase; zero external infra/auth; structured error logging (`src/lib/logger.ts`) and non-blocking per-feed sync failure reporting. |

## Project Structure

### Documentation (this feature)

```text
specs/001-rss-feed-reader/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api.md           # HTTP Route Handler & Zod schema contracts
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── feeds/
│   │   │   ├── route.ts                      # GET /api/feeds, POST /api/feeds
│   │   │   ├── [feedId]/
│   │   │   │   └── route.ts                  # DELETE /api/feeds/[feedId]
│   │   │   └── refresh/
│   │   │       └── route.ts                  # POST /api/feeds/refresh
│   │   └── articles/
│   │       ├── route.ts                      # GET /api/articles
│   │       ├── [articleId]/
│   │       │   └── read/
│   │       │       └── route.ts              # PATCH /api/articles/[articleId]/read
│   │       └── mark-all-read/
│   │           └── route.ts                  # POST /api/articles/mark-all-read
│   ├── layout.tsx                            # Root layout & global styles
│   └── page.tsx                              # Main RSS Reader workspace view
├── components/
│   ├── FeedSidebar.tsx                       # Subscription list, unread counts, add/remove feed controls
│   ├── AddFeedForm.tsx                       # URL input form with validation feedback
│   ├── ArticleList.tsx                       # Chronological article list + filter controls (All / Unread)
│   └── ArticleReaderPane.tsx                 # Sanitized article viewer, read/unread toggle, external link
├── config/
│   └── env.ts                                # Runtime environment validation with Zod
├── db/
│   ├── schema.ts                             # Drizzle ORM SQLite table definitions & indexes
│   ├── client.ts                             # better-sqlite3 connection & schema initialization
│   └── repositories/
│       ├── feed.repository.ts                # Feed CRUD and unread count queries
│       └── article.repository.ts             # Article upsert (preserving isRead), filtering, read toggles
├── schemas/
│   └── feed.schema.ts                        # Shared Zod schemas and inferred TypeScript DTOs
├── services/
│   ├── feed-parser.service.ts                # rss-parser wrapper, date fallback, externalId generation
│   ├── html-sanitizer.service.ts             # sanitize-html wrapper with safe tag/attribute allowlist
│   └── feed-sync.service.ts                  # Orchestrates feed subscription, refresh, and persistence
└── lib/
    └── logger.ts                             # Structured JSON/console logger for errors and sync events

tests/
├── unit/
│   ├── env.test.ts                           # Environment schema validation tests
│   ├── feed-schema.test.ts                   # Zod input & URL validation tests
│   ├── html-sanitizer.test.ts                # XSS stripping & safe HTML preservation tests
│   └── feed-parser.test.ts                   # RSS 2.0 & Atom 1.0 normalization & missing date fallback tests
└── integration/
    ├── feed-repository.test.ts               # SQLite feed & article persistence, ordering, read-state preservation
    └── api-routes.test.ts                    # End-to-end Route Handler contract tests (subscribe, list, read toggle, refresh)
```

**Structure Decision**: A single Next.js (App Router) fullstack project under `src/` with dedicated layers for UI (`src/components`, `src/app`), domain services (`src/services`), shared validation contracts (`src/schemas`), and local SQLite persistence (`src/db`), accompanied by `tests/unit` and `tests/integration` executed by Vitest.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No Constitution violations identified. All five core principles and stack constraints are satisfied without exceptions.
