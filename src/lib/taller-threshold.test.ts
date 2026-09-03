import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TALLER_RATIOS,
  TALLER_RATIOS_VERSION,
  TALLER_WIKI,
  ratioSupply,
  tallerThreshold,
  type TallerSnapshot,
} from "./taller-threshold.ts";

function snap(patch: Partial<TallerSnapshot> = {}): TallerSnapshot {
  return {
    balance: "unknown",
    saturation: "unknown",
    session: { missionId: null, buildingsKnown: false, buildingIds: [] },
    ...patch,
    session: {
      missionId: null,
      buildingsKnown: false,
      buildingIds: [],
      ...patch.session,
    },
  };
}

describe("taller ratios", () => {
  it("is a versioned static table, not live t/min", () => {
    assert.match(TALLER_RATIOS_VERSION, /^wiki-v1-/);
    assert.equal(TALLER_WIKI, "https://anno1800.fandom.com/wiki/Production_chains");
    assert.ok(TALLER_RATIOS.length >= 3);
    for (const row of TALLER_RATIOS) {
      assert.equal(typeof row.residencesServed, "number");
      assert.ok(row.residencesServed > 0);
      assert.equal("tMin" in row, false);
    }
  });
});

describe("ratioSupply", () => {
  it("multiplies static residencesServed by building count in the snapshot", () => {
    const fish = TALLER_RATIOS.find((row) => row.id === "fish");
    assert.ok(fish);
    assert.equal(ratioSupply(fish, 0), 0);
    assert.equal(ratioSupply(fish, 1), fish.residencesServed);
    assert.equal(ratioSupply(fish, 2), fish.residencesServed * 2);
  });
});

describe("tallerThreshold", () => {
  it("asks for the missing good when the snapshot has no buildings yet", () => {
    assert.deepEqual(tallerThreshold(snap()), {
      kind: "missing-good",
      line: "Falta pescado.",
    });
  });

  it("stamps missing-good when telemetry is on and the chain building is absent", () => {
    assert.deepEqual(
      tallerThreshold(
        snap({
          saturation: "yellow",
          session: { missionId: "m1", buildingsKnown: true, buildingIds: ["marketplace"] },
        }),
      ),
      { kind: "missing-good", line: "Falta pescado." },
    );
  });

  it("stamps Alcanza when supply covers demand and houses are ok", () => {
    assert.deepEqual(
      tallerThreshold(
        snap({
          balance: "up",
          saturation: "ok",
          session: { missionId: "m1", buildingsKnown: true, buildingIds: ["fishery"] },
        }),
      ),
      { kind: "alcanza", label: "Alcanza" },
    );
  });

  it("stamps No alcanza when saturation is yellow even with the building", () => {
    assert.deepEqual(
      tallerThreshold(
        snap({
          balance: "up",
          saturation: "yellow",
          session: { missionId: "m1", buildingsKnown: true, buildingIds: ["fishery"] },
        }),
      ),
      { kind: "no-alcanza", label: "No alcanza" },
    );
  });

  it("stamps No alcanza when balance is down", () => {
    assert.deepEqual(
      tallerThreshold(
        snap({
          balance: "down",
          saturation: "ok",
          session: { missionId: "m1", buildingsKnown: true, buildingIds: ["fishery"] },
        }),
      ),
      { kind: "no-alcanza", label: "No alcanza" },
    );
  });

  it("treats live farmer workforce without buildings as No alcanza", () => {
    assert.deepEqual(
      tallerThreshold(
        snap({
          session: {
            missionId: "m1",
            buildingsKnown: false,
            buildingIds: [],
            sessionName: "Bright Sands",
            workforceFarmers: true,
          },
        }),
      ),
      { kind: "no-alcanza", label: "No alcanza" },
    );
  });

  it("uses empty houses as a missing-good line, not a grid", () => {
    const stamp = tallerThreshold(
      snap({
        saturation: "empty",
        session: { missionId: "m1", buildingsKnown: false, buildingIds: [] },
      }),
    );
    assert.equal(stamp.kind, "missing-good");
    assert.match(stamp.kind === "missing-good" ? stamp.line : "", /^Falta /);
  });
});
