Repo: crisesarmiento/anno-1800-expert-buddy.
You are on branch feat/watcher-counts-log from origin/main (ad8ffdc). Open ONE PR against main. Do not merge. Cristian merges.

Harbor Studio: Signal techo — read-only .a7s → harbor-live.json. Never write .a7s. Never Lua/DLL/inject. dump_live.lua stays out of zip. Home/diario must NEVER paint building counts grids, chains, or nextBuild.

Implement ALL three in this PR:

## 1) Building counts
CountsPerGUID already parsed in src/lib/live/a7s-snapshot.ts (SaveScan.buildingCounts has count) but namedHits() strips to {id,name}. Same for public/a7s-scan.cs and public/watch-harbor-live.ps1.
- Extend docs/harbor-live.schema.json + types + validate: telemetry.buildings items may include optional count (integer > 0).
- Emit count from TS snapshot, C# scan, and PS1.
- Update docs/harbor-live-fields.md.
- Tests: count preserved; presence-only JSON still validates.

## 2) Fix pulseHint.coins delta
money scanned from StrgLrg but not written → PS1 prev.money fails → coins almost always unknown.
- Persist last money for delta only (sidecar next to harbor-live.json OR optional field UI never paints as number on Home).
- up/down only on real delta; unknown if missing; never guess. unknown must not paint Monedas red.
- Tests for delta + negative balance.

## 3) Vigilante console log
Today: `HH:mm:ss Autosave -> 21 edificios / N bienes` with no names (watch-harbor-live.ps1 ~line 368).
- Summary line: counts + pulseHint coins/houses.
- Names line: top building names (ES if catalog has them), max ~8–12 then `+K más`. With count: `pescadería×2, mercado×1`.
- Optional goods: top stock by amount, max ~6.
- No full GUID dump. Spanish messages.

OUT OF SCOPE: Taller seed chip, cadenas UI tips, FileDB trade routes.

At end: commit, push, gh pr create. List files + leftover.
