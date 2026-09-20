# Anno 1800 Expert Buddy — project context

Read this file before changing the product. It records the current telemetry contract and the
player-facing decisions that must survive future work.

## Product goal

This is a calm, Spanish-first companion for a personal Anno 1800 campaign. Its main job is to
detect production imbalance, help review trade routes, and suggest what to review next with as
little manual setup as practical.

- `/` (Inicio) is the operational summary: a 3–5 second glance, at most three issues, conclusion
  first. `/diario` is the campaign diary. Sandbox remains separate.
- One-monitor use is first-class: Anno fullscreen, Harbor in the background, alt-tab. Do not build
  an overlay, always-on-top window, inject into Anno, automate keys, or modify saves.
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
- Player cash is optional `economy.treasury` (GUID 1010017, participant 0). Recurrent income/maintenance are not published until owner-scoped. The money sidecar only feeds `pulseHint.coins`.
- `islandName` / `telemetry.islands` are session/region. Player colonies live in optional `islandSnapshots[]` (region + area). OCR auto-associates only when that identity is unique.

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
- Island names on stops come from `islandSnapshots` via `areaId`. Ship names come from
  `VehicleName` joined by `TradeRouteID`. Missing names stay unnamed.
- `IsLoading` is published only when present (`true` load, `false` unload). An omitted field is
  unknown — do not default it to load.
- `delivery` is a compact summary of finalized `TradeRouteEntries` (visit count, median |amount|,
  last signed amount, median `ExecutionTime` interval). Configured quantity, realized delivery and
  inferred t/min stay separate. Nominal ship capacity is unknown.
- A configured route without observed deliveries is not guaranteed supply. Partial loads do not
  become full-warehouse claims.
- `telemetry.goodsChanges` compares global stock across two distinct saves from the same session.
- A route gets an observational stock warning only when a carried good drops by at least 5 units
  and 10 percent. Structural failures always take priority.
- Global stock correlation does **not** establish direction, throughput, travel time, loading,
  unloading, or causality. Production, consumption, and other routes can cause the same change.
- Stage 3 transport scenarios take an explicit manual t/min. Observed deliveries may be shown as a
  hint; they are never auto-filled as real throughput.

See `docs/filedb-spike-routes.md` and `docs/harbor-live-fields.md`.

## Sources of truth

- Evidence matrix (origin, owner, unit, date, availability, validation): `docs/evidence-matrix.md`
- JSON schema: `docs/harbor-live.schema.json`
- TypeScript contract: `src/lib/live/types.ts`
- Untrusted-input normalization: `src/lib/live/validate.ts`
- Save/OCR writer: `public/watch-harbor-live.ps1` (Windows). `src/lib/live/a7s-snapshot.ts` is a research util, not the Windows writer.
- Honesty helpers: `src/lib/live/evidence.ts`
- Local campaign history (IndexedDB, not the shared JSON): `src/lib/history`
- Production analysis: `src/lib/native-production.ts`
- Produce-or-import scenarios (pure, inferred): `src/lib/scenario/`
- Catalog figures (source/unit/DLC): `src/lib/sim/catalog-figures.ts`
- Route analysis: `src/lib/trade-route-health.ts`, `src/lib/trade-route-logistics.ts`
- Production UI: `src/components/native-production-card.tsx`
- Scenario UI: `src/components/taller-scenario.tsx`
- Route UI: `src/components/trade-routes.tsx`

Update schema, types, validation, fixtures, documentation, and tests together when the contract
changes.

## UI boundaries

- `/` (Inicio) is an operational summary: at most three priorities, conclusion first, evidence and
  age on one line. It may summarize inferred production and confirmed route issues. It must not
  mount the OCR technical panel (`NativeProductionCard`).
- `/diario` is the campaign diary (`HarborApp`). Zero OCR technical panel, no production grids, no
  route diagnostics.
- Detailed production belongs in `/taller`.
- Detailed route evidence belongs in `/rutas`.
- Connect and install diagnostics belong in `/conectar` and `/instalar`, under Más — not in the
  primary glance.
- Show timestamps and scope (global save vs selected island) next to evidence. Keep save, OCR, and
  connection dates separate. Never treat JSON mtime or "connected" as a fresh observation.
- Keep desktop and 390 px mobile layouts usable with no horizontal overflow. Inicio is a
  mobile-first column for a narrow window beside the game. Controls are at least 44 px.
- Never use Ubisoft-owned artwork; retain the paper/ink visual language. Inicio uses clear paper,
  blue ink, and brass.

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
3. Etapa 5: misiones verificadas (instancia, progreso, temporizador) o fallback manual rotulado.
4. More catalog mappings, each backed by a known GUID and production rate. Per-building construction still missing for most chain links. Nominal ship cargo capacity is still unread.

Do not pursue automatic route clicking, memory hooks, save mutation, or claims of real route
throughput unless a new trustworthy data source is first demonstrated and documented.
