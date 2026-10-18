# Tesseract Vertex — Cleanup, Hardening & Release Readiness

*Five-phase engineering pass · completed 19 October 2026 · local commits only*

## 1. Executive summary

This pass removed dead weight, made styling self-consistent, fixed a set of real
defects — several of them invisible to the eye because the browser was silently
dropping styles — closed the security gaps that blocked a public deployment, and
prepared the project for production hosting (SPA routing, a leaner initial
bundle, automated tests and CI).

Highlights:

- **Every CSS class used in the app now resolves to a real rule** in both themes,
  verified across 23 page-loads. Previously, broken classes were dropped silently
  (e.g. the logo rendered a literal class name `undefined`; table cards carried
  doubled padding because `p-none` did not exist).
- **Initial JavaScript bundle cut from 866 kB to 455 kB** by loading the PDF
  library on demand, only when someone exports an invoice.
- **Login can no longer be unlocked with shipped defaults.** In production the
  server now fails closed unless real secrets are configured.
- **"Master Reset" wipes only Vertex's own data**, not every key in the browser.
- **The project now has real tests (14 unit tests) and CI** (lint → test → build).
- **Zero visual regressions**: 23-page class audit, plus a 20-shot visual matrix
  in both themes at 1440 px and 1024 px — all green, zero console errors.

## 2. What changed, phase by phase

### Phase 1 — Dead code removal & design-token repair (`6042c8c`)

- Repaired a self-referencing CSS variable cycle (`--accent-light`, `--accent-glow`)
  that had silently disabled every violet tint in the app. Restored: task view
  tints, settings navigation, command palette selection, workspace menu, and the
  logo's hover glow.
- Removed duplicate mode-toggle styling and legacy tint aliases; fixed the
  scrollbar hover colour and the `.global-search` selector.
- Removed dead CSS rules across eight stylesheets, deleted the unused
  `SkeletonLoader` component, and pruned seven dead exports from the storage
  module (old auth stubs and theme helpers).
- **Deliberate keeps, documented in code:** the violet palette (reserved brand
  colours used by future surfaces). The other two reserved tokens
  (`--stage-lost`, `--color-success-border`) were removed by the final
  dead-code sweep once they proved orphaned — see *Final sweep* below.

### Phase 2 — Typography made semantic (`3718dad`)

- Added a real type scale to the design system: `h1`–`h4`, `body-lg/md/sm`,
  `caption`. Utilities are emitted only when used, so there is no bundle cost.
- Inputs now render at 14 px as designed (they were silently inheriting the
  16 px page body size).
- Deleted two dead components (`CardTitle`, `ClientCard`) and an orphaned
  feature folder.
- The plain 16 px card header look was confirmed as intentional in all QA
  rounds and left untouched.

### Phase 3 — Defect fixes (`7879dec`)

- **Mobile navigation:** the "Home" tab linked to a non-existent route, so it
  never highlighted. Now points at the dashboard.
- **Accessibility:** the theme toggle was mouse-only. It is now a proper
  `role="switch"` with labels, keyboard support (Enter/Space) and a visible
  focus ring.
- **Theme handling:** the app used to rewrite the entire `<html>` class list and
  flash the default theme on first paint. It now toggles classes cleanly, reads
  the stored choice once at start-up, and has a single source of truth (the
  duplicate copy in the global store was removed).
- **Sign-in / setup styling:** shared stylesheet renamed to `Auth.css` with a
  consistent `auth-*` naming (68 renames), used by both login and initial setup.
- **Silently-dropped classes fixed** (found with a full-DOM audit): the logo's
  `undefined` class, two border-colour classes, the secondary button's accent
  colour, and six table cards whose intended "flush edge" padding never applied —
  fixed properly with a `noPadding` option on the card component.
- Removed eleven stale no-op class hooks (`col-left`, `quick-input`,
  `task-section`, etc.).

### Phase 4 — Security hardening (`9e1a318`)

- **Fail-closed authentication:** in production, `MASTER_PASSWORD` and
  `JWT_SECRET` are now required. If they are missing or still template
  placeholders, login returns "server misconfigured" (503) instead of falling
  back to shipped defaults. Development keeps the convenient fallback.
- **No bundled secrets:** the old admin PIN bypass (shipped `1510`) is gone. The
  `VITE_ADMIN_PIN` override now works only in development builds — the value
  ships inside the client bundle, so it can never be a production gate.
  Verified by browser end-to-end tests against a production build.
- **CORS:** the wildcard (`*`) is removed. Same-origin needs no configuration;
  cross-origin access requires an explicit `CORS_ORIGINS` allowlist, and
  unlisted origins get a preflight rejection (403).
- **Master key comparison is timing-safe**; baseline security headers added
  (`nosniff`, frame deny, no-referrer) and the Express fingerprint header
  (`x-powered-by`) disabled.
- **Scoped wipe:** "Master Reset" removes only `vtx_`, `live_`, `test_`,
  `demo_live_` and `vertex-` keys from local + session storage. Unrelated browser
  data is never touched. A dead API call to a non-existent endpoint was removed
  along with its now-unused helper.
- `.env.example` now documents the production requirements and the optional
  CORS setting.

### Phase 5 — Release readiness (final commit)

- **Deployment (`vercel.json`):** SPA fallback so deep links (`/clients`,
  `/settings`, …) resolve on refresh; hashed assets cached immutably; service
  worker never stale-cached; baseline security headers on static responses.
- **API routing:** the serverless handler normalises Vercel's rewrite path form
  back to `/api/...` so all Express routes match regardless of rewrite shape
  (covered by a dedicated harness assertion).
