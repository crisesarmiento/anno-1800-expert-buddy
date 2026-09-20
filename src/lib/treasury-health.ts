import { canCompareSamples, islandStockDelta } from "./history/compare.ts";
import type { HistorySample } from "./history/types.ts";

export const ESSENTIAL_GOOD_IDS = ["wood", "fish", "schnapps", "bread", "clothes", "steel"] as const;

export type EssentialGoodId = (typeof ESSENTIAL_GOOD_IDS)[number];

export type TreasuryVerdict =
  | { kind: "incomplete"; reason: "few-samples" | "no-treasury"; count: number }
  | {
      kind: "isolated";
      from: number;
      to: number;
      previousSavedAt: string;
      savedAt: string;
    }
  | {
      kind: "recurrent";
      from: number;
      to: number;
      drops: number;
      previousSavedAt: string;
      savedAt: string;
    }
  | { kind: "rising"; from: number; to: number; savedAt: string }
  | { kind: "stable"; from: number; to: number; savedAt: string };

export type EssentialDrop = {
  id: string;
  name: string;
  from: number;
  to: number;
  pairs: number;
  previousSavedAt: string;
  savedAt: string;
  scope: "island" | "global";
  campaignId: string;
  branchId: string;
  regionId?: number;
  areaId?: number;
};

function dated(sample: HistorySample) {
  return sample.savedAt ?? sample.recordedAt;
}

function cashSeries(samples: HistorySample[]) {
  return samples.filter((row) => typeof row.summary.treasury === "number");
}

/** Prefer the current branch tip; ignore other sequences. */
export function samplesOnBranch(samples: HistorySample[], branchId?: string) {
  if (!samples.length) return [];
  const branch = branchId ?? samples[samples.length - 1]?.branchId;
  return samples.filter((row) => row.branchId === branch);
}

export function treasuryHealth(samples: HistorySample[]): TreasuryVerdict {
  const series = cashSeries(samples);
  if (series.length < 2) {
    return {
      kind: "incomplete",
      reason: series.length === 0 ? "no-treasury" : "few-samples",
      count: series.length,
    };
  }
  const values = series.map((row) => row.summary.treasury as number);
  const first = series[0]!;
  const last = series[series.length - 1]!;
  const from = values[0]!;
  const to = values[values.length - 1]!;
  const savedAt = dated(last);
  if (series.length < 3) {
    const prev = series[series.length - 2]!;
    if (to < from) {
      return { kind: "isolated", from, to, previousSavedAt: dated(prev), savedAt };
    }
    if (to > from) return { kind: "rising", from, to, savedAt };
    return { kind: "stable", from, to, savedAt };
  }
  const recent = values.slice(-3);
  const drops = recent.filter((value, index) => index > 0 && value < recent[index - 1]!).length;
  const recovered = to >= values[values.length - 2]!;
  if (drops >= 2 && to < recent[0]!) {
    return {
      kind: "recurrent",
      from: recent[0]!,
      to,
      drops,
      previousSavedAt: dated(series[series.length - 3]!),
      savedAt,
    };
  }
  if (to < from && recovered) {
    return {
      kind: "isolated",
      from,
      to: values[values.length - 2]!,
      previousSavedAt: dated(first),
      savedAt,
    };
  }
  if (to < from) {
    return {
      kind: "isolated",
      from,
      to,
      previousSavedAt: dated(series[series.length - 2]!),
      savedAt,
    };
  }
  if (to > from) return { kind: "rising", from, to, savedAt };
  return { kind: "stable", from, to, savedAt };
}

function islandDropKey(
  sample: HistorySample,
  regionId: number,
  areaId: number,
  goodId: string,
): string {
  return `${sample.campaignId}:${sample.branchId}:island:${regionId}:${areaId}:${goodId}`;
}

function globalDropKey(sample: HistorySample, goodId: string): string {
  return `${sample.campaignId}:${sample.branchId}:global:${goodId}`;
}

export function essentialStockDrops(samples: HistorySample[]): EssentialDrop[] {
  if (samples.length < 3) return [];
  const counts = new Map<string, EssentialDrop>();
  for (let i = 1; i < samples.length; i++) {
    const previous = samples[i - 1]!;
    const current = samples[i]!;
    if (!canCompareSamples(previous, current).ok) continue;
    const islands = current.summary.islands;
    for (const island of islands) {
      const delta = islandStockDelta(previous, current, island.regionId, island.areaId);
      if (!delta.ok) continue;
      for (const change of delta.changes) {
        if (change.delta >= 0) continue;
        if (!ESSENTIAL_GOOD_IDS.includes(change.id as EssentialGoodId)) continue;
        const key = islandDropKey(current, island.regionId, island.areaId, change.id);
        const prev = counts.get(key);
        counts.set(key, {
          id: change.id,
          name: change.name,
          from: change.previousAmount,
          to: change.amount,
          pairs: (prev?.pairs ?? 0) + 1,
          previousSavedAt: change.previousSavedAt,
          savedAt: dated(current),
          scope: "island",
          campaignId: current.campaignId,
          branchId: current.branchId,
          regionId: island.regionId,
          areaId: island.areaId,
        });
      }
    }
    const before = new Map((previous.summary.globalGoods ?? []).map((good) => [good.id, good]));
    for (const good of current.summary.globalGoods ?? []) {
      if (!ESSENTIAL_GOOD_IDS.includes(good.id as EssentialGoodId)) continue;
      const prior = before.get(good.id);
      if (!prior || good.amount >= prior.amount) continue;
      const key = globalDropKey(current, good.id);
      const prev = counts.get(key);
      counts.set(key, {
        id: good.id,
        name: good.name,
        from: prior.amount,
        to: good.amount,
        pairs: (prev?.pairs ?? 0) + 1,
        previousSavedAt: dated(previous),
        savedAt: dated(current),
        scope: "global",
        campaignId: current.campaignId,
        branchId: current.branchId,
      });
    }
  }
  return [...counts.values()].filter((row) => row.pairs >= 2);
}

export function observedAfterChange(
  samples: HistorySample[],
  sinceSampleId: string,
): { kind: "up" | "down" | "unknown"; before?: number; after?: number } {
  const index = samples.findIndex((row) => row.id === sinceSampleId);
  if (index < 0) return { kind: "unknown" };
  const before = samples[index]?.summary.treasury;
  const after = samples[samples.length - 1]?.summary.treasury;
  if (typeof before !== "number" || typeof after !== "number") return { kind: "unknown" };
  if (after > before) return { kind: "up", before, after };
  if (after < before) return { kind: "down", before, after };
  return { kind: "unknown", before, after };
}
