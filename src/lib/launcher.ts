/**
 * Optional Windows launcher: Steam + watcher + this page. /instalar only.
 * Never sends F5/keystrokes to Anno — the player still saves themselves.
 */

/** Anno 1800 Steam App ID. Editable in the downloaded .bat if Steam changes it. */
export const STEAM_APP_ID = "916440";

export function steamLaunchUri(appId: string = STEAM_APP_ID): string {
  return `steam://rungameid/${appId}`;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/** origin comes from window.location.origin at click time — never a guessed/hardcoded domain. */
export function buildLauncherScript(origin: string): string {
  const site = `${stripTrailingSlash(origin)}/`;
  return [
    "@echo off",
    "rem Harbor Buddy - lanzador opcional (opt-in). No toca Anno ni el .a7s.",
    "rem Abre Steam (Anno 1800), el vigilante de esta misma carpeta, y esta pagina.",
    "rem Nunca manda F5 ni teclas a Anno. Vos guardas cuando quieras (Ctrl+F5 o autoguardado).",
    "setlocal",
    "cd /d \"%~dp0\"",
    `start "" "${steamLaunchUri()}"`,
    'if exist "watch-harbor-live.bat" (',
    '  start "" "watch-harbor-live.bat"',
    ") else (",
    "  echo No encontre watch-harbor-live.bat en esta carpeta. Descargalo junto a este lanzador.",
    ")",
    `start "" "${site}"`,
    "exit /b 0",
    "",
  ].join("\r\n");
}

export function launcherFileName(): string {
  return "launch-harbor-buddy.bat";
}
