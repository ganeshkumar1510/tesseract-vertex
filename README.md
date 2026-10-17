# Vertex — Tesseract Vertex

A local-first CRM & Focus OS for solo freelancers. Track clients, projects, a
pre-sales pipeline, tasks, and invoices in one workspace.

## Stack

- **Frontend:** React 19 + Vite, React Router, Zustand, `@dnd-kit` (Kanban).
- **Data:** local-first. Entity data (clients, projects, tasks, invoices,
  activities) is stored in the browser via `localStorage`. The Express API
  (`api/`) is used only for `auth/login`, `system/verify`, and `system/seed`.
- **Database (optional):** Prisma 7 + `@prisma/adapter-pg`, with a Supabase
  fallback for connectivity verification.

## Getting started

```bash
npm install
npm run dev      # starts Vite + the local API together
```

Copy `.env.example` to `.env` and fill in values. Setup runs at `/setup`; the
app then boots to `/login`.

## Environment variables

See `.env.example` for the full list. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `VITE_ADMIN_PIN` | yes | Admin PIN (local/UAT). |
| `VITE_TEST_PIN` | no | Test PIN (local/UAT). |
| `MASTER_PASSWORD` | yes | API master key for login. Defaults to `VITE_ADMIN_PIN`. |
| `JWT_SECRET` | yes | Signs session JWTs after login. |
| `DATABASE_URL` | no | Prisma Postgres connection string. |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | no | Supabase fallback connection + client. |

`.env` is gitignored — never commit real secrets.

## Local vs. cloud data posture

Vertex is **local-first**. If no database is configured — or if `DATABASE_URL`
still contains the `[YOUR-PASSWORD]` placeholder — the app runs in **local
mode**: entity data stays in the browser. When local mode is active, a
dismissible banner in the app shell makes this explicit. The setup screen
(`/setup`) reports a **Database status** of *Connected*, *Connected (schema not
ready)*, or *Not configured — local mode*, with next-step hints.

When `DATABASE_URL` is configured, run `npx prisma db push` to create tables
before verifying.

## Roadmap & scope

This line of the product is a **stability release (Beta Mark - ii)**. Per the
release non-goals, it ships **no AI or automation features**:

- **Sentinel / AI panel — deferred.** A prototype "Sentinel" assistant panel
  (`AIPanel`) previously existed in the codebase. It was never wired into the
  UI and has been **removed** so the stability release carries no AI surface.
  Any conversational-assistant capability is an explicit post-stability
  (Phase 3+) item.
- **Tasks views.** The Tasks page currently implements the List view only;
  Calendar and Kanban toggles are intentionally hidden until implemented.
- **Phase 3 candidates:** global toast system (replacing native
  `alert()`/`confirm()`), Reports analytics expansion, and table sorting /
  filtering.
