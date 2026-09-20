/**
 * Pure scenario types. Observed live data is adapted in observe.ts;
 * this module never reads a save or OCR sample.
 */

import type { BuildingId, GoodId, PopulationTier, World } from "../sim/types.ts";

export type ScenarioIslandId = string;

/** true / false / unknown. Unknown is never coerced to false. */
export type Trilean = true | false | null;

export type MissingDatum =
  | "consumer-demand"
  | "consumer-capacity"
  | "fertility"
  | "resource"
  | "workforce"
  | "inputs"
  | "origin-demand"
  | "origin-capacity"
  | "transport-capacity"
  | "investment"
  | "paused-count";

export type AlternativeKind =
  | "expand-local"
  | "build-local-chain"
  | "transport-surplus"
  | "expand-origin-and-transport";

export type AlternativeViability = "viable" | "impossible" | "unknown";

export type ConstructionTotals = {
  coins: number | null;
  timber: number | null;
  bricks: number | null;
  steelBeams: number | null;
};

export type ScenarioIsland = {
  id: ScenarioIslandId;
  name: string;
  world: World;
  /** Snapshot stock of the chosen good. Never treated as continuous surplus. */
  stockAmount: number | null;
  demandTMin: number | null;
  capacityTMin: number | null;
  buildingCount: number | null;
  pausedCount: number | null;
  fertility: Partial<Record<string, Trilean>>;
  resources: Partial<Record<string, Trilean>>;
  workforceAvailable: Partial<Record<PopulationTier, number | null>>;
  buildings: Partial<Record<BuildingId, number>>;
  /**
   * t/min of this good already reserved for other destinations.
   * Null = other consumers may exist but the amount is unknown.
   */
  reservedExportTMin: number | null;
  /** Known competing destinations exist (route or explicit). Null = unknown. */
  hasOtherConsumers: Trilean;
  /** Explicit transport t/min toward the chosen consumer. Never inferred from stock. */
  transportToConsumerTMin: number | null;
  /** Structural route toward the consumer (ship, two stops, good configured). */
  routeToConsumerOk: Trilean;
};

export type ScenarioInput = {
  consumerId: ScenarioIslandId;
  goodId: GoodId;
  islands: ScenarioIsland[];
};

export type ScenarioAlternative = {
  kind: AlternativeKind;
  viability: AlternativeViability;
  blockers: string[];
  missing: MissingDatum[];
  assumptions: string[];
  originId?: ScenarioIslandId;
  buildingsToAdd: Partial<Record<BuildingId, number>>;
  investment: ConstructionTotals;
  recurrentMaintenance: number | null;
  workforce: Partial<Record<PopulationTier, number>> | null;
  logisticsViable: Trilean;
  allocatedTMin: number | null;
  coversNeed: Trilean;
  /** Only set when every required component is known. Never includes tax. */
  savings: number | null;
  roi: null;
};

export type CutAdvice = {
  recommendCut: false;
  reason: "consumers" | "consumers-unknown" | "not-local-surplus" | "demand-unknown";
};

export type ScenarioVerdict =
  | { kind: "pick"; winner: AlternativeKind; reason: string }
  | { kind: "insufficient-data"; nextDatum: MissingDatum }
  | { kind: "none-viable"; reason: string }
  | { kind: "already-covered" };

export type SurplusAllocation = {
  originId: ScenarioIslandId;
  destinationId: ScenarioIslandId;
  amountTMin: number;
};

export type ScenarioResult = {
  consumerId: ScenarioIslandId;
  goodId: GoodId;
  neededTMin: number | null;
  alternatives: ScenarioAlternative[];
  verdict: ScenarioVerdict;
  cutAdvice: CutAdvice;
  notes: string[];
  evidence: "inferred";
};
