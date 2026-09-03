import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { ingestLiveJsonText } from "./live/validate.ts";
import { LOCALES, UI } from "./i18n.ts";
import {
  OVERLAY_FORBIDDEN,
  SECOND_SCREEN_SURFACE,
  islandLines,
  liveWatchSnapshot,
  sessionLine,
} from "./second-screen.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

function source(rel: string) {
  return readFileSync(join(here, rel), "utf8");
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const next = join(dir, entry.name);
    if (entry.isDirectory()) walk(next, acc);
    else if (/\.(ts|tsx|js|mjs|css|md)$/.test(entry.name)) acc.push(next);
  }
  return acc;
}

describe("second screen only — never overlay the game", () => {
  it("ships as tab/PWA document, not an overlay window", () => {
    const rootTsx = source("../routes/__root.tsx");
    const styles = source("../styles.css");
    const manifest = source("../../scripts/grok-pwa-shared.mjs");
    const docs = source("../../docs/second-screen.md");
    const readme = source("../../README.md");

    assert.match(rootTsx, /data-surface="second-screen"/);
    assert.equal(SECOND_SCREEN_SURFACE, "second-screen");
    assert.match(styles, /html\[data-surface="second-screen"\]/);
    assert.match(styles, /pointer-events:\s*auto/);
    assert.match(styles, /--color-paper: #f3e6d0/i);
    assert.doesNotMatch(styles, /html\[data-surface="second-screen"\][^{]*\{[^}]*pointer-events:\s*none/);
    assert.match(manifest, /display:\s*"standalone"/);
    assert.doesNotMatch(manifest, /display:\s*"overlay"/);
    assert.doesNotMatch(manifest, /display:\s*"fullscreen"/);
    assert.match(docs, /not an overlay/i);
    assert.match(docs, /Ctrl\+G/);
    assert.match(readme, /docs\/second-screen\.md/);
  });

  it("does not add always-on-top, click-through, or Electron overlay APIs", () => {
    const skip = new Set([
      join(here, "second-screen.ts"),
      join(here, "second-screen.test.ts"),
      join(here, "i18n.ts"),
      join(root, "docs/second-screen.md"),
      join(root, "README.md"),
    ]);
    const files = walk(join(root, "src")).concat(join(root, "package.json"));
    for (const file of files) {
      if (skip.has(file)) continue;
      if (file.endsWith(".test.ts") || file.endsWith(".test.mjs")) continue;
      const text = readFileSync(file, "utf8");
      for (const token of OVERLAY_FORBIDDEN) {
        assert.equal(text.includes(token), false, `${file} must not ship ${token}`);
      }
      assert.doesNotMatch(text, /requestFullscreen\s*\(/);
    }
  });

  it("tells every locale: first monitor / Ctrl+G stays the game", () => {
    for (const locale of LOCALES) {
      const line = UI[locale].welcome.windows.toLowerCase();
      assert.match(line, /ctrl\+g|strg\+g/);
      assert.match(line, /segundo|second|secondo|zweiten/);
      assert.match(line, /pwa/);
      assert.doesNotMatch(line, /always-on-top overlay hud/i);
    }
    assert.match(UI.es.welcome.windows, /Nunca overlay/);
    assert.match(UI.en.welcome.windows, /Never an overlay/);
  });

  it("keeps one Spanish diary line per session and one line per island", () => {
    assert.equal(
      sessionLine({ snapshot: null, missionId: "ch1-spark" }),
      "Una chispa que vuelve",
    );
    assert.equal(
      sessionLine({
        snapshot: {
          schema: "harbor-live-v1",
          source: "save",
          updatedAt: "2026-09-02T00:00:00.000Z",
          game: "anno-1800",
          sessionName: "Autosave",
          quests: [{ title: "Una chispa que vuelve", state: "active" }],
        },
        missionId: "ch1-spark",
      }),
      "Autosave · Una chispa que vuelve",
    );
    assert.deepEqual(
      islandLines([
        { id: "bright-sands", name: "Bright Sands" },
        { id: "crown", name: "Crown Falls" },
      ]),
      ["Bright Sands", "Crown Falls"],
    );
    const desk = source("../components/gated-story-desk.tsx");
    assert.match(desk, /data-session-line=/);
    assert.match(desk, /data-island-line=/);
    assert.match(desk, /story\.islandLines\.map/);
  });

  it("live JSON opt-in watch fails silent and keeps last good snapshot", () => {
    const panel = source("../components/live-panel.tsx");
    assert.match(panel, /onFile\(file, \{ silent: true \}\)/);
    assert.match(panel, /if \(!opts\.silent\) setLiveBanner/);
    const bad = ingestLiveJsonText("{not json");
    assert.equal(liveWatchSnapshot(bad), null);
    const good = ingestLiveJsonText(
      JSON.stringify({
        schema: "harbor-live-v1",
        source: "file",
        updatedAt: "2026-09-02T00:00:00.000Z",
        game: "anno-1800",
        quests: [{ title: "Una chispa que vuelve", state: "active" }],
      }),
    );
    assert.equal(liveWatchSnapshot(good)?.quests[0]?.title, "Una chispa que vuelve");
  });

  it("calm modes stay in this window, not a game HUD", () => {
    const app = source("../components/harbor-app.tsx");
    assert.match(app, /Estoy saturado|overwhelmed/);
    assert.match(app, /Monedas en rojo|broke/);
    assert.doesNotMatch(app, /alwaysOnTop|setIgnoreMouseEvents|BrowserWindow/);
  });
});
