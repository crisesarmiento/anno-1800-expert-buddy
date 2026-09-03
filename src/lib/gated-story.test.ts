import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { LiveSnapshot } from "./live/types.ts";
import {
  ASK_ISLA,
  ASK_PERIODICO,
  SEEN_ISLA,
  SEEN_PERIODICO,
  gatedStory,
  isWalkthrough,
  situationTip,
  tenSecondLine,
  type GatedStoryInput,
} from "./gated-story.ts";

const defaultPulse = { coins: "unknown", houses: "unknown", looking: "unknown" } as const;

const welcome = readFileSync(new URL("../components/harbor-app.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("../components/session-desk.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../components/gated-map-page.tsx", import.meta.url), "utf8");
const layer = readFileSync(new URL("../components/gated-story-desk.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../routes/mapa.tsx", import.meta.url), "utf8");

function snapshot(patch: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    schema: "harbor-live-v1",
    source: "telemetry",
    updatedAt: "2026-09-02T00:00:00.000Z",
    game: "anno-1800",
    quests: [],
    ...patch,
  };
}

function input(patch: Partial<GatedStoryInput> = {}): GatedStoryInput {
  return {
    snapshot: null,
    missionId: null,
    pulse: defaultPulse,
    calm: "session",
    stamps: [],
    spoilers: true,
    ...patch,
  };
}

describe("gated story second-monitor layer", () => {
  it("lives on /mapa, not Home hero, and stays off Taller", () => {
    assert.match(route, /createFileRoute\("\/mapa"\)/);
    assert.match(page, /GatedStoryDesk/);
    assert.match(page, /data-gated-map-page/);
    assert.match(welcome, /to="\/mapa"/);
    assert.doesNotMatch(welcome, /GatedStoryDesk/);
    assert.doesNotMatch(desk, /GatedStoryDesk/);
    assert.doesNotMatch(page, /Ver taller|TALLER_LINK|data-taller-link/);
    assert.doesNotMatch(layer, /Ver taller|TALLER_LINK|data-taller-link/);
  });

  it("keeps notebook language: ink seals, croquis SVG, no Ubisoft HUD/art", () => {
    assert.match(page, /data-visual="diario"/);
    assert.match(layer, /InkSeal/);
    assert.match(layer, /data-gated-sketch/);
    assert.doesNotMatch(layer, /lucide-react/);
    assert.doesNotMatch(layer, /<img\b/);
    assert.doesNotMatch(page, /<img\b/);
    assert.doesNotMatch(page + layer, /ubisoft|wikia|nocookie/i);
  });

  it("shows only islands already seen this save and asks without naming the next one", () => {
    const locked = gatedStory(input());
    assert.deepEqual(locked.islands, []);
    assert.equal(locked.islandAsk, ASK_ISLA);
    assert.match(locked.islandAsk ?? "", /¿ya desbloqueaste/);
    assert.doesNotMatch(JSON.stringify(locked), /crown falls|cape trelawney/i);

    const one = gatedStory(
      input({
        snapshot: snapshot({
          telemetry: { islands: [{ id: "bright-sands", name: "Bright Sands" }] },
        }),
      }),
    );
    assert.deepEqual(one.islands.map((row) => row.name), ["Bright Sands"]);
    assert.equal(one.islandAsk, ASK_ISLA);
    assert.equal(one.sketch.length, 1);

    const two = gatedStory(
      input({
        snapshot: snapshot({
          telemetry: {
            islands: [
              { id: "bright-sands", name: "Bright Sands" },
              { id: "crown", name: "Crown Falls" },
            ],
          },
        }),
      }),
    );
    assert.equal(two.islandAsk, null);
    assert.ok(two.islands.some((row) => row.name === "Bright Sands"));
    assert.ok(two.islands.some((row) => row.name === "Crown Falls"));

    const stamped = gatedStory(input({ stamps: [SEEN_ISLA] }));
    assert.equal(stamped.islandAsk, null);
    assert.equal(stamped.islands[0]?.name, "Otra isla");
  });

  it("keeps democracy as newspaper/influence and never dumps unrevealed laws or diary events", () => {
    const locked = gatedStory(input({ spoilers: true }));
    assert.equal(locked.democracy.unlocked, false);
    assert.equal(locked.democracy.ask, ASK_PERIODICO);
    assert.doesNotMatch(locked.democracy.line, /crown falls|arbeitsverbot|trade union/i);
    assert.doesNotMatch(JSON.stringify(locked.democracy), /evento del diario/i);

    const open = gatedStory(input({ stamps: [SEEN_PERIODICO] }));
    assert.equal(open.democracy.unlocked, true);
    assert.equal(open.democracy.ask, null);
    assert.match(open.democracy.title, /Periódico e influencia/);
    assert.doesNotMatch(open.democracy.line, /arbeitsverbot|crown falls/i);

    const fromMission = gatedStory(input({ missionId: "ch1-press" }));
    assert.equal(fromMission.democracy.unlocked, true);

    const influence = gatedStory(
      input({
        stamps: [SEEN_PERIODICO],
        snapshot: snapshot({ telemetry: { hints: ["Influencia 12"] } }),
      }),
    );
    assert.match(influence.democracy.line, /Influencia 12/);
  });

  it("tips are frená / seguí el diario, Spanish titles, ten seconds, not a walkthrough", () => {
    const stop = situationTip(input({ calm: "broke" }));
    assert.equal(stop.verb, "frena");
    assert.equal(stop.title, "Frená");
    assert.equal(isWalkthrough(stop.line), false);
    assert.ok(stop.line.length <= 140);

    const follow = situationTip(input({ missionId: "ch1-spark" }));
    assert.equal(follow.verb, "segui");
    assert.equal(follow.title, "Seguí el diario");
    assert.equal(follow.line, "Una chispa que vuelve");
    assert.doesNotMatch(follow.line, /mercado|10 casas|50 granjeros/i);

    const idle = situationTip(input());
    assert.equal(idle.title, "Seguí el diario");
    assert.match(idle.line, /diario/);

    assert.equal(tenSecondLine("Crown Falls te espera con leyes 7:1"), "Seguí el diario. Nada más.");
    assert.equal(isWalkthrough("Poné el mercado. Plantá diez casas. Llená granjeros."), true);
  });

  it("exposes one session line and one line per seen island", () => {
    const spark = gatedStory(input({ missionId: "ch1-spark" }));
    assert.equal(spark.sessionLine, "Una chispa que vuelve");
    const named = gatedStory(
      input({
        missionId: "ch1-spark",
        snapshot: snapshot({
          sessionName: "Autosave",
          telemetry: {
            islands: [
              { id: "bright-sands", name: "Bright Sands" },
              { id: "crown", name: "Crown Falls" },
            ],
          },
        }),
      }),
    );
    assert.equal(named.sessionLine, "Autosave · Una chispa que vuelve");
    assert.deepEqual(named.islandLines, ["Bright Sands", "Crown Falls"]);
    assert.match(layer, /data-session-line=/);
    assert.match(layer, /data-island-line=/);
  });
});
