import { suggestedReserves } from "../missions/reserves.ts";
import type { LiveSnapshot } from "../live/types.ts";
import { lookupShipCatalog } from "./catalog.ts";
import type { NewBuildCompare } from "./types.ts";

/**
 * Compare a catalog hull against treasury and read stock.
 * Mission reserves stay beside stock; they are never subtracted.
 * Cost never recommends dismantling a defense.
 */
export function compareNewBuild(
  shipId: string,
  snapshot: LiveSnapshot | null | undefined,
): NewBuildCompare {
  const catalog = lookupShipCatalog(undefined, shipId);
  const missing: string[] = [];
  if (!catalog) {
    return {
      shipId,
      honesty: "inferred",
      materials: [],
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

  const stockById = new Map((snapshot?.telemetry?.goods ?? []).map((row) => [row.id, row.amount]));
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
