# Tesseract VERTEX

> **Core Principle:** Open source. Forever free. Your business, your way.

**Tesseract VERTEX** is a local-first CRM for freelancers and small teams. Manage clients,
sales pipelines, projects, tasks, invoices, and business reporting from one unified
workspace — no account, server, or cloud database required.

## Local-only demo

Every record lives in your browser's `localStorage`. There is no login gate, cloud sync,
or remote database. Setup runs once at `/setup`; after that the app opens directly on the
dashboard.

### Setup flow

1. **Welcome** — what Project Tesseract and Vertex are.
2. **Visual Essence** — choose the Aether or Quasar theme.
3. **Your Orbit** — name, email, profession, domain, and key tools.
4. **Initialise** — optionally preload demo records.
5. **Ready** — enter the workspace.

To replay setup, clear Vertex's browser storage. In the browser console on the app origin:

```js
localStorage.clear();
location.href = '/setup';
```

Export a snapshot first (Settings → Data & Maintenance) if you want to keep your data.

## Stack

- **Frontend:** React 19 + Vite, React Router, Zustand, `@dnd-kit` (Kanban).
- **Data:** browser `localStorage` only.
- **PWA:** installable via `vite-plugin-pwa`.

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`). No environment variables
are required.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Build the production bundle. |
| `npm run preview` | Preview the production build. |
| `npm test` | Run the Vitest suite. |
| `npm run lint` | Run ESLint. |

## Data model: deals vs. projects

Vertex models the pre-sales pipeline on the same `Project` record that holds operational
projects, using a **`stage`** field separate from the operational **`status`** field:

| Field | Values | Meaning |
|---|---|---|
| `stage` | `Lead` · `Proposal Sent` · `Negotiation` · `Active` · `Completed` | Board column; drives the Kanban. |
| `status` | `In Progress` · `On Hold` · `Overdue` · `Completed` · `Archived` | Operational health; drives detail views. |

A record starts at a pre-sales `stage` (default `Lead`) and is "converted" by moving it to
the `Active` stage. `stageForStatus()` in `src/utils/storage.js` keeps the two fields
coherent when a user edits `status` directly (e.g. `Completed` → stage `Completed`).
Stage-less legacy records are back-filled on read by `normalizeProject()`.

## Scope

This line is a **local demo / stability build**. It ships no AI, automation, email, or
third-party integrations. Tasks use the List view; Calendar and Kanban toggles are hidden
until implemented.
