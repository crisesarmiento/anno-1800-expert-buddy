import type { LiveSnapshot } from "../live/types.ts";
import type {
  CoverageRisk,
  FleetCoverageView,
  FleetInventoryShip,
  FleetManualRole,
  FleetRoleInventory,
  FleetRoleMap,
  SurplusLabel,
} from "./types.ts";

export const RIESGO_NO_EVALUABLE = "riesgo no evaluable" as const;

/**
 * Diplomacy hits in telemetry.people are NPC presence, not relations.
 * Harbor guns are not extracted. Escort is never inferred from the save.
 */
export function coverageFromSnapshot(_snapshot: LiveSnapshot | null | undefined): FleetCoverageView {
  void _snapshot;
  return {
    risk: "not-evaluable" satisfies CoverageRisk,
    diplomacy: "missing",
    defenses: "missing",
    escort: "manual-or-missing",
    adviceLimited: true,
    label: RIESGO_NO_EVALUABLE,
    enemiesAbsentIsNotSafety: true,
  };
}

export function effectiveRole(
  ship: FleetInventoryShip,
  roles: FleetRoleMap | undefined,
): FleetManualRole {
  const manual = roles?.[ship.key];
  if (manual) return manual;
  if (ship.ship.assignment?.kind === "trade-route") return "trade";
  return "unknown";
}

/**
 * Escort and defense are commitments. They are never «surplus».
 * Missing threat data is not a reason to call anything extra.
 */
export function surplusLabel(
  ship: FleetInventoryShip,
  roles: FleetRoleMap | undefined,
): SurplusLabel {
  const role = effectiveRole(ship, roles);
  if (role === "escort" || role === "defense" || role === "trade") return "committed";
  return "not-evaluable";
}

export function isSurplus(_ship: FleetInventoryShip, _roles?: FleetRoleMap): false {
  return false;
}

export function inferSafetyFromAbsentEnemies(_enemiesInSample: number | undefined): false {
  return false;
}

export function surplusKeys(ships: readonly FleetInventoryShip[], roles?: FleetRoleMap): string[] {
  void ships;
  void roles;
  const none: string[] = [];
  return none;
}

/**
 * Explicit coverage inventory: which manual role covers each read ship.
 * "unknown" ships are not idle — they are ships the player has not (yet)
 * tagged and that have no confirmed trade-route assignment either.
 */
export function fleetRoleInventory(
  ships: readonly FleetInventoryShip[],
  roles?: FleetRoleMap,
): FleetRoleInventory {
  const counts: FleetRoleInventory = {
    escort: 0,
    defense: 0,
    trade: 0,
    idle: 0,
    unknown: 0,
    total: ships.length,
  };
  for (const ship of ships) {
    counts[effectiveRole(ship, roles)] += 1;
  }
  return counts;
}
