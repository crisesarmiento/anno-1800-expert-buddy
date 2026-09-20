import { isPlayerParticipant } from "../live/evidence.ts";
import type { LiveIslandSnapshot, LiveSnapshot } from "../live/types.ts";
import type { HistoryIsland, HistorySummary } from "./types.ts";
import { HISTORY_MAX_ISLANDS, HISTORY_MAX_STOCK } from "./types.ts";

export function contentHash(summary: HistorySummary): string {
  const payload = JSON.stringify({
    snapshotId: summary.snapshotId ?? null,
    savedAt: summary.savedAt ?? null,
    simTime: summary.simTime ?? null,
    islands: summary.islands.map((island) => ({
      regionId: island.regionId,
      areaId: island.areaId,
      ownerId: island.ownerId,
      name: island.name,
      stock: island.stock ?? null,
      stockOmitted: island.stockOmitted ?? false,
    })),
    globalGoods: summary.globalGoods ?? null,
  });
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

function summarizeIsland(island: LiveIslandSnapshot): HistoryIsland {
  const row: HistoryIsland = {
    regionId: island.regionId,
    areaId: island.areaId,
    ownerId: island.ownerId,
    name: island.name,
  };
  if (island.stock && island.stock.length > HISTORY_MAX_STOCK) {
    row.stockOmitted = true;
  } else if (island.stock?.length) {
    row.stock = island.stock.map((good) => ({
      id: good.id,
      name: good.name,
      amount: good.amount,
    }));
  }
  return row;
}

/** Summarized sample for IndexedDB. Identity is never silently dropped. */
export function summarizeSnapshot(snapshot: LiveSnapshot): HistorySummary {
  const player = (snapshot.islandSnapshots ?? []).filter((island) =>
    isPlayerParticipant(island.ownerId),
  );
  const rest = (snapshot.islandSnapshots ?? []).filter(
    (island) => !isPlayerParticipant(island.ownerId),
  );
  const ranked = [...player, ...rest];
  const kept = ranked.slice(0, HISTORY_MAX_ISLANDS);
  const summary: HistorySummary = {
    islands: kept.map(summarizeIsland),
  };
  if (snapshot.savedAt) summary.savedAt = snapshot.savedAt;
  if (typeof snapshot.simTime === "number") summary.simTime = snapshot.simTime;
  if (snapshot.snapshotId) summary.snapshotId = snapshot.snapshotId;
  if (snapshot.sessionName) summary.sessionName = snapshot.sessionName;
  if (snapshot.campaignId) summary.campaignId = snapshot.campaignId;
  if (typeof snapshot.playerId === "number") summary.playerId = snapshot.playerId;
  if (ranked.length > kept.length) summary.islandsOmitted = ranked.length - kept.length;
  if (snapshot.telemetry?.goods?.length) {
    summary.globalGoods = snapshot.telemetry.goods.slice(0, HISTORY_MAX_STOCK).map((good) => ({
      id: good.id,
      name: good.name,
      amount: good.amount,
    }));
  }
  return summary;
}
