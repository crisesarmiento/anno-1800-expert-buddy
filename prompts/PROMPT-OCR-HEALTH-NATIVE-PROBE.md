Shipwright brief from Keel. Branch feat/ocr-health-native-probe from origin/main (6df5498). ONE PR. Do NOT merge. Cristian merges.
Claude first; if session/credit limit, stop and leave a clear note — Keel will re-run with Grok.

MANDATORY ORDER (same PR)
1) Contract: types + schema + validate + fixture + docs (native-telemetry.md, harbor-live-fields.md)
2) Watcher public/watch-harbor-live.ps1 + npm run pack:mod
   - IMPORTANT: only regenerate public/watch-harbor-live.bat via `npm run pack:mod` (scripts/pack-mod.mjs embeds the ps1). Do NOT hand-edit the .bat. If pack:mod fails, stop and report.
3) UI /taller + /instalar consuming the fixed shape — do not invent another shape

READ FIRST: AGENTS.md, AGENTS.project.md, docs/harbor-live-fields.md, docs/harbor-live.schema.json, docs/native-telemetry.md, docs/filedb-spike-routes.md, src/lib/live/types.ts, src/lib/live/validate.ts, src/lib/native-production.ts, src/components/native-production-card.tsx, public/watch-harbor-live.ps1 (OCR sections).

## Contract

### connection.native (role unchanged)
Last **valid** OCR observation. Do NOT clear on disconnect.

### connection.nativeProbe (NEW, optional)
{
  provider: "ux-enhancer-ocr",
  state: "reachable" | "unreachable" | "invalid_response",
  lastProbeAt: ISO,
  lastSuccessAt?: ISO,
  reason?: "timeout" | "connection_refused" | "bad_payload"
}
- Technical probe facts only.
- NOT: missing|starting|connected|stale|wrong_view
- NOT: hintEs, local paths, stacktraces, raw Windows messages
- Compat: old JSON without nativeProbe remains valid

### production metrics
Add buildingCountObservedAt?: ISO (or clear homologue) so Finance freshness is independent of Production (telemetry.production[].observedAt).

### Stale = UI ONLY
Pure function with injectable `now`:
- stale if last relevant save is after the OCR sample (Production or Finance) + small tolerance; OR fallback **15 minutes**
- Show age only on /taller, neutral tone
- Home: zero OCR diagnostics

### Preserve evidence
If OCR drops: update nativeProbe; keep reading saves; **keep** connection.native + telemetry.production; UI marks historical.

### Screen guidance
reachable + view population/unknown → UI copy: «Servidor conectado · abrí Producción y Finanzas» / «No pude reconocer la pestaña». Do NOT put wrong_view in evidence.

### Copy
unreachable → «Servidor OCR no detectado» (NEVER «no está instalado»). No `starting` unless real launcher+timestamp signal (do not infer from TCP alone).

### JSON writes
Probe ~4s OK; rewrite harbor-live only if state changes, useful observation arrives, or heartbeat 30–60s. Identical same failure → no rewrite.

## UI
- /taller NativeProductionCard: seal from nativeProbe + derived freshness; Confirmed/Observed/Inferred labels
- /instalar: enums→i18n, link to UXEnhancer release, no auto-download
- Home isolation test (no OCR diag)

## HARD NO
inject, write .a7s, memory reading claims, redistribute UXEnhancer binary, FileDB emit extras, route throughput invent, auth/DB, OCR panel on Home, merge to main, hand-edit .bat

## DoD tests
- legacy JSON without nativeProbe validates
- first run without OCR success
- reachable + population/unknown
- disconnect keeps evidence
- Prod vs Finance timestamps independent
- stale deterministic with injectable now
- no rewrite every 4s on identical failure
- Home without OCR diag
- taller/instalar translate enums
+ npm test, typecheck, lint, build, PS1 parse check, bat regenerated via pack:mod, UI desk+mobile sanity

Push branch; gh pr create against main; print PR URL. Do not merge.

Investigate, implement in the mandatory order, test, commit, push, open PR. Full job without asking to resend.
