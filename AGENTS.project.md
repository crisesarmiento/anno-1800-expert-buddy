# Anno 1800 Expert Buddy — project context

Read this file before changing the product. It records the current telemetry contract and the
player-facing decisions that must survive future work.

## Product goal

This is a calm, Spanish-first second-screen companion for a personal Anno 1800 campaign. Its main
job is to detect production imbalance, help review trade routes, and suggest what to build or pause
with as little manual setup as practical.

- Campaign is the primary mode; Sandbox remains separate.
- Keep the game on the first monitor. Do not build an overlay, inject into Anno, automate keys, or
  modify saves.
- Prefer one actionable conclusion over dashboards full of numbers.
- Authentication and a database are not product requirements.

## Evidence language is non-negotiable

Every claim shown to the player must be identifiable as one of these:

- **Confirmed:** read directly from a save or an explicit OCR field.
- **Observed:** a timestamped screen/sample or a change between saves.
- **Inferred:** a conservative recommendation calculated from confirmed/observed inputs.

Never present an inference as live game state. When evidence is incomplete, say what the player
must open or save next instead of guessing.

## Current data paths

### Save reader

- `public/watch-harbor-live.ps1` reads the newest local `.a7s` or Ubisoft Cloud `.save` read-only.
- It writes `harbor-live.json` crash-safely and never writes to the save.
- The browser reads the JSON through the explicitly selected file handle.
- The contract remains `harbor-live-v1`; new fields should stay optional and backward compatible.

### Optional production OCR

- The optional provider is Anno1800UXEnhancer `Server.exe`.
- Harbor Buddy only polls `http://127.0.0.1:8000/AnnoServer/Population`.
- This is screen capture/OCR, not memory access or a Ubisoft API.
- Production supplies demand (`limit`) and productivity (`percentBoost`); Finance supplies factory
  count (`existingBuildings`) for the selected island.
- Advise build/pause only when island demand, productivity, factory count, and a known catalog rate
  are all present.
- The external binary is not downloaded or redistributed automatically. Its public release is old
  enough to treat compatibility with later game updates as experimental.

See `docs/native-telemetry.md`.

### Trade routes

- Routes come from `SessionTradeRouteManager/RouteMap` in the save.
- Only player routes (`ownerId = 0`) reach the UI.
- Confirmed structural failures are: no assigned ship, fewer than two stops, or no configured goods.
- `telemetry.goodsChanges` compares global stock across two distinct saves from the same session.
- A route gets an observational stock warning only when a carried good drops by at least 5 units
  and 10 percent. Structural failures always take priority.
- Global stock correlation does **not** establish direction, throughput, travel time, loading,
  unloading, or causality. Production, consumption, and other routes can cause the same change.

See `docs/filedb-spike-routes.md` and `docs/harbor-live-fields.md`.

## Sources of truth

- JSON schema: `docs/harbor-live.schema.json`
- TypeScript contract: `src/lib/live/types.ts`
- Untrusted-input normalization: `src/lib/live/validate.ts`
- Save/OCR writer: `public/watch-harbor-live.ps1`
- Production analysis: `src/lib/native-production.ts`
- Route analysis: `src/lib/trade-route-health.ts`
- Production UI: `src/components/native-production-card.tsx`
- Route UI: `src/components/trade-routes.tsx`

Update schema, types, validation, fixtures, documentation, and tests together when the contract
changes.

## UI boundaries

- Home/Diario stays calm and campaign-focused; do not add production grids or route diagnostics
  there.
- Detailed production belongs in `/taller`.
- Detailed route evidence belongs in `/rutas`.
- Show timestamps and scope (global save vs selected island) next to evidence.
- Keep desktop and 390 px mobile layouts usable with no horizontal overflow.
- Never use Ubisoft-owned artwork; retain the paper/ink visual language.

## Generated files and packaging

- Edit `public/watch-harbor-live.ps1`, then run `npm run pack:mod` to regenerate the standalone
  `public/watch-harbor-live.bat` and telemetry package.
- Do not hand-edit the generated `.bat`.
- `npm run dev` and `npm run build` also run the pack step and can touch generated files or line
  endings. Do not commit unrelated CRLF-only churn in catalogs, installer scripts, or
  `src/routeTree.gen.ts`.

## Required verification

For telemetry or UI changes, run:

```text
npm test
npm run typecheck
npm run lint
npm run build
```

Also parse the PowerShell source, verify the bundled watcher contains the new fields, and inspect
`/taller` or `/rutas` in a real browser on desktop and mobile. Existing lint warnings are not a
reason to add new warnings.

## Good next steps

Prefer improvements that strengthen evidence without increasing setup:

1. Installation/health diagnostics for the optional OCR server.
2. Evidence freshness and per-island capture guidance.
3. Longer save-to-save history with explicit global-stock scope.
4. More catalog mappings, each backed by a known GUID and production rate.

Do not pursue automatic route clicking, memory hooks, save mutation, or claims of real route
throughput unless a new trustworthy data source is first demonstrated and documented.
