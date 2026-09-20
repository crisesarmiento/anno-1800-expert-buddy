import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  defaultIslandFocusId,
  islandFocusName,
  islandFocusOptions,
  resolveIslandFocusId,
  scopeEstoAhoraLine,
} from "./island-focus.ts";
import { isSessionRegionHit, playerIslandFromSave } from "./live/evidence.ts";
import type { LiveSnapshot } from "./live/types.ts";

const welcome = readFileSync(new URL("../components/harbor-app.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("../components/session-desk.tsx", import.meta.url), "utf8");
const chip = readFileSync(new URL("../components/island-focus.tsx", import.meta.url), "utf8");

function sliceFn(src: string, name: string) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const next = src.indexOf("\nfunction ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe("island focus options", () => {
  it("reads the city-seed islands[] fixture (Taller seed) first", () => {
    const options = islandFocusOptions();
    assert.ok(options.length >= 1);
    assert.equal(options[0]?.id, "la-inapetente");
    assert.equal(options[0]?.name, "La Inapetente");
  });

  it("defaults to the seed's first island, which is La Inapetente in the campaign fixture", () => {
    assert.equal(defaultIslandFocusId(), "la-inapetente");
    assert.equal(islandFocusName(defaultIslandFocusId()), "La Inapetente");
  });

  it("resolves an unset or stale id back to a real option, never a blank focus", () => {
    assert.equal(resolveIslandFocusId(null), "la-inapetente");
    assert.equal(resolveIslandFocusId(undefined), "la-inapetente");
    assert.equal(resolveIslandFocusId("not-a-real-island"), "la-inapetente");
    assert.equal(resolveIslandFocusId("la-inapetente"), "la-inapetente");
  });
});

describe("Esto ahora / 10s chip scope follows the focused island", () => {
  it("switching the focused island changes the scoped line", () => {
    const a = scopeEstoAhoraLine("la-inapetente", "Vendé lo que ya producís.");
    const b = scopeEstoAhoraLine("bright-sands", "Vendé lo que ya producís.");
    assert.notEqual(a, b);
    assert.match(a, /^La Inapetente:/);
  });

  it("never floats the tip free of an island name", () => {
    const line = scopeEstoAhoraLine("la-inapetente", "Marcá lo que ya viste.");
    assert.match(line, /^La Inapetente: Marcá lo que ya viste\.$/);
  });
});

describe("island selector chip: notebook texture, not the sim/Taller path", () => {
  it("stays a plain chip button — no brass CTA classes, no Taller/sim imports", () => {
    assert.doesNotMatch(chip, /@\/lib\/sim|TallerCity|bg-primary/);
    assert.match(chip, /data-island-focus-chip=/);
  });

  it("puts the island selector before the Esto, ahora heading on Welcome and the session desk", () => {
    const h1 = /<h1[^>]*>\s*Esto, ahora/;
    const home = sliceFn(welcome, "Welcome");
    const selectorAt = home.indexOf("<IslandFocusChips");
    const estoAt = home.search(h1);
    assert.ok(selectorAt >= 0);
    assert.ok(estoAt >= 0);
    assert.ok(selectorAt < estoAt);

    const selectorAtDesk = desk.indexOf("<IslandFocusChips");
    const estoAtDesk = desk.search(h1);
    assert.ok(selectorAtDesk >= 0);
    assert.ok(estoAtDesk >= 0);
    assert.ok(selectorAtDesk < estoAtDesk);
  });

  it("never treats a live session/region name as the focused player island", () => {
    const live: LiveSnapshot = {
      schema: "harbor-live-v1",
      source: "save",
      updatedAt: "2026-09-19T00:00:00.000Z",
      game: "anno-1800",
      quests: [],
      islandName: "Old World",
      telemetry: {
        islands: [
          { id: "old-world", name: "Old World" },
          { id: "bright-sands", name: "Bright Sands" },
        ],
      },
    };
    assert.equal(playerIslandFromSave(live), null);
    assert.equal(isSessionRegionHit(live.islandName), true);
    assert.equal(
      islandFocusOptions().some((island) => island.name === "Old World"),
      false,
    );
  });

  it("keeps Home free of building grids, nextBuild, or quests even with the selector wired in", () => {
    const home = sliceFn(welcome, "Welcome");
    assert.doesNotMatch(home, /snapshot\.quests|quests\.map|quest\.title/);
    assert.doesNotMatch(home, /nextBuild|TallerCity|@\/lib\/sim/);
  });
});
