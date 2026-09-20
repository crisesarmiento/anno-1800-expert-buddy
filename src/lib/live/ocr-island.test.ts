import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachOcrIslandIdentity, matchOcrIslandName, ocrIslandRef } from "./ocr-island.ts";
import type { LiveIslandSnapshot, LiveSnapshot } from "./types.ts";

function island(
  over: Partial<LiveIslandSnapshot> & Pick<LiveIslandSnapshot, "regionId" | "areaId" | "name">,
): LiveIslandSnapshot {
  return {
    ownerId: 0,
    nameSource: "city-name",
    coverage: { identity: { source: "save" } },
    ...over,
  };
}

describe("OCR island association", () => {
  it("associates only when the display name maps to one island", () => {
    const islands = [
      island({ regionId: 180023, areaId: 8451, name: "La Costa" }),
      island({ regionId: 180023, areaId: 9219, name: "[999001]" }),
    ];
    const match = matchOcrIslandName("La Costa", islands);
    assert.equal(match.status, "unique");
    if (match.status !== "unique") return;
    assert.equal(match.island.areaId, 8451);
    assert.deepEqual(ocrIslandRef("La Costa", islands), { regionId: 180023, areaId: 8451 });
  });

  it("refuses a duplicated display name — that is not island identity", () => {
    const islands = [
      island({ regionId: 180023, areaId: 1, name: "Puerto" }),
      island({ regionId: 180025, areaId: 2, name: "Puerto" }),
    ];
    const match = matchOcrIslandName("Puerto", islands);
    assert.equal(match.status, "ambiguous");
    assert.equal(ocrIslandRef("Puerto", islands), undefined);
  });

  it("does not treat a session/region catalog name as a colony", () => {
    const islands = [island({ regionId: 180023, areaId: 8451, name: "La Costa" })];
    assert.equal(matchOcrIslandName("Old World", islands).status, "none");
    assert.equal(matchOcrIslandName("Bright Sands", islands).status, "none");
  });

  it("attaches islandRef on ingest only for the unique OCR name", () => {
    const snapshot: LiveSnapshot = {
      schema: "harbor-live-v1",
      source: "save",
      updatedAt: "2026-09-19T12:00:00.000Z",
      game: "anno-1800",
      quests: [],
      islandSnapshots: [
        island({ regionId: 180023, areaId: 8451, name: "La Costa" }),
        island({ regionId: 180023, areaId: 9219, name: "La Costa" }),
      ],
      connection: {
        mode: "documents-save",
        native: {
          provider: "ux-enhancer-ocr",
          view: "production",
          observedAt: "2026-09-19T12:00:00.000Z",
          islandName: "La Costa",
        },
      },
      telemetry: {
        production: [
          {
            guid: 1010266,
            name: "Lumberjack's Hut",
            observedAt: "2026-09-19T12:00:00.000Z",
            islandName: "La Costa",
          },
        ],
      },
    };
    const next = attachOcrIslandIdentity(snapshot);
    assert.equal(next.connection?.native?.islandRef, undefined);
    assert.equal(next.telemetry?.production?.[0]?.islandRef, undefined);
  });
});
