# DecisionTrail web app

React + TypeScript front end for DecisionTrail. It talks only to the local
DecisionTrail API (`/api/*`); every number and decision it shows comes from there.

## Development

Two terminals, both from the repository root:

```bash
# 1. the API on http://127.0.0.1:8765
decisiontrail serve

# 2. the web app on http://localhost:5173 (proxies /api to the API)
cd web
npm install
npm run dev
```

Set `DECISIONTRAIL_API=http://host:port` before `npm run dev` to proxy to an API
somewhere else. If the API is not running, app pages show a "Start the backend"
screen instead of data.

Extraction needs Ollama running locally with `qwen2.5:7b-instruct` pulled. The
status in the top bar says whether the API, Ollama and the model are ready.

## Production

```bash
cd web
npm run build          # type-checks, then writes web/dist
cd ..
decisiontrail serve    # serves the API and web/dist on http://127.0.0.1:8765
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with the `/api` proxy |
| `npm run build` | `tsc -b` then `vite build` into `dist/` |
| `npm run preview` | Serve the built `dist/` (also proxies `/api`) |
| `npm run typecheck` | TypeScript only |

## Layout

```
src/
  api/          types.ts (the API contract), client.ts, hooks.ts, backend-status.tsx
  components/
    ui/         primitives: Button, Input, Badge, Panel, Tabs, Dialog, Menu, StatTile, ...
    decision/   StatusBadge, VerifiedQuote, CodeRef, DecisionRow, SourceLink
    layout/     AppShell, Sidebar, TopBar, PageHeader, BackendOffline
  lib/          cn, format, theme, collections, routes, status, chart
  pages/        one file per route
  styles/       tokens.css (theme colours), globals.css
```

Theme colours are CSS variables in `src/styles/tokens.css`, exposed to Tailwind
as `bg-surface`, `text-fg-muted`, `border-line`, `text-accepted` and so on.
Use those names instead of raw colours so both themes keep working.
