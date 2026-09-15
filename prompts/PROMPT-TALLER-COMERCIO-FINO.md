Shipwright brief from Keel. Branch feat/taller-comercio-fino from origin/main (post-#48, HEAD 0eb59b1). One PR. Do NOT merge. Cristian merges.

GOAL
Comercio / saturación **solo en Taller** (`/taller`): falta / alcanza / saturado per already-seen chain or good. Home already has the 10s tip (#47) — do NOT duplicate a goods grid on Home/diary.

IMPLEMENT
1. Evolve `src/components/taller-goods-balance.tsx` + `src/lib/workshop-balance.ts` (and taller-bench as needed):
   - Reuse `src/lib/sim/` + save-count chip path (#42 / Usar conteos) when building counts exist.
   - If no counts: honest empty state or prompt to manual seed — never invent inventory from the vigilante alone.
   - Campaign: gate to chapter-seen / already-seen goods only. Sandbox: full goods list OK.
   - UI texture: Stamp / Taller paper-ink — NOT diary cream, NOT expedition `hero-orla` on the bienes card (fix the current `hero-orla` on TallerGoodsBalance).
   - Goods icons OK in Ciudad/Taller only.
   - Optional chip/link «Comercio» inside Taller pointing wiki and/or NiHoel out (TALLER_WIKI / TALLER_NIHOEL already on bench). Never on Home.
   - Copy ES: expand «vendé lo que ya producís / frená» as Taller detail when saturado (HOME_SATURATED_TIP_LINE spirit). No traders, no «vendé X a Y», no fake FileDB routes.

2. Isolation: Home/session-desk/harbor Welcome must stay free of goods grids, counts, calc. Strengthen `taller-home-comercio.test.ts` if needed.

3. Fix mojibake in taller copy if you touch those strings (e.g. "almacén", middots).

HARD NO
- Home diary grids / counts / calc / NiHoel on Home
- FileDB CityName/routes emit (still later)
- Lua / inject / write .a7s / overlay
- Merge to main
- Commit node_modules / .vercel/output

DoD
- Tests: Taller shows seen-good statuses; Home isolation unchanged/stronger; campaign gate vs sandbox; no invent when no counts
- Register new tests in package.json if added
- Push branch feat/taller-comercio-fino; gh pr create against main; print PR URL. Do not merge.

HOOKS
- src/components/taller-goods-balance.tsx, taller-bench.tsx, taller-city.tsx
- src/lib/workshop-balance.ts, taller-threshold.ts, home-saturated-tip.ts (copy only)
- src/lib/sim/ (compute, parseCitySeed, save-count*)
- src/lib/taller-home-comercio.test.ts, workshop-balance.test.ts
- Stamp components (not hero-orla for bienes)

Investigate first, implement, test, commit, push, open PR. Full job without asking to resend the brief.
