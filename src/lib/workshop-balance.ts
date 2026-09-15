import type { LivePulseHint, LiveSnapshot } from "./live/types.ts";
import { BUILDINGS, CHAINS, chainByGood, chainById } from "./sim/chains.ts";
import { chapterAllowsBuilding, goodBalance } from "./sim/compute.ts";
import type { CampaignChapterId, CityStats, GoodId, SimMode } from "./sim/types.ts";

export type WorkshopGoodStatus = "falta" | "alcanza" | "saturado";

export type WorkshopGoodClass = {
  goodId: string;
  status: WorkshopGoodStatus;
};

/** Slice of the existing sim — gap/demand/supply only. */
export type WorkshopSimSlice = Pick<CityStats, "demand" | "supply" | "gap"> | {
  demand?: Partial<Record<string, number | null>>;
  supply?: Partial<Record<string, number | null>>;
  gap?: Partial<Record<string, number | null>>;
};

export type ClassifyWorkshopInput = {
  snapshot: LiveSnapshot | null;
  stats?: WorkshopSimSlice | null;
  /** Default campaign. Sandbox (perfect) lifts the chapter gate below. */
  mode?: SimMode;
  /** Already-seen campaign chapter. Default ch1. Ignored in sandbox. */
  chapterId?: CampaignChapterId;
};

const STOCK_LOW = 5;
const STOCK_HIGH = 40;

const LIVE_CHAIN_ALIAS: Record<string, string> = {
  wood: "timber",
  clothes: "work-clothes",
  workers: "sausages",
};

function pulseHintIsUnknown(hint: LivePulseHint | undefined | null): boolean {
  if (!hint) return true;
  return hint.coins === "unknown" || hint.houses === "unknown";
}

function resolveChain(goodId: string) {
  const aliased = LIVE_CHAIN_ALIAS[goodId] ?? goodId;
  const asGood = chainByGood(goodId as GoodId) ?? chainByGood(aliased as GoodId);
  if (asGood) return asGood;
  const byId = chainById(goodId) ?? chainById(aliased);
  if (byId) return byId;
  return CHAINS.find((chain) =>
    chain.campaign.some((link) => BUILDINGS[link.buildingId]?.output === goodId),
  );
}

function campaignExpected(goodId: string): number {
  const chain = resolveChain(goodId);
  if (!chain) return 0;
  return chain.campaign.reduce((sum, link) => sum + link.count, 0);
}

function chainHitCount(goodId: string, snapshot: LiveSnapshot): number {
  const tel = snapshot.telemetry;
  if (!tel) return 0;
  const chain = resolveChain(goodId);
  let hits = 0;
  if (chain) {
    for (const link of chain.campaign) {
      const row = (tel.buildings ?? []).find((item) => item.id === link.buildingId);
      if (!row) continue;
      hits += row.count && row.count > 0 ? row.count : 1;
    }
  }
  if (hits === 0) {
    const liveId = chain?.id === "timber" ? "wood" : (chain?.id ?? LIVE_CHAIN_ALIAS[goodId] ?? goodId);
    const aliases = new Set([goodId, chain?.id, LIVE_CHAIN_ALIAS[goodId], liveId].filter(Boolean));
    if ((tel.chains ?? []).some((item) => aliases.has(item.id))) hits = 1;
  }
  return hits;
}

/**
 * Campaign gate: a seen good still hides until its chain's first building
 * is chapter-allowed. Sandbox lifts the gate — the wiki ratio has no chapters.
 */
function chapterGateAllows(goodId: string, mode: SimMode, chapterId: CampaignChapterId): boolean {
  if (mode === "perfect") return true;
  const chain = resolveChain(goodId);
  const firstBuildingId = chain?.campaign[0]?.buildingId;
  if (!firstBuildingId) return true;
  return chapterAllowsBuilding(chapterId, firstBuildingId);
}

function classifyOne(
  goodId: string,
  amount: number,
  chainHits: number,
  stats: WorkshopSimSlice | null | undefined,
): WorkshopGoodStatus {
  const gap = stats?.gap?.[goodId as GoodId];
  const demand = stats?.demand?.[goodId as GoodId];
  const sim = goodBalance(gap, demand);
  if (sim === "falta") return "falta";
  if (amount <= STOCK_LOW && (sim == null || chainHits === 0)) return "falta";

  const expected = campaignExpected(goodId);
  const stockHigh = amount >= STOCK_HIGH;
  const chainHard = expected > 0 ? chainHits > expected : chainHits >= 3;
  const simSaturado = sim === "saturado";
  const votes = Number(stockHigh) + Number(chainHard) + Number(simSaturado);
  if (votes >= 2) return "saturado";
  return "alcanza";
}

/**
 * Single source of truth for per-good Taller balance.
 * Seen goods only (telemetry.goods). Stock + chain hits + sim. No invented inventory.
 */
export function classifyWorkshopGoods(input: ClassifyWorkshopInput): WorkshopGoodClass[] {
  const snapshot = input.snapshot;
  const goods = snapshot?.telemetry?.goods ?? [];
  if (!snapshot || goods.length === 0) return [];
  const mode = input.mode ?? "campaign";
  const chapterId = input.chapterId ?? "ch1";
  return goods
    .filter((row) => chapterGateAllows(row.id, mode, chapterId))
    .map((row) => ({
      goodId: row.id,
      status: classifyOne(row.id, row.amount, chainHitCount(row.id, snapshot), input.stats),
    }));
}

/** Tips red/saturated. Unknown pulseHint is never red. */
export function workshopSaturatedSignal(
  rows: readonly WorkshopGoodClass[],
  pulseHint: LivePulseHint | undefined | null,
): boolean {
  if (pulseHintIsUnknown(pulseHint)) return false;
  return rows.some((row) => row.status === "saturado");
}

/** Per-good paint for /taller. Unknown pulseHint never paints saturado red. */
export type WorkshopGoodPaint = WorkshopGoodStatus | "none";

export function workshopGoodPaint(
  status: WorkshopGoodStatus,
  pulseHint: LivePulseHint | undefined | null,
): WorkshopGoodPaint {
  if (status === "saturado" && pulseHintIsUnknown(pulseHint)) return "none";
  return status;
}
