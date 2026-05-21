# Dashboard section routes — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each dashboard sidebar section its own URL and keep league data loaded when switching sections, without Redux.

**Architecture:** App Router `(arena)` route group with server auth layout; client `DashboardArenaShell` mounted once in layout; `dashboard-routes.ts` maps nav keys to paths; sidebar uses `Link`.

**Tech stack:** Next.js 16 App Router, React 19 `useState` / `usePathname`, existing `/api/leagues/my` APIs.

**Spec:** `docs/superpowers/specs/2026-05-20-dashboard-section-routes-design.md`

---

### Task 1: Route map and nav links

**Files:**
- Create: `src/components/dashboard/nav/dashboard-routes.ts`
- Modify: `src/components/dashboard/nav/dashboard-nav-config.ts`
- Modify: `src/components/dashboard/nav/DashboardNavPill.tsx`
- Modify: `src/components/dashboard/nav/index.ts`

- [ ] **Step 1:** Add `DASHBOARD_NAV_PATHS`, `dashboardPathForNavKey`, `dashboardNavKeyFromPathname`
- [ ] **Step 2:** Add `href` to each `DASHBOARD_NAV_ITEMS` entry
- [ ] **Step 3:** Replace nav `button` + `onNavigate` with `Link` from `next/link`
- [ ] **Step 4:** Pass `nav` prop into `DashboardArenaLayout` (remove internal `useState` for section)

### Task 2: Arena routes

**Files:**
- Create: `src/app/(arena)/layout.tsx` (server auth, moved from `app/dashboard/layout.tsx`)
- Create: `src/app/(arena)/{dashboard,leagues,fixture,live,teams,players,venues,standings,discipline,reports,settings}/page.tsx`
- Delete: `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx`

- [ ] **Step 1:** Add route group layout with existing auth redirects
- [ ] **Step 2:** Add one `page.tsx` per section path
- [ ] **Step 3:** Remove old `/dashboard` app folder duplicates

### Task 3: Persistent shell (no refetch on section change)

**Files:**
- Create: `src/components/dashboard/DashboardArenaShell.tsx` (logic from `DashboardArenaPage.tsx`)
- Modify: `src/app/(arena)/layout.tsx` — wrap with `DashboardArenaShell`
- Modify: section `page.tsx` — minimal marker (`return null` or shared stub)
- Remove/re-export: `DashboardArenaPage.tsx` → thin re-export of shell if needed

- [ ] **Step 1:** Move data fetching + `DashboardArenaLayout` render into shell
- [ ] **Step 2:** Mount shell in arena layout; pages do not mount shell
- [ ] **Step 3:** Confirm `useEffect` for `/api/leagues/my` does not re-run on `/teams` → `/leagues` navigation

### Task 4: Verification

- [ ] **Step 1:** Run `npm run build` — exit 0, all arena routes listed
- [ ] **Step 2:** Manual checklist: `/teams` in address bar; back/forward; login still → `/dashboard`
- [ ] **Step 3:** Confirm no Redux added to `package.json`
