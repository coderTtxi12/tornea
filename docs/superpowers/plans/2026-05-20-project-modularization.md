# Project modularization — implementation plan

> **For agentic workers:** Use superpowers:executing-plans or implement task-by-task.

**Goal:** Document and enforce modular layers; split dashboard shell and API duplication.

**Spec:** `docs/superpowers/specs/2026-05-20-project-modularization-design.md`

**Architecture doc:** `docs/ARCHITECTURE.md`

---

### Task 1: Documentation — [x]

- [x] `docs/ARCHITECTURE.md`
- [x] Superpowers spec

### Task 2: `src/lib/api` — [x]

- [x] `requireAppUser`, `readFormString`, `zodFieldErrors`, `validationErrorResponse`
- [x] Migrated: `leagues/my`, `my/teams`, `my/players`, `dashboard/rail`, `leagues/[id]/teams` POST
- [x] Deduped `readFormString` in 7 multipart routes

### Task 3: Dashboard hooks + layout — [x]

- [x] `hooks/use-my-leagues.ts`
- [x] `hooks/use-dashboard-drawer.ts` + types
- [x] `layout/DashboardArenaHeader.tsx`
- [x] `layout/DashboardArenaDrawer.tsx` + `drawer-copy.ts`
- [x] Slim `DashboardArenaLayout.tsx` (~200 lines)

### Task 4: Migrate all API routes to `requireAppUser` — [x]

- [x] All `src/app/api/**/route.ts` handlers (25 route files)
- [x] `auth/dashboard-access` and `access-request` adapted
- [x] Storage uploads: `service ?? (await createClient())` where service role is optional
- [x] `npm run build` exit 0

### Task 5: Unified Zod validation in API routes — [x]

- [x] `validationErrorFromZod` in `lib/api/validation.ts`
- [x] Rutas sin bucles manuales de `parsed.error.issues`
- [x] `npm run build` exit 0

### Task 6: Schemas + NewPlayerForm split — [x]

- [x] `src/schemas/dashboard/` (7 schemas + barrel `index.ts`)
- [x] API routes import `@/schemas/dashboard/...`
- [x] `forms/player/`: constants, utils, icons, `PlayerFormTeamPicker`
- [x] `NewPlayerForm.tsx` slimmer (team picker extracted)

### Task 8: `use-new-player-form` — [x]

- [x] `forms/player/use-new-player-form.ts` — estado, edición, envío
- [x] `NewPlayerForm.tsx` — solo presentación (~430 líneas)

### Task 9: Phase 3 (backlog)
- [ ] Table shared primitives (`*-filterable-table.tsx`)
- [ ] Split `NewMatchForm` / other large forms

### Task 10: Verification — [x]

- [x] `npm run build` exit 0
- [x] No remaining `syncAppUserFromSupabaseAuthUser` in `src/app/api`
