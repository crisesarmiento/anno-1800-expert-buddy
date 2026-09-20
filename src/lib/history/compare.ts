import { islandKey } from "../live/island-key.ts";
import { sampleClock } from "./campaign.ts";
import type {
  CompareStockResult,
  HistoryIsland,
  HistorySample,
  StockDelta,
} from "./types.ts";

export function canCompareSamples(previous: HistorySample, current: HistorySample): CompareStockResult {
  if (previous.campaignId !== current.campaignId) {
    return { ok: false, reason: "cross-campaign" };
  }
  if (previous.branchId !== current.branchId) {
    return { ok: false, reason: "cross-branch" };
  }
  const prevClock = sampleClock(previous);
  const nextClock = sampleClock(current);
  if (prevClock != null && nextClock != null && nextClock < prevClock) {
    return { ok: false, reason: "against-future" };
  }
  return { ok: true, changes: [] };
}

function stockMap(island: HistoryIsland | undefined) {
  const map = new Map<string, { name: string; amount: number }>();
  for (const good of island?.stock ?? []) {
    map.set(good.id, { name: good.name, amount: good.amount });
  }
  return map;
}

export function islandStockDelta(
  previous: HistorySample,
  current: HistorySample,
  regionId: number,
  areaId: number,
): CompareStockResult {
  const gate = canCompareSamples(previous, current);
  if (!gate.ok) return gate;
  const key = islandKey(regionId, areaId);
  const prevIsland = previous.summary.islands.find(
    (island) => islandKey(island.regionId, island.areaId) === key,
  );
  const nextIsland = current.summary.islands.find(
    (island) => islandKey(island.regionId, island.areaId) === key,
  );
  if (!prevIsland || !nextIsland) return { ok: false, reason: "missing-identity" };
  if (prevIsland.stockOmitted || nextIsland.stockOmitted) {
    return { ok: false, reason: "missing-identity" };
  }
  const previousSavedAt = previous.savedAt ?? previous.recordedAt;
  const before = stockMap(prevIsland);
  const after = stockMap(nextIsland);
  const changes: StockDelta[] = [];
  for (const [id, next] of after) {
    const prev = before.get(id);
    if (!prev || prev.amount === next.amount) continue;
    changes.push({
      id,
      name: next.name,
      previousAmount: prev.amount,
      amount: next.amount,
      delta: next.amount - prev.amount,
      previousSavedAt,
    });
  }
  return { ok: true, changes };
}
