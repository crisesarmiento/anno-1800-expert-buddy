Shipwright brief from Keel. Repo is already checked out. Branch feat/island-construction-tip is checked out from origin/main (fb7ffc4). One PR. Do NOT merge. Cristian merges.

GOAL
Add a construction/layout tip of at most about 10 seconds (max ~140 chars) on the Home diary card titled "Esto, ahora", scoped to the active island from PR #45 island focus.

PRODUCT
- Vibe: Taka modular / blueprints first. Use the 10x10 stamp idea. Gardens optional. Roads connect. Permission-giving. Aesthetic over packing.
- Spanish UI copy.
- Paper/ink desk feel, not a brass CTA, not Ubisoft HUD.
- Scope the tip line with the island name using existing scopeEstoAhoraLine / resolveIslandFocusId from src/lib/island-focus.ts.
- If no useful island/live signal: calm generic tip or stay silent. Never invent island names or trade routes.
- Reuse src/lib/data/layouts.ts (block-10, first-city, etc.) and/or campaign-tips patterns. Do NOT put wiki ratios or nextBuild chains on Home.

IMPLEMENT
1. Add something like src/lib/construction-tip.ts (or carefully extend campaign-tips) that returns one short construction/layout line for the focused island id.
2. Wire it into src/components/session-desk.tsx so the diary shows it for the active island. Prefer showing construction tip when there is no urgent coins/brake campaign tip.
3. Campaign-safe: no spoiler buildings not yet seen if you gate on live/mission signals.
4. Home must NOT paint building counts, grids, chains, or perfect mode (already banned in #37).

HARD NO
- Lua, DLL, inject, write .a7s, overlay
- Invent CityName or trade routes
- NiHoel / perfect ratios / nextBuild on the diary
- Merge to main
- Commit .vercel/output or node_modules

DOD
- Tests: tip scoped to active island; changes when island focus changes; length capped; no wiki ratios; calm degrade when needed
- New/changed node tests pass
- Push branch feat/island-construction-tip
- gh pr create against main with a clear body
- Print the PR URL clearly at the end

EXISTING HOOKS
- src/lib/island-focus.ts
- src/components/session-desk.tsx (Esto, ahora + IslandFocusChips + pickCampaignTip)
- src/lib/campaign-tips.ts (tenSecondLine, live families)
- src/lib/data/layouts.ts
- Fixture island La Inapetente in src/lib/sim/fixtures/campaign-ch1.json

Investigate first, then implement, test, commit, push, open PR. Do the full job without asking me to resend the brief.