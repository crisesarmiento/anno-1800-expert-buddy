import type { LiveSnapshot } from "../live/types.ts";
import { campaignHistoryStore, type HistoryStore } from "./store.ts";
import type { HistoryRecordResult } from "./types.ts";

/** Record a live snapshot into local history. Never writes harbor-live.json. */
export function ingestSnapshotHistory(
  snapshot: LiveSnapshot,
  opts?: { explicitCampaignId?: string; store?: HistoryStore },
): Promise<HistoryRecordResult> {
  const store = opts?.store ?? campaignHistoryStore();
  return store.record(snapshot, { explicitCampaignId: opts?.explicitCampaignId });
}
