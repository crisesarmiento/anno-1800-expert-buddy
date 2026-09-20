import type { LiveSnapshot } from "../live/types.ts";
import { coverageFromSnapshot, fleetRoleInventory, surplusKeys } from "./coverage.ts";
import { fleetUpkeepSplit, inventoryFromSnapshot } from "./inventory.ts";
import {
  AUTOMATIC_GAME_ACTIONS,
  type FleetAdvice,
  type FleetRoleMap,
} from "./types.ts";

export function automaticGameActions(): readonly [] {
  return AUTOMATIC_GAME_ACTIONS;
}

export function fleetAdvice(
  snapshot: LiveSnapshot | null | undefined,
  roles?: FleetRoleMap,
): FleetAdvice {
  const ships = inventoryFromSnapshot(snapshot);
  const coverage = coverageFromSnapshot(snapshot);
  const upkeep = fleetUpkeepSplit(ships);
  return {
    ships,
    upkeep,
    coverage,
    roleInventory: fleetRoleInventory(ships, roles),
    surplusKeys: surplusKeys(ships, roles),
    automaticGameActions: automaticGameActions(),
    incompleteLimitsAdvice: coverage.adviceLimited || ships.length === 0 || upkeep.withoutUpkeep > 0,
  };
}
