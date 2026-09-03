# Anno 1800 Buddy

A Vite + TanStack Start companion for **Anno 1800**. Keep it next to the game, tap where you are in the campaign, and get the next ten minutes: a 10×10 city stamp, where the new building goes, how not to go broke, and who not to fight.

Not a min-max spreadsheet. Default is **spoilers off**. Tagline: *bastante bien, lindo, terminá la historia.*

`/taller` is an opt-in workbench (not Home): one **Alcanza / No alcanza** stamp from **static versioned wiki ratios** (`wiki-v1-2026-09`, [Production chains](https://anno1800.fandom.com/wiki/Production_chains), CC-BY-SA) times the live snapshot fields that already exist (balance, saturation/workforce, session buildings). Method inspired by [NiHoel/Anno1800Calculator](https://github.com/NiHoel/Anno1800Calculator) (**MIT except `params.js`**). This app does **not** copy `params.js` (Ubisoft game assets). Not a factory simulator, goods grid, or t/min hero.

[github.com/crisesarmiento/anno-1800-expert-buddy](https://github.com/crisesarmiento/anno-1800-expert-buddy)

## Why it exists

The game's campaign is easier when someone on the sofa tells you one next step instead of a wiki dump. This app is that voice on a **second monitor** (tab or PWA): Spanish-first (UI also in English, Italian, and German), one mission at a time, calm modes when the ticker is red or you are overloaded. Not an overlay and not click-through on the game.

## Local-first data and privacy

Campaign progress, desk checks, stamps, pulse, and last session live in **this browser only** (`localStorage` under `hb-session:` / `harbor-buddy-es`). No accounts. Auth and a remote database are **off** (`VITE_AUTH_ENABLED=false`). No `.env` and no `DATABASE_URL` for the companion itself.

The desk restores on cold start without waiting on a network. Chat without a live radio shows `radio apagada — usá la lista` and keeps using the local list. Clearing site data or switching origin wipes progress. Nothing is synced across devices.

Optional Windows live diary (`harbor-live.json`) is a local file you drop or paste. The browser never reads `Documentos\Anno 1800` on its own and never parses `.a7s` saves.

## Status

Playable companion: campaign rail, session desk (next step / do-don't / checks), city stamps, island pulse, calm modes (*Estoy saturado*, *Monedas en rojo*), Spanish buddy chat, HUD screenshot paste for one next step, and `/tablero` as a secondary presence view.

Optional extras on Windows: install page (`/instalar`), connect page (`/conectar`), and a save watcher that writes `harbor-live.json`. The in-game pack does **not** run Lua (that crashes Anno); the watcher reads the latest save instead. Hard ceiling: `docs/telemetry-ceiling.md` — read-only on `.a7s`, no Lua/DLL/Python inject; the telemetry zip is a stub and is not required for the watcher.

`package.json` still names the Grok export (`app-builder-workspace`). That is not the product name.

## Prerequisites

- **Node.js 22** (the sandbox/export contract; no `engines` field in `package.json`)
- **npm** (this repo ships `package-lock.json`)

## Install

```bash
git clone https://github.com/crisesarmiento/anno-1800-expert-buddy.git
cd anno-1800-expert-buddy
npm install
```

## Develop

```bash
npm run dev
```

Vite listens on **`0.0.0.0:8080`** (`strictPort`). Open http://127.0.0.1:8080/

`npm run dev` packs the telemetry zip (`scripts/pack-mod.mjs`) then starts Vite through `scripts/with-app-env.mjs`.

Useful extras (not required to run the app):

```bash
npm test
npm run typecheck
npm run lint
```

## Production build

```bash
npm run build
npm run preview
```

`npm run build` packs the mod zip, runs `vite build`, then `npm run db:migrate`. With no `DATABASE_URL`, migrate **skips** (local/preview). Nitro's production preview is **`127.0.0.1:8081`**.

Do not use `vite` / `npx vite` directly — env flags (`VITE_AUTH_ENABLED`) only load through the npm scripts.

## Limitations

- Unofficial fan companion. Anno 1800 is Ubisoft; this is not affiliated.
- Second-monitor tab/PWA only — never an overlay, never always-on-top, never click-through on Anno. First monitor / Ctrl+G stays the game. See `docs/second-screen.md`.
- Mission titles stay in Spanish to match the in-game journal.
- Screenshot HUD advice is a local server function. Offline chat does not invent a vision call.
- `scripts/preview.mjs stop|restart` is a Linux sandbox helper for port 8081, not a macOS/Windows workflow.
- `AGENTS.md` and `.grok/` are the Grok App Builder contract, not player docs.

## License

Source is Cristian Sarmiento's. Anno 1800 is Ubisoft. Unofficial fan companion, not affiliated with Ubisoft.
