# Council Kanban Frontend

Forked from [Vibe Kanban](https://github.com/BloopAI/vibe-kanban) and adapted for the Council Core API.

## Architecture

```
┌─────────────────────────────────┐
│  React Frontend (Vite + pnpm)   │
│  ┌───────────────────────────┐  │
│  │ Council API Transport     │  │
│  │ → http://localhost:8000   │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Kanban Board (dnd-kit)    │  │
│  │ CouncilKanbanContainer    │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ React Query Hooks         │  │
│  │ (replaces ElectricDB)     │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
         │
         │  HTTP (CORS, proxy in dev)
         ▼
┌─────────────────────────────────┐
│  Council Core API (Python)      │
│  /v1/projects                   │
│  /v1/work-items                 │
│  /v1/workflow-runs              │
│  /v1/reviews                    │
│  (SQLite: council_core.db)      │
└─────────────────────────────────┘
```

## Setup

```bash
cd frontend
pnpm install
pnpm dev          # starts on port 3000, proxies /v1/ → localhost:8000
```

## Key Differences from Vibe Kanban

| VK Feature | Council Fork |
|------------|--------------|
| Rust/Axum backend | Python/Starlette backend |
| ElectricDB real-time | React Query polling (3-5s) |
| OAuth/multi-user | Single-user, no auth |
| Organizations | Flat project list |
| Workspaces/agents | Not implemented (phase 2) |
| Relay/tunnel | Removed |
| Tauri desktop | Web only |
| `status_id` (FK) | `phase` (free text) |
| Separate tag table | `tags` (JSON text) |

## Schema Mapping

The frontend adapts to your existing `work_items` table:

| VK Field | Your Field | Notes |
|----------|------------|-------|
| `status_id` | `phase` | Free text, resolved to kanban columns client-side |
| `tags` (FK) | `tags` | JSON array stored as TEXT |
| `parent_issue_id` | `parent_id` | Self-reference |
| `extension_metadata` | `metadata` | JSON stored as TEXT |
| `issue_number` | — | Not used |
| `simple_id` | — | Not used |

## Kanban Columns

Default phases (resolved from `phase` field):

1. **Backlog** — `backlog`, `scout`, `plan`
2. **To Do** — `todo`, `to-do`, `proposed`
3. **In Progress** — `in-progress`, `build`, `implement`
4. **In Review** — `in-review`, `review`, `validate`
5. **Done** — `done`, `complete`, `index`
6. **Failed** — `failed`, `error`

## File Structure

```
frontend/
├── packages/
│   ├── local-web/          # App shell, routing, entry point
│   │   └── src/
│   │       ├── app/
│   │       │   ├── entry/
│   │       │   │   ├── App.tsx          # Simplified (no auth/providers)
│   │       │   │   └── Bootstrap.tsx    # Simplified (no Sentry/PostHog)
│   │       │   ├── navigation/
│   │       │   │   └── AppNavigation.ts # Simplified (project routes only)
│   │       │   └── providers/
│   │       │       └── ThemeProvider.tsx # Kept as-is
│   │       └── routes/
│   │           ├── __root.tsx           # Simplified (QueryClient + i18n)
│   │           ├── _app.tsx             # Simplified layout (project sidebar)
│   │           ├── index.tsx            # Redirect to first project
│   │           ├── _app.projects.$projectId.tsx
│   │           └── _app.projects.$projectId_.issues.$issueId.tsx
│   ├── web-core/           # Kanban pages, hooks, API client
│   │   └── src/
│   │       ├── pages/kanban/
│   │       │   ├── CouncilKanbanContainer.tsx  # NEW: kanban board
│   │       │   └── LocalProjectKanban.tsx       # → CouncilKanbanContainer
│   │       └── shared/
│   │           ├── hooks/council/       # NEW: React Query hooks
│   │           │   ├── useCouncilProjects.ts
│   │           │   ├── useCouncilWorkItems.ts
│   │           │   ├── useCouncilWorkflowRuns.ts
│   │           │   └── useCouncilReviews.ts
│   │           └── lib/
│   │               └── councilApiTransport.ts  # NEW: API transport
│   └── ui/                 # VK UI components (KanbanBoard, Card, etc.)
├── shared/
│   ├── council-types.ts    # NEW: types matching your schema
│   ├── remote-types.ts     # VK generated types (kept for VK components)
│   └── jwt.ts              # Stubbed (no auth)
├── pnpm-workspace.yaml
└── package.json
```

## API Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/projects` | List all projects |
| GET | `/v1/work-items` | List all work items (filtered client-side by `project_id`) |
| GET | `/v1/work-items/{id}` | Fetch single work item (for revision) |
| POST | `/v1/work-items` | Create work item |
| PATCH | `/v1/work-items/{id}` | Update work item (requires `{ patch: {}, expected_revision: N }`) |
| GET | `/v1/workflow-runs` | List workflow runs |
| GET | `/v1/reviews` | List reviews |

## TODO (Phase 2)

- [ ] Issue detail panel (workflow runs, reviews, knowledge cards)
- [ ] Create work item dialog
- [ ] WebSocket real-time (replace polling)
- [ ] Workspace/agent execution views
- [ ] Tag management UI
- [ ] Sub-issue support (parent_id)
