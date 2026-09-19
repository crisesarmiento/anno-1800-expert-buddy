Shipwright brief from Keel. Branch codex/inicio-editorial from origin/main (6df950d, post-#54). ONE PR. Do NOT merge. Cristian merges.
Prefer completing the WIP already in the working tree. Do NOT rewrite harbor-live schema or watcher. Do NOT hand-edit watch-harbor-live.bat.

## Already started (untracked / partial) — finish these, do not discard
- src/lib/home-priorities.ts + home-priorities.test.ts
- src/lib/editorial-copy.ts
- src/components/editorial-home.tsx
- src/components/harbor-navigation.tsx
- src/routes/diario.tsx
- screenshots/, public/images/, docs/fixtures/ if useful

## Goal
Visual option 1 as real UI: clear paper, blue ink, brass. `/` = operational summary (Inicio). Current campaign diary moves to `/diario`. Nav: Inicio, Producción (`/taller`), Rutas (`/rutas`), Diario. Connect/install in secondary menu.

## 1-monitor (Cristian)
Single monitor: Anno fullscreen + Harbor in background, alt-tab. NO overlay, NO always-on-top, NO key hijack.
Inicio = 3–5s glance: max 3 issues, conclusion first, evidence/age one line, no technical noise. Controls ≥44px. Mobile-first column OK for narrow window. Do not assume a second screen.

## Priorities (pure lib + tests)
Reuse existing analyzers. NO schema/watcher changes.
Category order: (1) structural route failures (2) inferred production shortfall (3) inferred production excess (4) global stock drop.
Within: analyzer order + stable tie-break.
Production = inferred; require demand+productivity+catalog+count same island + fresh OCR samples (current freshness: save vs sample + 15m). Historical: do not say "build/pause now"; say which screen to open.
Stock changes = global, dedupe by good, NOT proven route causality.
Separate dates: save / OCR / connection. Never use JSON mtime as observation or "connected"=fresh.
Honest empty/partial/no-alerts copies.

## UI
Cover: title, discreet sources, priorities left, production summary right, Diary below. Mobile: one column. Decorative original CSS/SVG from repo only — no filler phrases, no fake numbers, no Astra mock pasted as UI.
Links to relevant route/section. Technical diag only on install/detail pages.

## Docs
Rewrite README EN. Update AGENTS.project.md: Inicio=ops summary; Diario=campaign; diag separate. Use existing i18n patterns for new strings (editorial-copy OK if consistent). Real app screenshots (label demo if sample data).

## Wire-up checklist
1. `/` renders EditorialHome (not HarborApp campaign desk)
2. `/diario` renders the previous campaign diary (HarborApp)
3. HarborNavigation in editorial chrome; connect/install under More
4. Register home-priorities (+ editorial isolation) tests in package.json
5. Isolation: Inicio can summarize priorities; Diario has ZERO OCR technical panel
6. Preserve local installer mod if present; no CRLF-only noise; no unrelated catalog churn

## Hard NO
inject, write .a7s, memory, overlay, auth/DB, invent throughput, OCR panel on Diario, change harbor-live schema/watcher, merge to main.

## DoD
npm test, typecheck, lint, build; isolation tests; desk+mobile no overflow/console errors; push branch; gh pr create against main; print PR URL.

Investigate WIP first, finish it, test, commit, push, open PR. Full job without asking to resend.
