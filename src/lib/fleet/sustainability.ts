import { suggestedReserves } from "../missions/reserves.ts";
import { playerIslandsFromSave } from "../live/evidence.ts";
import { islandKey } from "../live/island-key.ts";
import type { LiveSnapshot } from "../live/types.ts";
import { lookupShipCatalog } from "./catalog.ts";
import type { NewBuildCompare } from "./types.ts";

/**
 * Compare a catalog hull against treasury and read stock.
 * Mission reserves stay beside stock; they are never subtracted.
 * Cost never recommends dismantling a defense.
 *
 * `islandId` (from `islandKey`) scopes the materials check to one shipyard's
 * colony stock. Without it, the check falls back to save-wide stock and says
 * so via `materialsScope: "global"` — it never claims a specific island has
 * the goods when only the whole save does.
 */
export function compareNewBuild(
  shipId: string,
  snapshot: LiveSnapshot | null | undefined,
  islandId?: string | null,
): NewBuildCompare {
  const catalog = lookupShipCatalog(undefined, shipId);
  const missing: string[] = [];
  if (!catalog) {
    return {
      shipId,
      honesty: "inferred",
      materials: [],
      materialsScope: "unknown",
      materialsIslandId: null,
      materialsIslandName: null,
      treasury: snapshot?.economy?.treasury ?? null,
      purchaseFitsBudget: null,
      materialsKnown: false,
      materialsCovered: null,
      recommendDismantleDefense: false,
      promiseCombatOutcome: false,
      missing: ["catalog"],
    };
  }
  const treasury = snapshot?.economy?.treasury;
  const treasuryValue = typeof treasury === "number" ? treasury : null;
  if (catalog.purchase == null) missing.push("purchase");
  if (catalog.upkeep == null) missing.push("upkeep");
  if (!catalog.materials?.length) missing.push("materials");

  let stockById = new Map<string, number>();
  let materialsScope: NewBuildCompare["materialsScope"] = "global";
  let materialsIslandId: string | null = null;
  let materialsIslandName: string | null = null;
  if (islandId) {
    const island = playerIslandsFromSave(snapshot).find(
      (row) => islandKey(row.regionId, row.areaId) === islandId,
    );
    if (island) {
      materialsScope = "island";
      materialsIslandId = islandId;
      materialsIslandName = island.name;
      stockById = new Map((island.stock ?? []).map((row) => [row.id, row.amount]));
    } else {
      materialsScope = "unknown";
      missing.push("island");
    }
  } else {
    stockById = new Map((snapshot?.telemetry?.goods ?? []).map((row) => [row.id, row.amount]));
  }

  const reserves = suggestedReserves(snapshot);
  const materials = (catalog.materials ?? []).map((need) => {
    const stockRead = stockById.has(need.goodId) ? stockById.get(need.goodId)! : null;
    return { goodId: need.goodId, required: need.amount, stockRead };
  });
  const materialsKnown = materials.length > 0 && materials.every((row) => row.stockRead != null);
  const materialsCovered = materialsKnown
    ? materials.every((row) => (row.stockRead ?? 0) >= row.required)
    : null;
  const purchaseFitsBudget =
    treasuryValue != null && catalog.purchase != null ? treasuryValue >= catalog.purchase : null;

  void reserves;

  const result: NewBuildCompare = {
    shipId: catalog.id,
    honesty: "inferred",
    materials,
    materialsScope,
    materialsIslandId,
    materialsIslandName,
    treasury: treasuryValue,
    purchaseFitsBudget,
    materialsKnown,
    materialsCovered,
    recommendDismantleDefense: false,
    promiseCombatOutcome: false,
    missing,
  };
  if (catalog.purchase != null) result.purchase = catalog.purchase;
  if (catalog.upkeep != null) result.upkeep = catalog.upkeep;
  return result;
}

export function recommendDismantleBecauseExpensive(_upkeep: number | null | undefined): false {
  return false;
}

export function promiseCombatOutcome(_input?: unknown): false {
  return false;
}
