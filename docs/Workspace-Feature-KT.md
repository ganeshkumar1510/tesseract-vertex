# Workspace Feature - Knowledge Transfer & Implementation Spec

Audience: the developer implementing the real multi-workspace functionality.
Premise: the UI shell is COMPLETE and frozen (commit `09d6842`). The shell displays
one real workspace and is intentionally honest about everything it cannot do yet.
Your job is the functionality behind it - not a redesign of the shell.

Related commits:
- `09d6842` - workspace identity + switcher shell (the artifact you extend)
- `61994bd` - sidebar mode menu (the popover/keyboard pattern the shell mirrors)
- `15e3396`, `da8e203` - prior UX-audit batches (design-system conventions)

Companion docs:
- `C:\Users\ganes\.opencode\plan\Human-QA-Checklist.md` - section 9 covers the shell's interactive checks
- `C:\Users\ganes\.opencode\plan\Implementation-Strategy.md` - design-system + audit conventions this codebase follows

---

## 1. Verified current state (do not re-investigate)

| Area | Fact | Reference |
|---|---|---|
| Workspace identity today | ONE workspace per user: `user.workspace` name string (default `VERTEX Studio`) | `src/utils/storage.js` (`DEFAULT_USER` L206, `getLocalUser` L216) |
| Data scoping today | Mode prefixes only: `test_`, `demo_live_`, `live_` | `storage.js` `getPrefixedKey` L89 |
| Data layer | localStorage-first; sync reads/writes; refresh via `vertex-data-change` events | `storage.js` `getData` L313, `saveData` L325, `notifyDataChange` L307 |
| Bulk refresh hook | `notifyWorkspaceChange()` fires keys `clients, projects, tasks, invoices, activities, user` | `storage.js` L299 |
| App store | zustand + persist (`vertex-storage`): themeMode, sidebarMode, authToken, isSetupComplete, isDemoEnvironment | `src/store/useAppStore.js` |
| API | Master-key login -> single `{role:'admin'}` JWT; endpoints: auth/login, system/verify, system/seed, dashboard | `api/index.js` L103-196 |
| Database | Client, Project, Task, Invoice, Deal, Settings(studio_name). NO User/Workspace/Membership tables | `prisma/schema.prisma` |
| Team / permissions | Do not exist anywhere (no route, no model, no role data) | verified repo-wide |
| PDF generator | Reads `freelancer.workspace` (must keep working) | `src/utils/pdfGenerator.js` L43 |
| Settings rename | Writes `saveUser(username, { workspace })` | `src/pages/Settings.jsx` L111 |
| No test framework | Verification = `npm run lint` (must stay 0 errors / <=20 warnings) + `npm run build` + preview smoke (port 4173) | repo convention |

Shell behavior contract (must not regress; checklist section 9 verifies):
open/close via click, Esc (refocuses control), outside click, Tab-out; Arrow Up/Down
cycling; `aria-expanded` + descriptive `aria-label`; name truncation with tooltip;
responsive hide of the name at <=900px; disabled "New workspace"; "Manage team" omitted.

---

## 2. Shell anatomy - the exact extension points

File: `src/components/layout/WorkspaceSwitcher.jsx` (CSS: `WorkspaceSwitcher.css`; mounted in `Topbar.jsx`).

| Line | What it is | What you do with it |
|---|---|---|
| L17 | `export function WorkspaceSwitcher()` | Component entry |
| L82 | `const workspaces = [{ id: 'current', name: workspaceName, isActive: true }]` | REPLACE with the real workspace list from the data model |
| L91 | `handleSelect()` - currently closes as a no-op | REPLACE with the real switching sequence (section 5.2) |
| L141 | option `onClick={handleSelect}` | Pass the workspace object through |
| L159 | Comment marker where "Manage team" belongs | RE-ADD the button when section 5.4 conditions are met |
| L162-170 | Disabled "New workspace" placeholder | ENABLE per section 5.5 |

