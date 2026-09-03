# Segundo monitor — nunca overlay

Anno 1800 Buddy is a **second-monitor companion**: a browser tab or installed PWA you park next to the game. It is not an overlay, not a HUD, not always-on-top, and not click-through on Anno.

There is **no native overlay window**. Do not add one.

## Layout

- Play Anno on the first monitor (fullscreen, borderless, or Ctrl+G). Harbor must not steal that screen.
- Open this app on the second monitor, or split with Win + Left / Right if you only have one.
- `html[data-surface="second-screen"]` is an opaque paper document (`pointer-events: auto`). Root is never transparent and never `pointer-events: none`.
- PWA `display` is `standalone` (tab/window). Not `overlay`, not exclusive fullscreen on boot.

## Calm

Rojo / Saturado stay desk stamps in this window. They do not punch through the game.

## One line

Each island already seen this save is one line. The session is one line: save name · Spanish diary title (`Una chispa que vuelve`, not wiki-English).

## Live JSON

`harbor-live.json` is **opt-in** (drop, paste, or watch). The browser never reads `Documentos\Anno 1800` on its own.

Watch ticks **fail silent**: a truncated or invalid write keeps the last good snapshot and does not banner. Explicit drop/paste may still explain a bad file inside this window only.
