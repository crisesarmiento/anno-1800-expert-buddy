Shipwright brief from Keel. Branch feat/pulse-island-install-clarity from origin/main (post-#47, HEAD f93ffe5). One PR preferred; a second PR only if the installer split is cleaner. Do NOT merge. Cristian merges.

GOAL
Clean pulseHint (no false red), clearer multi-island Home 10s tip, friendlier vigilante installer copy. Spanish UI.

1) pulseHint — no false Monedas rojo / Saturado
- If signal is unclear → pulseHint coins/houses = "unknown". Never guess "down" or "empty".
- unknown must NOT paint Monedas rojo or Saturado on the desk (deskCalmUmbral / apply path).
- Coins delta only when previous money is a real reading (sidecar harbor-live.money.json / #35 path). Keep coinsHint(money, previousMoney) contract: null/prev-null/same → unknown; do not invent down.
- Houses: ok | yellow | empty ONLY with a clear presence signal. If the scan cannot tell (no usable residence/market evidence vs truly empty), prefer "unknown" over guessing empty when the save/scan is incomplete — update housesHint + Get-HousesPulse in public/watch-harbor-live.ps1 AND the bundled .bat to stay in sync. Add/adjust tests in src/lib/live/a7s-snapshot.test.ts and scripts/watcher-pulse-hint.test.mjs.
- Align deskCalmUmbral so pulse.coins/houses === "unknown" never sets rojo/not-enough/saturado from live (calm === broke/overwhelmed still ok as player opt-in).

2) Multi-isla clarity on Home (10s)
- Focused island (#45) must clearly label «Esto, ahora» via scopeEstoAhoraLine (already). Keep one tip line, never a stack of tip chips.
- Never invent NPC / other-player islands or FileDB CityName/routes on Home (Studio veto — emit later, Taller-only).
- If there is no useful focus / live islands: calm idle (ESTO_AHORA_IDLE or similar), not a fake island list. Prefer improving resolve/focus UX without inventing names — seed/manual La Inapetente fallback already exists; do not pull live CityName yet.

3) Instalador vigilante friendlier ES
- Touch public/install-harbor-buddy.ps1 (+ .bat), public/watch-harbor-live.ps1 (+ .bat as needed), and/or src/components/install-panel.tsx + i18n install strings.
- Copy: watcher + harbor-live folder only; suggest Documents\Anno 1800\accounts by mtime (scripts/suggest-latest-a7s.mjs contract); never blind-open a random path; crash-safe write already required (tmp→fsync→rename) — keep it.
- No Steam auto-F5 unless already opted. Never DLL / Lua / inject / write .a7s.

STUDIO VETOS
- No FileDB routes/CityName on Home
- No traders / vendé X a Y / goods grid on diary
- No calc on Home

DoD
- Tests: unknown → no false red; island scope still labels focused colony; install copy assertions if install scripts/UI touched
- Register new tests in package.json if needed
- Push branch; gh pr create against main; print PR URL(s). Do not merge.

HOOKS
- src/lib/live/a7s-snapshot.ts (coinsHint, housesHint, pulseHintFromScan)
- src/lib/live/apply.ts, validate.ts
- src/lib/session-desk.ts (deskCalmUmbral)
- src/components/session-desk.tsx, island-focus.ts
- public/watch-harbor-live.ps1|.bat, public/install-harbor-buddy.ps1|.bat
- scripts/watcher-pulse-hint.test.mjs, watcher-money-delta.test.mjs, suggest-latest-a7s.mjs
- src/lib/i18n.ts install.* , src/components/install-panel.tsx

Investigate first, implement, test, commit, push, open PR. Full job without asking to resend the brief.
