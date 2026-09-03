import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { STEAM_APP_ID, buildLauncherScript, launcherFileName, steamLaunchUri } from "./launcher.ts";

describe("optional Windows launcher: steam:// + watcher + this page", () => {
  it("builds a steam:// URI for Anno 1800's App ID", () => {
    assert.equal(steamLaunchUri(), `steam://rungameid/${STEAM_APP_ID}`);
    assert.equal(steamLaunchUri("12345"), "steam://rungameid/12345");
  });

  it("starts Steam, the local watcher, and the caller's own origin — never a guessed domain", () => {
    const script = buildLauncherScript("https://example.harbor-buddy.app/");
    assert.match(script, /start "" "steam:\/\/rungameid\/916440"/);
    assert.match(script, /if exist "watch-harbor-live\.bat"/);
    assert.match(script, /start "" "watch-harbor-live\.bat"/);
    assert.match(script, /start "" "https:\/\/example\.harbor-buddy\.app\/"/);
    assert.equal(launcherFileName(), "launch-harbor-buddy.bat");
  });

  it("normalizes an origin without a trailing slash the same way", () => {
    const script = buildLauncherScript("http://127.0.0.1:8080");
    assert.match(script, /start "" "http:\/\/127\.0\.0\.1:8080\/"/);
  });

  it("never automates a keystroke into Anno — Steam launch only, no SendKeys/.a7s writes", () => {
    const script = buildLauncherScript("http://127.0.0.1:8080");
    assert.doesNotMatch(script, /SendKeys/i);
    assert.doesNotMatch(script, /AppActivate/i);
    assert.doesNotMatch(script, /wscript|cscript/i);
    assert.doesNotMatch(script, />\s*.*\.a7s|copy .*\.a7s|del .*\.a7s/i);
    assert.match(script, /Nunca manda F5 ni teclas a Anno/);
  });
});

describe("launcher power-up stays on /instalar only", () => {
  const instalar = readFileSync(new URL("../routes/instalar.tsx", import.meta.url), "utf8");
  const conectar = readFileSync(new URL("../routes/conectar.tsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../components/harbor-app.tsx", import.meta.url), "utf8");
  const desk = readFileSync(new URL("../components/session-desk.tsx", import.meta.url), "utf8");
  const panel = readFileSync(new URL("../components/install-panel.tsx", import.meta.url), "utf8");

  it("only /instalar opts into the launcher prop", () => {
    assert.match(instalar, /<InstallPanel launcher \/>/);
    assert.doesNotMatch(conectar, /launcher/);
  });

  it("never mounts on Home (Welcome or the session desk)", () => {
    assert.doesNotMatch(app, /LauncherCard|buildLauncherScript|data-install-launcher/);
    assert.doesNotMatch(desk, /LauncherCard|buildLauncherScript|data-install-launcher/);
  });

  it("defaults off — InstallPanel needs the explicit prop to show it", () => {
    assert.match(panel, /launcher = false/);
    assert.match(panel, /\{launcher \? <LauncherCard \/> : null\}/);
  });
});
