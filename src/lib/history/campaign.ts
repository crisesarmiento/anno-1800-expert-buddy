import { isPlayerParticipant } from "../live/evidence.ts";
import { islandKey } from "../live/island-key.ts";
import type { LiveSnapshot } from "../live/types.ts";
import type { CampaignCandidate, CampaignResolveResult, HistoryCampaign } from "./types.ts";

/**
 * Legacy map signature, retained for reading old history metadata only.
 * It must never identify a campaign: colonization and repeated maps collide.
 */
export function campaignFingerprint(snapshot: LiveSnapshot): string | null {
  const keys = (snapshot.islandSnapshots ?? [])
    .filter((island) => isPlayerParticipant(island.ownerId))
    .map((island) => islandKey(island.regionId, island.areaId))
    .sort();
  if (!keys.length) return null;
  return `islands:${keys.join(",")}`;
}

export function resolveCampaignId(input: {
  snapshot: LiveSnapshot;
  explicitCampaignId?: string;
  known: HistoryCampaign[];
}): CampaignResolveResult {
  if (input.snapshot.campaignId?.trim()) {
    return { ok: true, campaignId: input.snapshot.campaignId.trim(), method: "snapshot" };
  }
  if (input.explicitCampaignId?.trim()) {
    return {
      ok: true,
      campaignId: input.explicitCampaignId.trim(),
      method: "explicit",
    };
  }
  // Area IDs describe a map, not a campaign. Colonization changes the set and
  // another playthrough can reuse the exact same IDs. Require explicit choice.
  return { ok: false, reason: "ambiguous", candidates: asCandidates(input.known) };
}

function asCandidates(rows: HistoryCampaign[]): CampaignCandidate[] {
  return rows.map((row) => ({
    id: row.id,
    fingerprint: row.fingerprint,
    label: row.label,
  }));
}

export function sampleClock(sample: { simTime?: number | null; savedAt?: string }): number | null {
  if (typeof sample.simTime === "number" && Number.isFinite(sample.simTime)) {
    return sample.simTime;
  }
  if (sample.savedAt) {
    const ms = Date.parse(sample.savedAt);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}