JSX/CSS inventory you should reuse (do not rename - checklist items reference these):
`.workspace-switcher`, `.workspace-control`, `.workspace-badge`, `.workspace-name`,
`.workspace-chevron`, `.workspace-popover`, `.workspace-search`, `.workspace-option`,
`.workspace-option-badge`, `.workspace-option-body`, `.workspace-option-name`,
`.workspace-option-hint`, `.workspace-option-check`, `.workspace-empty`,
`.workspace-divider`, `.workspace-action`, `.workspace-action-badge`.

Component state today: `workspaceName` (from `getLocalUser().workspace`, live-updated on
`vertex-data-change` key `user`), `isOpen`, `query`. All dismissal/keyboard logic is
already implemented - keep it intact.

---

## 3. Target data model (proposal - confirm at kickoff)

```js
// localStorage key: vtx_workspaces  (global, NOT workspace-scoped)
[
  {
    id: 'ws_default',            // stable string for the migrated original; new ones: `ws_${crypto.randomUUID()}`
    name: 'VERTEX Studio',       // seeded from user.workspace on first read
    logoUrl: null,               // optional; data URL or URL. No upload flow yet (section 9)
    createdAt: '2026-10-18T...'  // ISO
  }
]

// localStorage key: vtx_active_workspace
'ws_default'

// NOT part of this phase (needed only when teams/cloud land):
// membership: { workspaceId, userId, role: 'owner' | 'admin' | 'member' }
```

Storage keys that STAY GLOBAL (never workspace-scoped):
`vtx_workspaces`, `vtx_active_workspace`, `vtx_users`, `vtx_jwt`, `vtx_active_context`,
`vtx_active_username`, `vtx_storage_mode`, `vertex-storage` (zustand).

Keys that BECOME workspace-scoped: `clients`, `projects`, `tasks`, `invoices`, `activities`
(the entities pages read via `getData`/`saveData`).

