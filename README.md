# Tesseract VERTEX

> **Core Principle:** Open source. Forever free. Your business, your way.

Building business software should not require freelancers to commit to another recurring subscription.

**Tesseract VERTEX** is an open-source CRM designed for freelancers and small teams to manage clients, sales pipelines, projects, tasks, invoices, and business reporting from one unified workspace.

The product follows a **dual-access model**: users can sign up for the cloud-hosted offering or self-host their own instance for greater control and extensive customization.

### Product Vision
Make professional business management accessible to independent professionals through software that is free, open source, and adaptable to their needs.

### Key Capabilities
1. **Client & Relationship Management** — Centralized client profiles, history, and contact tracking.
2. **Visual Project & Sales Pipeline Management** — Interactive Kanban boards spanning pre-sales deals to active project stages.
3. **Task & Project Tracking** — Project milestones, operational task workflows, and deadline tracking.
4. **Invoice Generation** — Professional invoicing and billing status management.
5. **Business Analytics & Reporting** — Revenue, pipeline conversion, and operational business metrics.
6. **Cloud Access & Self-Hosted Deployment** — Choose between managed cloud convenience or full autonomy via self-hosting.

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

## Data model: deals vs. projects

Vertex models the pre-sales pipeline on the same `Project` record that holds
operational projects, using a **`stage`** field separate from the operational
**`status`** field:

| Field | Values | Meaning |
|---|---|---|
| `stage` | `Lead` · `Proposal Sent` · `Negotiation` · `Active` · `Completed` | Board column; drives the Kanban. |
| `status` | `In Progress` · `On Hold` · `Overdue` · `Completed` · `Archived` | Operational health; drives detail views. |

**Decision (Beta Mark - ii).** The Prisma `Deal` model is **reserved for a
future migration** and is *not* used by the UI. The transition path is:
a record is created at a pre-sales `stage` (default `Lead`) and is "converted"
by moving it to the `Active` stage. `stageForStatus()` in
`src/utils/storage.js` keeps the two fields coherent when a user edits
`status` directly (e.g. `Completed` → stage `Completed`). Stage-less legacy
records are back-filled on read by `normalizeProject()`. This is documented
here instead of reconciled into a separate `Deal` entity so the stability
release ships no data-model migration.

> **Open (stakeholder):** whether to split `Deal` out as its own entity in
> Phase 3+. Tracked as R8 in the Phase 2 PRD.

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
