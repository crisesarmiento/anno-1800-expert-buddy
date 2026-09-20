import type { LiveEvidenceSource, LiveFieldCoverage, LiveFleetShip } from "../live/types.ts";

export const AUTOMATIC_GAME_ACTIONS = [] as const;

export type HonestyLabel = "confirmed" | "observed" | "inferred";

/** Player-stated function. Never inferred from missing enemies. */
export type FleetManualRole = "escort" | "defense" | "trade" | "idle" | "unknown";

export type FleetCommitment =
  | "trade-route"
  | "escort"
  | "defense"
  | "idle"
  | "unknown";

export type SurplusLabel = "committed" | "not-evaluable";

export type CoverageRisk = "not-evaluable";

export type FleetInventoryShip = {
  key: string;
  ship: LiveFleetShip;
  honesty: {
    identity: HonestyLabel;
    type: HonestyLabel | null;
    assignment: HonestyLabel | null;
    location: HonestyLabel | null;
    maintenance: HonestyLabel | null;
  };
  catalogId?: string;
  catalogKind?: "trade" | "military" | "flagship" | "unknown";
  /** Wiki upkeep when the type is known. Never save-confirmed. */
  inferredUpkeep?: number;
};

export type FleetUpkeepSplit = {
  uniqueShips: number;
  withInferredUpkeep: number;
  withoutUpkeep: number;
  trade: number | null;
  military: number | null;
  unknownType: number | null;
  total: number | null;
  honesty: HonestyLabel;
  ownerValidated: boolean;
};

export type FleetCoverageView = {
  risk: CoverageRisk;
  diplomacy: "missing";
  defenses: "missing";
  escort: "manual-or-missing";
  adviceLimited: true;
  label: "riesgo no evaluable";
  /** Absence of enemies in a sample is not safety. */
  enemiesAbsentIsNotSafety: true;
};

export type NewBuildCompare = {
  shipId: string;
  honesty: HonestyLabel;
  purchase?: number;
  upkeep?: number;
  materials: { goodId: string; required: number; stockRead: number | null }[];
  treasury: number | null;
  purchaseFitsBudget: boolean | null;
  materialsKnown: boolean;
  materialsCovered: boolean | null;
  /** Always false. Cost never justifies dismantling a defense. */
  recommendDismantleDefense: false;
  /** Always false. The module does not promise a fight. */
  promiseCombatOutcome: false;
  missing: string[];
};

export type FleetAdvice = {
  ships: FleetInventoryShip[];
  upkeep: FleetUpkeepSplit;
  coverage: FleetCoverageView;
  /** Escort / defense never appear here. */
  surplusKeys: string[];
  automaticGameActions: readonly [];
  incompleteLimitsAdvice: boolean;
};

export type FleetRoleMap = Record<string, FleetManualRole>;

export function honestyFromCoverage(coverage: LiveFieldCoverage | undefined): HonestyLabel | null {
  if (!coverage) return null;
  const source: LiveEvidenceSource = coverage.source;
  if (source === "save") return "confirmed";
  if (source === "ocr") return "observed";
  return "inferred";
}
