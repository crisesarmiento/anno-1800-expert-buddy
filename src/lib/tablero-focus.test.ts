import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { DoNowRow } from "./rank-do-this-now.ts";
import { tableroFocus } from "./tablero-focus.ts";

const dashSrc = readFileSync(new URL("../components/harbor-dash.tsx", import.meta.url), "utf8");

function row(patch: Partial<DoNowRow> & Pick<DoNowRow, "id" | "band" | "title">): DoNowRow {
  return patch;
}

describe("tableroFocus", () => {
  it("picks the ranked alert when the top row is bad or warn", () => {
    const focus = tableroFocus({
      rows: [
        row({ id: "pulse:coins-down", band: "bad", title: "Pará de construir.", detail: "Economía." }),
        row({ id: "mission:do:0", band: "session", title: "Poné el mercado." }),
      ],
      hasMission: true,
      doneTitle: "Esta parte está.",
      noMissionTitle: "Sin misión todavía",
    });
    assert.deepEqual(focus, {
      kind: "alert",
      title: "Pará de construir.",
      detail: "Economía.",
    });
  });

  it("picks one calm todo when there is no alert", () => {
    const focus = tableroFocus({
      rows: [row({ id: "mission:do:0", band: "session", title: "Seguí el recado." })],
      hasMission: true,
      doneTitle: "Esta parte está.",
      noMissionTitle: "Sin misión todavía",
    });
    assert.deepEqual(focus, { kind: "calm", title: "Seguí el recado." });
  });

  it("uses done copy when the bag is empty and a mission is on", () => {
    const focus = tableroFocus({
      rows: [],
      hasMission: true,
      doneTitle: "Esta parte está.",
      noMissionTitle: "Sin misión todavía",
    });
    assert.deepEqual(focus, { kind: "calm", title: "Esta parte está." });
  });

  it("uses no-mission copy when there is no mission", () => {
    const focus = tableroFocus({
      rows: [],
      hasMission: false,
      doneTitle: "Esta parte está.",
      noMissionTitle: "Sin misión todavía",
    });
    assert.deepEqual(focus, { kind: "calm", title: "Sin misión todavía" });
  });

  it("never surfaces more than one row", () => {
    const focus = tableroFocus({
      rows: [
        row({ id: "pulse:houses-yellow", band: "warn", title: "Una cadena." }),
        row({ id: "live:missing:marketplace", band: "warn", title: "Poné el mercado." }),
        row({ id: "mission:do:0", band: "session", title: "Tachá esto." }),
      ],
      hasMission: true,
      doneTitle: "Esta parte está.",
      noMissionTitle: "Sin misión todavía",
    });
    assert.equal(focus.title, "Una cadena.");
    assert.equal(focus.kind, "alert");
  });
});

describe("HarborDash alert-first surface", () => {
  it("has no KPI hero tiles", () => {
    assert.doesNotMatch(dashSrc, /StatCard/);
    assert.doesNotMatch(dashSrc, /labelCoins|labelHouses/);
    assert.doesNotMatch(dashSrc, /text-2xl/);
    assert.doesNotMatch(dashSrc, /seenBuildings|seenPeople/);
  });

  it("renders one tablero focus card and keeps charts secondary", () => {
    assert.match(dashSrc, /tableroFocus/);
    assert.match(dashSrc, /data-tablero-focus/);
    assert.match(dashSrc, /<details/);
    assert.match(dashSrc, /t\.dash\.morePresence/);
  });
});