**Single source of truth rule:** the workspace model lives in `storage.js` (matching the
existing user/data pattern), surfaced to components through events. Do NOT mirror it into
`useAppStore` - that would create a second source (NFR: "avoid duplicate workspace state
sources"). If you must deviate, document why in the PR.

---

## 4. Storage layer design (the core work)

### 4.1 Key namespacing + migration (critical)

Current key shape: `[test_|demo_live_|live_]key`.
Target key shape: `[mode prefix][ws_<id>_]key`, e.g. `live_ws_default_clients`.

**The mode prefix MUST stay outermost.** Existing logic depends on it:
- `clearTestContext()` removes keys `startsWith('test_')` (`storage.js` L367)
- `exportStorageJSON`/`importStorageJSON` filter by prefixes `['vtx_','live_','test_','demo_live_']` (L380, L400)
- `wipeStorage` clears everything (fine either way)

Migration strategy - read-through fallback, copy-forward, never destructive:

```js
function getPrefixedKey(key) {
  const { mode } = getContext();
  const modePrefix = mode === 'test' ? 'test_' : isDemoEnvironmentEnabled() ? 'demo_live_' : 'live_';
  const wsId = getActiveWorkspaceIdSafe();          // never throws; falls back to 'ws_default'
  const scoped = `${modePrefix}ws_${wsId}_${key}`;
  // One-time copy-forward for the ORIGINAL workspace's legacy data:
  if (wsId === 'ws_default' && localStorage.getItem(scoped) == null) {
    const legacy = localStorage.getItem(`${modePrefix}${key}`);
    if (legacy != null) localStorage.setItem(scoped, legacy); // copy, never move/delete
  }
  return scoped;
}
```

Properties this gives you for free:
- Existing installs: legacy data appears inside `ws_default` on first read; legacy keys remain untouched (rollback-safe).
- New workspaces: empty scope; no leakage.
- Export/import/UAT-clear keep working unchanged.
- `wipeStorage` (Master Reset) clears workspaces too - expected.

Bootstrap (idempotent, call at the top of `getWorkspaces()`):

```js
function ensureWorkspaceBootstrap() {
  if (localStorage.getItem('vtx_workspaces')) return;
  const name = getLocalUser().workspace || 'VERTEX Studio';
  localStorage.setItem('vtx_workspaces', JSON.stringify([
    { id: 'ws_default', name, logoUrl: null, createdAt: new Date().toISOString() },
  ]));
  localStorage.setItem('vtx_active_workspace', 'ws_default');
}
```

### 4.2 Functions to add (signatures + behavior)

Place them in `storage.js` (keep imports/ordering consistent with that file):

| Function | Contract |
|---|---|
| `getWorkspaces()` | Bootstrap if needed; returns `Workspace[]`; always >= 1 item |
| `getActiveWorkspaceIdSafe()` | Returns stored id if it exists in the list; otherwise repairs to the first workspace and persists; never throws |
| `getActiveWorkspace()` | Record or `null` (cannot be null after bootstrap) |
| `setActiveWorkspace(id)` | Validate id exists -> else throw `Error('Unknown workspace')`; write `vtx_active_workspace`; mirror `saveUser(username, { workspace: ws.name })` (fires `user` event - keeps Topbar/PDF back-compat); extend `notifyWorkspaceChange()` to ALSO dispatch key `'workspace'`; return the record |
| `addWorkspace({ name, logoUrl = null })` | (Future creation flow) creates `ws_<uuid>` record, persists, dispatches `'workspace'`; caller decides activation |
| `renameWorkspace(id, name)` | Updates record; if id is active, mirror `saveUser({ workspace: name })`; dispatch `'workspace'` + `'user'` |

Event contract (extend the existing bus - do not add a second one):
- `notifyWorkspaceChange()` gains one line: `notifyDataChange('workspace')`.
- Identity components subscribe to `vertex-data-change` with `key in {'workspace','user', undefined}`.

### 4.3 Pitfalls (read before coding)

1. `readPersisted` returns `[]` by default - the workspaces store is an ARRAY; parse defensively (corrupt JSON -> rebuild from legacy `user.workspace`).
2. `updateDataItem` falls back to demo-merged items, then writes into the CURRENT workspace - acceptable, but never reuse it for cross-workspace moves.
3. Demo mode merges `mockData` into every workspace's view (`getData` L313). Decide: same mock seed per workspace (current behavior if unchanged) - flag to product (section 9.4).
4. `clearTestContext` + UAT "End UAT & Clear Data" wipe ALL test-mode workspaces (prefix behavior). Correct, but document in the PR.
5. Do not scope `user`: profile stays global; only `workspace` name mirrors the active workspace.
6. `crypto.randomUUID()` is already the app's id generator (`addDataItem`) - reuse it.

---

## 5. Wiring the shell - step-by-step

### 5.1 Workspace list (replace L82)

```jsx
const [workspaces, setWorkspaces] = useState(() => getWorkspaces());
const [activeId, setActiveId] = useState(() => getActiveWorkspaceIdSafe());
useEffect(() => {
  const onDataChange = (e) => {
    const key = e.detail?.key;
    if (!key || key === 'workspace' || key === 'user') {
      setWorkspaces(getWorkspaces());
      setActiveId(getActiveWorkspaceIdSafe());
    }
  };
  window.addEventListener('vertex-data-change', onDataChange);
  return () => window.removeEventListener('vertex-data-change', onDataChange);
}, []);
```

Keep the existing single-workspace name listener OR fold it into this one (one subscription is cleaner).
Map `isActive: w.id === activeId` in the render; the check/hint/`aria-current` markup already keys off `isActive`.

### 5.2 Switching sequence (replace `handleSelect`)

```jsx
const handleSelect = (workspace) => {
  if (workspace.id === activeId) { closePopover(true); return; }  // no-op: no reload, no state churn
  try {
    setActiveWorkspace(workspace.id);        // validates, persists, mirrors, dispatches events
    toast.success('Workspace switched', `Now working in ${workspace.name}.`);
    closePopover(true);
  } catch {
    toast.error('Could not switch workspace', 'The workspace is unavailable. Nothing was changed.');
    // popover stays open; NO false success
  }
};
```
`toast` = `useToast()` from `src/hooks/useToast.js` (same API used in `Settings.jsx`: `toast.success(title, message)`).
Pages refresh automatically because every page already subscribes to `vertex-data-change`.

### 5.3 Workspace logo

When a record has `logoUrl`, render `<img src={logoUrl} alt="" className="workspace-badge-img" />`
inside `.workspace-badge` / `.workspace-option-badge` (add one CSS rule: `object-fit: cover; width/height 100%; border-radius: inherit`).
Keep the initial fallback path exactly as-is (checklist 9 assumes it). Never synthesize a logo for a record that has none.

### 5.4 "Manage team" (re-enable only when BOTH exist: a route + a permission source)

Insert at the L159 marker:
```jsx
{canManageTeam && (
  <button type="button" className="workspace-action" onClick={handleManageTeam}>
    <Users size={16} aria-hidden="true" />
    <span>Manage team</span>
  </button>
)}
```
- `canManageTeam`: derive from the future membership/role data (e.g. `membership?.role === 'owner' || 'admin'`). Until a permission source exists, this must stay hidden (the brief forbids a dead button).
- `handleManageTeam`: `closePopover(true)` then `navigate('/workspace/team')` (proposed path - confirm during the team-route decision, section 9.2).
- Requires `useNavigate` from `react-router-dom` (the switcher is inside the router context).

### 5.5 "New workspace" (enable when the creation flow exists)

- Handler contract: open the creation flow (route or modal) and let it call `addWorkspace({ name, logoUrl })`; on success decide activation (recommend: activate the new workspace, then `toast.success`). Remove `disabled`, the `Soon` badge, and the tooltip in the same change.
- Do NOT activate from the switcher directly - the creation flow owns validation and persistence.

### 5.6 Route guard after switching

Detail routes hold ids from the previous workspace: `/clients/:id`, `/projects/:id`, and
`/invoices?client=<id>` deep links. After a successful switch, if `location.pathname` matches
a detail route, `navigate('/dashboard')` (simplest correct behavior) - or verify the entity
exists in the new scope and show the existing NotFound state if not. Decide once, apply in
`handleSelect` via `useLocation`/`useNavigate`. Without this, users land on "record not found" screens.

### 5.7 Settings rename rewiring

`Settings.jsx` L111 currently does `saveUser(username, { workspace: workspaceName })`.
Change it to `renameWorkspace(getActiveWorkspaceIdSafe(), workspaceName)` (which mirrors
`user.workspace` for you). The header updates live via the `workspace`/`user` events.
`pdfGenerator.js` L43 keeps working through the mirror - do not touch it.

### 5.8 Currency - product decision (section 9.1)

`getCurrency()` reads `user.currency` (user-level). If product wants per-workspace currency,
move it into the workspace record and make `getCurrency()` read the active record (keep
`user.currency` as the fallback for records that predate the move).

---

## 6. Functional acceptance matrix

Verify with the browser devtools > Application > Local Storage open (keys listed are under the active mode prefix).

| # | Scenario | Expected | Inspect |
|---|---|---|---|
| A1 | First run after upgrade | `vtx_workspaces` created with one `ws_default`; header shows the old name; existing data unchanged | `vtx_workspaces`, legacy keys still present |
| A2 | Migration | All existing clients/projects/tasks/invoices/activities visible in `ws_default`; legacy keys untouched | `live_ws_default_clients` appears; `live_clients` still exists |
| A3 | Isolation | Create client in A; switch to B -> absent; switch back -> present | `live_ws_A_clients` vs `live_ws_B_clients` |
| A4 | Refresh persistence | Reload while in B -> still in B | `vtx_active_workspace` |
| A5 | Same-workspace select | No reload, no state change, popover closes | no new `workspace` event |
| A6 | Invalid active id | App repairs to first workspace, no crash | corrupt `vtx_active_workspace`, reload |
| A7 | Search | Case-insensitive, trims spaces, empty message on no match | UI |
| A8 | Rename | Settings rename updates header + record + `user.workspace` mirror; PDF uses new name | all three |
| A9 | Failure path | Force `setActiveWorkspace` throw -> error toast, popover open, store unchanged | code-level test |
| A10 | Detail route after switch | No stale "not found" screen (redirect or NotFound) | navigate to `/clients/:id`, switch |
| A11 | UAT clear | "End UAT" removes test data incl. `test_ws_*_*`; live data untouched | localStorage |
| A12 | Export/import | Snapshot contains `live_ws_*` keys; import restores them | `exportStorageJSON` |
| A13 | Master reset | Wipe clears everything incl. workspaces; next load bootstraps fresh | after `wipeStorage` |
| A14 | Keyboard/dismissal | Checklist section 9 items 9.7/9.8 still pass | manual |
| A15 | Existing pages | Dashboard/Clients/Projects/Pipeline/Tasks/Invoices/Reports/Settings all re-render per workspace | manual |

Cloud extension (later): membership-filtered `GET /api/workspaces`, authorized switching
server-side, Prisma `Workspace` + `Membership` + `user_id` columns + data scoping - separate approval.

---

## 7. Suggested delivery phases (each phase = one commit + gates)

Gates for every phase: `npm run lint` stays 0 errors / <=20 warnings; `npm run build` green;
preview smoke on the 9 main routes; update checklist section 9 where behavior changed.

| Phase | Scope | Files | Rollback safety |
|---|---|---|---|
| P1 | Storage model + migration + events (NO UI change) | `storage.js` | Additive; legacy fallback means old keys still work |
| P2 | Wire switcher list + switching sequence + logo url + route guard | `WorkspaceSwitcher.jsx/.css` | Revert one commit |
| P3 | Settings rename rewiring (+ currency if approved) | `Settings.jsx`, maybe `storage.js` | Revert |
| P4 | (Approval-gated) team route + membership stub | routes/new page | Hidden until enabled |
| P5 | (Approval-gated) creation flow | new modal/route | Disabled placeholder returns |

Phase 0 prerequisite: product sign-off on section 9 items.

---

## 8. Testing strategy

No test framework exists (verified). Two options:
1. Gates only (status quo): lint/build/preview + the A1-A15 matrix manually.
2. RECOMMENDED (needs approval for the devDependency): add `vitest` and unit-test the pure
   storage functions - `getPrefixedKey` scoping, bootstrap idempotency, migration copy-forward,
   `setActiveWorkspace` validation, event dispatch - with a localStorage shim. These are the
   only genuinely unit-testable parts; UI stays on the human checklist.

Manual localStorage assertion cheat-sheet: after each scenario, confirm scoped keys exist
(or do not) and that legacy keys are NEVER deleted by the migration.

---

## 9. Open product decisions (blocking the flagged phases)

1. **Currency scope**: user-level (today) vs per-workspace. Affects P3.
2. **Team model**: permission source shape (`owner/admin/member`?) and the route path (`/workspace/team` proposed). Blocks P4.
3. **Cloud direction**: when/if workspaces sync to the DB (Prisma `Workspace`, `Membership`, `user_id` scoping, API endpoints). Blocks any server-side authorization work.
4. **Demo mode**: should every workspace show the same mock seed (current behavior if unchanged), or should demo data be per-workspace?
5. **Logo assets**: data URL vs hosted URL vs upload API; validation rules. Blocks the logo-upload workflow (NOT the `logoUrl` rendering branch in P2).
6. **Creation flow UX**: full-screen route vs modal - owned by the future spec, but the handler contract in 5.5 is fixed.

---

## 10. Reference artifacts

- Commits: `09d6842` (shell), `61994bd` (popover pattern source), audit batches `5b66628` -> `15e3396`.
- QA checklist: `C:\Users\ganes\.opencode\plan\Human-QA-Checklist.md` - section 9 = shell contract; add rows for A1-A15 when implementing.
- Design system: tokens in `src/styles/tokens.css` + `src/index.css`; popover pattern in `Sidebar.jsx/.css`; toast API in `src/store/toastStore.js`; guards in `src/hooks/useDiscardGuard.js`.
- Non-negotiables: no new dependencies without approval; no invented endpoints/tables; ASCII-only storage keys; keep the shell's aria/keyboard contract; never delete legacy data keys.