- **Leaner bundle:** the PDF library (jsPDF, ~390 kB) moved to an on-demand
  chunk — 866 kB → 455 kB initial JS, no build warnings. *(Applied in the
  working tree on top of in-flight invoice work; ships with that commit.)*
- **Tests:** vitest + happy-dom with 14 unit tests covering pipeline stage
  normalisation, credential validation (no shipped default, dev-only override),
  namespaced import, and the scoped wipe.
- **CI:** GitHub Actions workflow runs lint → tests → build on every push/PR.
- `npm start` now serves the production build locally for smoke checks.

### Final sweep — dead / unfinished code audit (this commit)

Repository-wide audit for unused files, exports, dependencies and unreferenced
assets before release:

- **Deleted:** two never-imported components (`ErrorState`, `StatusDot` — the
  latter already flagged in the Phase 2 ledger), one orphaned API route
  (`GET /api/dashboard`, no caller) with its auth middleware, an unused helper
  (`addClient`), an unused constant (`PIPELINE_STAGES`) and two orphaned design
  tokens (`--stage-lost`, `--color-success-border`).
- **Un-exported (kept, still used internally):** `getTaskCategory`,
  `isProduction`, `databaseUrlConfigured`.
- **Removed dead dependencies:** `bcrypt`, `body-parser` (Express 5 has
  built-in JSON parsing), `@dnd-kit/sortable`, `@dnd-kit/utilities` (only
  `@dnd-kit/core` is used), `@tailwindcss/postcss` (the build uses Tailwind 3
  via `postcss.config.js`), `@types/react`, `@types/react-dom` and
  `typescript` (no TypeScript sources; `prisma.config.ts` is compiled by
  Prisma's bundled loader — verified by a full build after removal).
- **Fixed broken asset references:** the PWA manifest and precache list pointed
  at `logo.png`, `favicon.png` and `icons.svg` — none of which existed. The two
  PNG icons are now generated from the SVG mark; the dead `icons.svg` reference
  was dropped; the Apple touch icon now uses a PNG (iOS ignores SVG icons).
- **Removed dead config:** `VITE_TEST_PIN` was never read by any code.
- **One-off debug artifacts removed:** `scripts/verify-data-sync.mjs` and its
  `.cursor` log (single-use debugging harness). The Supabase validator script
  is now wired up as `npm run validate:supabase`.
- **Kept (verified as intentional, not dead):** the disabled "New workspace"
  placeholder (QA checklist §9.5, workspace KT doc §5.5), the UAT panel,
  `notifyWorkspaceChange()` (documented bulk-refresh hook), and the Prisma
  cloud models / `archival_triggers.sql` (documented future cloud layer).
- **Evidence:** lint 0 errors / 14 warnings; tests 14/14; build green with no
  PWA asset warnings; API harness 24/24; DOM sweep 23 page-passes, 0 missing
  classes, 0 console errors; dead-code audit: zero unused exports, zero
  unreferenced files.

## 3. Verification evidence

| Gate | Result | How it was verified |
| --- | --- | --- |
| Lint | 0 errors / 14 warnings (from 20) | `npx eslint .` |
| Build | Green, PWA assets generated, no size warnings | `npm run build` |
| Unit tests | 14 / 14 | `npm test` (vitest) |
| API security | 24 / 24 | 5-env harness (dev fallback, prod fail-closed, prod placeholder, prod configured + CORS, Vercel detection) incl. rewrite-path login |
| Browser security E2E | 13 / 13 | production build: PIN bypass rejected on password-change and wipe paths; correct password works; wipe preserves foreign keys |
| PDF export E2E | 7 / 7 | lazy chunk fetched only on click; valid PDF bytes; zero console errors |
| DOM class integrity | 23 page-passes, 0 missing tokens, 0 console errors | full-DOM sweep, both themes, all routes + setup steps + login |
| Visual matrix | 20 shots, 0 console errors | 2 themes × 1440/1024 px × dashboard, clients, pipeline, settings, login |
| Data safety | Verified | wipe keeps unrelated localStorage/sessionStorage keys (unit + E2E) |

## 4. Deployment checklist (owner actions)

- [ ] In the hosting environment (Vercel → Project → Settings → Environment
      Variables), set **`MASTER_PASSWORD`** to a strong secret and
      **`JWT_SECRET`** to a long random string. Without them, production login
      is disabled by design.
- [ ] Optional: set `CORS_ORIGINS` only if the API will be called from a
      different origin; same-origin needs nothing.
- [ ] Optional: `DATABASE_URL` / Supabase values for cloud persistence
      (local-only mode works without them).
- [ ] Push the branch to enable CI on GitHub (workflow at
      `.github/workflows/ci.yml`).
- [ ] Remove the `VITE_ADMIN_PIN` value from production env if set — it is a
      bundled, client-visible development convenience and no longer gates
      anything in production builds.

## 5. Deliberate decisions kept

- **Violet palette reserved** (11 tokens) as brand colours for upcoming
  surfaces — documented rather than deleted.
- **Plain card headers** (16 px regular) are the intended look — kept.
- **Sidebar ≤768 px collapse fix** is prepared but held back pending the
  owner's explicit approval; the existing safe rule is preserved untouched.
- **Local user passwords** remain stored as plaintext in browser storage
  (local-first MVP, no server verification). Recommended follow-up: hash on
  write with a transparent migration on next save.

## 6. Open items

- Owner manual QA: remaining checklist sections (10–19) for human sign-off.
- The in-flight invoice feature work (parallel working-tree changes) should be
  committed by its author — it includes the lazy-PDF hook described in Phase 5.
