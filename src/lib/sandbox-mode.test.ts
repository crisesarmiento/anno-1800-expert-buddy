import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  SANDBOX_COPY,
  SANDBOX_PATH,
  SANDBOX_TIPS,
  campaignNotebookMayInherit,
  isSandboxPath,
  playModeForPath,
  sandboxTallerLink,
  tipsForMode,
} from "./sandbox-mode.ts";

const here = dirname(fileURLToPath(import.meta.url));

function source(rel: string) {
  return readFileSync(join(here, rel), "utf8");
}

describe("sandbox as a separate mode", () => {
  it("treats /sandbox as sandbox and everything else as campaign", () => {
    assert.equal(isSandboxPath("/sandbox"), true);
    assert.equal(isSandboxPath("/sandbox/"), true);
    assert.equal(isSandboxPath("/sandbox?x=1"), true);
    assert.equal(playModeForPath("/sandbox"), "sandbox");
    assert.equal(isSandboxPath("/"), false);
    assert.equal(isSandboxPath("/tablero"), false);
    assert.equal(isSandboxPath("/catalogo"), false);
    assert.equal(playModeForPath("/"), "campaign");
    assert.equal(SANDBOX_PATH, "/sandbox");
  });

  it("keeps sandbox production tips out of the campaign notebook", () => {
    for (const tip of SANDBOX_TIPS) {
      assert.equal(tip.mode, "sandbox");
      assert.equal(campaignNotebookMayInherit(tip), false);
    }
    assert.equal(campaignNotebookMayInherit({ mode: "campaign" }), true);
    assert.equal(campaignNotebookMayInherit({}), true);
    assert.deepEqual(tipsForMode(SANDBOX_TIPS, "campaign"), []);
    assert.equal(tipsForMode(SANDBOX_TIPS, "sandbox").length, SANDBOX_TIPS.length);
  });

  it("always offers taller in sandbox, even without Saturado", () => {
    const taller = sandboxTallerLink();
    assert.equal(taller.label, "Ver taller");
    assert.match(taller.href, /Production_buildings/);
  });

  it("ships a distinct /sandbox route in Spanish, not a second Home", () => {
    const route = source("../routes/sandbox.tsx");
    const page = source("../components/sandbox-mode.tsx");
    const tree = source("../routeTree.gen.ts");
    assert.match(route, /createFileRoute\("\/sandbox"\)/);
    assert.match(page, /data-sandbox-mode=/);
    assert.match(page, /data-sandbox-taller=/);
    assert.match(page, /SANDBOX_COPY\.title/);
    assert.match(source("./sandbox-mode.ts"), /Jugá suelto, no es la campaña/);
    assert.doesNotMatch(page, /DiaryTitleChips/);
    assert.doesNotMatch(page, /HarborApp/);
    assert.doesNotMatch(page, /SessionDesk/);
    assert.doesNotMatch(page, /Esto, ahora/);
    assert.match(tree, /\/sandbox/);
  });

  it("exposes a Sandbox chip on campaign Home without putting tips in the notebook", () => {
    const welcome = source("../components/harbor-app.tsx");
    const chips = source("../components/diary-chips.tsx");
    const diary = source("./diary-chips.ts");
    const campaign = source("./data/campaign.ts");
    const stamps = source("../components/desk-sheets/stamp-panel.tsx");
    const desk = source("../components/session-desk.tsx");
    assert.match(welcome, /SandboxModeChip/);
    assert.match(welcome, /to="\/sandbox"/);
    assert.doesNotMatch(chips, /sandbox/i);
    assert.doesNotMatch(diary, /sandbox/i);
    assert.doesNotMatch(stamps, /sandbox/i);
    assert.doesNotMatch(desk, /SANDBOX_TIPS|sandbox-mode/);
    for (const tip of SANDBOX_TIPS) {
      assert.equal(campaign.includes(tip.text), false, tip.id);
      assert.equal(desk.includes(tip.text), false, tip.id);
      assert.equal(stamps.includes(tip.text), false, tip.id);
    }
  });
});
