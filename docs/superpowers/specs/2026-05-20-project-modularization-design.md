# Project modularization — design spec

**Date:** 2026-05-20  
**Status:** Approved for phased implementation

## Problem

The codebase grew feature-first. Several areas mix UI, orchestration, and I/O in single files (500–1000+ lines). API routes repeat auth and FormData parsing. There is no single architecture doc for new contributors.

## Goals

1. Document layer boundaries (`app` / `components` / `logic` / `lib` / `db`).
2. Extract **shared infrastructure** (API auth, validation helpers, FormData).
3. Split **dashboard shell** into focused modules (header, drawer, hooks).
4. Keep behavior identical; no product changes.

## Non-goals (phase 2+)

- Splitting every large form (`NewPlayerForm`, `NewMatchForm`, …) — high churn, low immediate scaffolding value.
- Moving Zod schemas out of `components/dashboard` (future `src/schemas/`).
- Refactoring `db/schema.ts` (Drizzle source of truth).
- Redux or global client stores.

## Layer model

| Layer | Responsibility | May import |
|-------|----------------|------------|
| `src/app` | Routes, layouts, thin API handlers | `logic`, `lib`, `components` (server only where needed) |
| `src/components` | React UI, client hooks co-located with UI | `lib`, types; not `db` directly |
| `src/logic` | Business rules, DB queries, audit | `db`, `lib` |
| `src/lib` | Cross-cutting utilities (Supabase, API helpers, phone) | no `logic` |
| `src/db` | Schema, pool, Drizzle client | — |

## Approaches

| Approach | Pros | Cons |
|----------|------|------|
| **A. Incremental extraction** (chosen) | Safe, shippable slices | Large forms remain big until phase 2 |
| B. Big-bang `features/` folder move | Clean tree | Massive diff, import churn |
| C. Only documentation | Zero risk | Does not reduce file size |

## Phase 1 deliverables

1. `docs/ARCHITECTURE.md` — structure and conventions.
2. `src/lib/api/` — `requireAppUser`, `readFormString`, Zod → JSON helpers.
3. Migrate API routes using duplicated helpers to `lib/api`.
4. `src/components/dashboard/hooks/` — `useMyLeagues`, `useDashboardDrawer`.
5. `src/components/dashboard/layout/` — `DashboardArenaHeader`, `DashboardArenaDrawer`, drawer copy.
6. Slim `DashboardArenaLayout.tsx` and `DashboardArenaShell.tsx`.

## Phase 2 (documented, not in this PR)

- `src/schemas/dashboard/` for Zod shared with API + forms.
- `src/components/dashboard/forms/` and `tables/` sub-packages with shared table primitives.
- Optional split of `NewPlayerForm` into field sections + hook.

## Self-review

- Scoped to scaffolding, not full form decomposition.
- No DB or auth behavior changes.
- Clear extension path in ARCHITECTURE.md.
