import type { LiveSnapshot } from "../live/types.ts";
import type {
  CoverageRisk,
  FleetCoverageView,
  FleetInventoryShip,
  FleetManualRole,
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
