import type { LiveIslandStock, LiveSnapshot } from "../live/types.ts";

export const HISTORY_DB = "harbor-buddy-campaign-history";
export const HISTORY_SAMPLES_STORE = "samples";
export const HISTORY_CAMPAIGNS_STORE = "campaigns";
export const HISTORY_MAX_SAMPLES = 200;
export const HISTORY_MAX_ISLANDS = 40;
export const HISTORY_MAX_STOCK = 24;

export type HistoryIsland = {
  regionId: number;
  areaId: number;
  ownerId: number;
  name: string;
  stock?: LiveIslandStock[];
  stockOmitted?: true;
};

export type HistorySummary = {
  savedAt?: string;
  simTime?: number | null;
  snapshotId?: string | null;
  sessionName?: string;
  campaignId?: string;
  playerId?: number;
  islands: HistoryIsland[];
  globalGoods?: LiveIslandStock[];
  islandsOmitted?: number;
};

export type HistorySample = {
  id: string;
  campaignId: string;
  branchId: string;
  recordedAt: string;
  savedAt?: string;
  simTime?: number | null;
  snapshotId?: string | null;
  contentHash: string;
  summary: HistorySummary;
};

export type HistoryCampaign = {
  id: string;
  fingerprint: string | null;
  createdAt: string;
  label?: string;
  headId?: string;
};

export type CampaignCandidate = {
  id: string;
  label?: string;
  fingerprint: string | null;
};

export type CampaignResolveOk = {
  ok: true;
  campaignId: string;
  method: "explicit" | "snapshot" | "fingerprint";
};

export type CampaignResolveAmbiguous = {
  ok: false;
  reason: "ambiguous";
  candidates: CampaignCandidate[];
};

export type CampaignResolveResult = CampaignResolveOk | CampaignResolveAmbiguous;

export type HistoryRecordOk = {
  ok: true;
  sample: HistorySample;
  deduped: boolean;
  branched: boolean;
  campaignId: string;
};

export type HistoryRecordAmbiguous = {
  ok: false;
  reason: "ambiguous";
  candidates: CampaignCandidate[];
  snapshot: LiveSnapshot;
};

export type HistoryRecordResult = HistoryRecordOk | HistoryRecordAmbiguous;

export type StockDelta = {
  id: string;
  name: string;
  previousAmount: number;
  amount: number;
  delta: number;
  previousSavedAt: string;
};

export type CompareStockOk = {
  ok: true;
  changes: StockDelta[];
};

export type CompareStockRefuse = {
  ok: false;
  reason: "cross-branch" | "against-future" | "cross-campaign" | "missing-identity";
};

export type CompareStockResult = CompareStockOk | CompareStockRefuse;
