import type { LiveProductionMetric, LiveSnapshot } from "./live/types.ts";
import { BUILDINGS, outputTMinAt100 } from "./sim/chains.ts";

export type NativeProductionStatus = "falta" | "justo" | "sobra";

export type NativeProductionAdvice = {
  guid: number;
  id: string;
  name: string;
  status: NativeProductionStatus;
  buildingCount: number;
  recommendedCount: number;
  capacityTMin: number;
  requiredTMin: number;
  productivity: number;
  pauseCount: number;
  observedAt: string;
  islandName?: string;
};

const STATUS_ORDER: Record<NativeProductionStatus, number> = {
  falta: 0,
  sobra: 1,
  justo: 2,
};

function adviceFromMetric(metric: LiveProductionMetric): NativeProductionAdvice | null {
  if (!metric.id || metric.buildingCount == null || metric.requiredTMin == null) return null;
  const building = BUILDINGS[metric.id];
  if (!building) return null;
  const productivity = metric.productivity ?? 100;
  if (productivity <= 0) return null;
  const perBuilding = outputTMinAt100(building, 1, productivity);
  if (!Number.isFinite(perBuilding) || perBuilding <= 0) return null;
  const buildingCount = Math.max(0, Math.trunc(metric.buildingCount));
  const requiredTMin = Math.max(0, metric.requiredTMin);
  const recommendedCount = Math.max(0, Math.ceil(requiredTMin / perBuilding - 1e-6));
  const capacityTMin = outputTMinAt100(building, buildingCount, productivity);
  const pauseCount = Math.max(0, buildingCount - recommendedCount);
  const status: NativeProductionStatus =
    buildingCount < recommendedCount ? "falta" : pauseCount > 0 ? "sobra" : "justo";
  const advice: NativeProductionAdvice = {
    guid: metric.guid,
    id: metric.id,
    name: building.nameEs,
    status,
    buildingCount,
    recommendedCount,
    capacityTMin,
    requiredTMin,
    productivity,
    pauseCount,
    observedAt: metric.observedAt,
  };
  if (metric.islandName) advice.islandName = metric.islandName;
  return advice;
}

/**
 * Only produces advice when OCR supplied island-specific factory count + demand.
 * Save-wide counts are deliberately not used: they can mix several islands.
 */
export function analyzeNativeProduction(snapshot: LiveSnapshot | null): NativeProductionAdvice[] {
  const rows = snapshot?.telemetry?.production ?? [];
  return rows
    .map(adviceFromMetric)
    .filter((row): row is NativeProductionAdvice => row !== null)
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        Math.abs(b.capacityTMin - b.requiredTMin) - Math.abs(a.capacityTMin - a.requiredTMin),
    );
}

export function nativeProductionEvidence(snapshot: LiveSnapshot | null) {
  const rows = snapshot?.telemetry?.production ?? [];
  return {
    productionRows: rows.length,
    withFactoryCount: rows.filter((row) => row.buildingCount != null).length,
    analyzable: analyzeNativeProduction(snapshot).length,
  };
}
