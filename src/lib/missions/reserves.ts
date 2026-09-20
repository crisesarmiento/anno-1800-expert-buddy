import type { LiveGoodHit, LiveQuest, LiveSnapshot } from "../live/types.ts";
import { catalogMissionId } from "./identity.ts";

export type SuggestedReserve = {
  goodId: string;
  goodName: string;
  amount: number;
  stockRead: number | null;
  /** Always the read stock. Never stock minus the reserve. */
  stockUnchanged: number | null;
  missionTitle: string;
  instanceId?: string;
};

const ACTIVE = new Set(["active", "ready"]);

/**
 * Confirmed delivery requirements become suggested reserves.
 * Never subtract them from telemetry.goods — the read stock stays as read.
 */
export function suggestedReserves(snapshot: LiveSnapshot | null | undefined): SuggestedReserve[] {
  if (!snapshot) return [];
  const stockById = new Map<string, LiveGoodHit>();
  for (const row of snapshot.telemetry?.goods ?? []) {
    stockById.set(row.id, row);
  }
  const out: SuggestedReserve[] = [];
  for (const quest of snapshot.quests) {
    if (!ACTIVE.has(quest.state)) continue;
    if (!isSaveReadQuest(quest)) continue;
    const missionId = catalogMissionId(quest);
    if (!missionId) continue;
    for (const objective of quest.objectives ?? []) {
      const goodId = objective.goodId?.trim();
      const required = objective.required;
      if (!goodId || typeof required !== "number" || !Number.isFinite(required) || required <= 0) {
        continue;
      }
      const current = typeof objective.current === "number" ? objective.current : 0;
      const remaining = Math.max(0, Math.trunc(required) - Math.trunc(current));
      if (remaining <= 0) continue;
      const stock = stockById.get(goodId);
      const amountRead = stock ? stock.amount : null;
      const row: SuggestedReserve = {
        goodId,
        goodName: objective.goodName?.trim() || stock?.name || goodId,
        amount: remaining,
        stockRead: amountRead,
        stockUnchanged: amountRead,
        missionTitle: quest.title,
      };
      if (quest.instanceId) row.instanceId = quest.instanceId;
      out.push(row);
    }
  }
  return out;
}

export function deductReservesFromStock(
  stock: number | null,
  reserve: number,
): number | null {
  if (stock == null) return null;
  return stock - reserve;
}

function isSaveReadQuest(quest: LiveQuest): boolean {
  return Boolean(quest.instanceId || quest.guid != null || quest.progress || quest.timer || quest.objectives);
}
