Shipwright brief from Keel. Repo checked out on branch feat/saturation-comercio-tips from origin/main (post-#46, tip construction already on main). One PR. Do NOT merge. Cristian merges.

GOAL
Wire saturation / comercio 10s tips into the mission diary "Esto, ahora" (session-desk), scoped to the active island focus from #45, coexisting with the construction tip from #46.

PRODUCT (Decisiones comercio)
- Campaign home / diary = one tip ~10s for already-seen overflow / red only: Spanish copy like existing HOME_SATURATED_TIP_LINE ("Vendé lo que ya producís. Frená.") — sell what you already produce / brake. No traders, prices, grids, or "sell X to Y".
- Tip by active island: if stock/umbral saturated OR known red signal → short ES tip scoped with scopeEstoAhoraLine. If no signal / pulseHint unknown → silent/null, never invent.
- FileDB trade routes MUST NOT be emitted or faked. Wiki / Taller Comercio only as opt-in chip or text link-out (existing "Ver taller" is fine). Never a Home goods grid.
- Priority on Esto, ahora (document clearly in code comments):
  1) urgent campaign tip family coins OR brake (esto-ahora)
  2) saturation tip (HOME_SATURATED_TIP_LINE via useHomeSaturatedTip / pickHomeSaturatedTip)
  3) construction tip (constructionTipLine)
  4) other campaign tip / mission checklist / idle
- Home never shows chains, nextBuild, building counts grids (#37).

IMPLEMENT
1. Reuse src/lib/home-saturated-tip.ts and src/components/home-saturated-tip.tsx (useHomeSaturatedTip). Do not invent new trade-route logic.
2. Wire into src/components/session-desk.tsx with the priority order above. Mark saturated tip with data-home-saturated-tip (and keep data-construction-tip when that wins).
3. Keep Welcome() in harbor-app.tsx working (already uses saturated tip). Align priority if Welcome also needs construction tip only when no saturation — Welcome may stay as-is if tests require only saturated there.
4. Update isolation tests that currently ban HOME_SATURATED_TIP_ / useHomeSaturatedTip outside harbor-app + home-saturated-tip.tsx so session-desk.tsx is also allowed. Add tests for: priority order, silent when unknown, no tradeRoute/FileDB invent, island scope via scopeEstoAhoraLine, Home isolation (no goods grid on desk).
5. Register any new test file in package.json "test" script like construction-tip.test.ts.

HARD NO
- Lua, DLL, inject, write .a7s, overlay
- Invent tradeRoutes / NPC names / CityName
- NiHoel calc or nextBuild / chains on Home
- Merge to main
- Commit .vercel/output or node_modules

DoD
- Tests for saturation tip + Home isolation pass
- Push branch feat/saturation-comercio-tips
- gh pr create against main — title roughly: feat: saturation comercio tips on Esto, ahora
- Print the PR URL clearly at the end. Do not merge.

HOOKS
- src/lib/home-saturated-tip.ts (HOME_SATURATED_TIP_LINE, pickHomeSaturatedTip, homeWorkshopSaturated)
- src/components/home-saturated-tip.tsx (useHomeSaturatedTip)
- src/components/session-desk.tsx (construction tip + campaign tip today)
- src/components/harbor-app.tsx Welcome() already shows saturated tip
- src/lib/taller-home-comercio.test.ts and src/lib/home-saturated-tip.test.ts — update permit lists
- src/lib/construction-tip.ts
- src/lib/island-focus.ts

Investigate first, implement, test, commit, push, open PR. Do the full job without asking me to resend the brief.
