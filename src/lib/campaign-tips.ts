import seed from "./data/campaign-tips.json" with { type: "json" };
import type { LiveSnapshot } from "./live/types.ts";

export const CAMPAIGN_TIPS_SCHEMA = "campaign-tips-v1" as const;
export const CAMPAIGN_TIP_CHIP = "Marcá lo que ya viste.";
export const TEN_SECOND_MAX = 140;

export const TIP_CATEGORIES = ["terrain", "org", "economy"] as const;
export type TipCategory = (typeof TIP_CATEGORIES)[number];

export const LIVE_FAMILIES = ["coins", "brake", "applies-now"] as const;
export type LiveTipFamily = (typeof LIVE_FAMILIES)[number];

export const TIP_REGIONS = ["old-world", "new-world", "arctic", "enbesa"] as const;
export type TipRegion = (typeof TIP_REGIONS)[number];

export type CampaignTip = {
  id: string;
  category: TipCategory;
  liveFamily: LiveTipFamily;
  region: TipRegion;
  requires: string[];
  line: string;
};

export type CampaignTipPick = {
  kind: "esto-ahora" | "chip";
  family: LiveTipFamily;
  id: string | null;
  line: string;
};

export type CampaignTipInput = {
  snapshot: LiveSnapshot | null;
  stamps?: string[];
  missionId?: string | null;
  completed?: string[];
};

const RATIO = /\d+\s*:\s*\d+/;
const WIKI = /wiki|fandom|ubisoft|https?:\/\//i;

const NEW_WORLD = /nuevo mundo|new world|la isla|isabel|ch3-|arrived:new-world/i;
const ARCTIC = /\b(arctic|ártico|arrived:arctic)\b/i;
const ENBESA = /\b(enbesa|arrived:enbesa)\b/i;

function asTip(row: unknown): CampaignTip | null {
  if (!row || typeof row !== "object") return null;
  const item = row as Record<string, unknown>;
  const category = item.category;
  const liveFamily = item.liveFamily;
  const region = item.region;
  if (!TIP_CATEGORIES.includes(category as TipCategory)) return null;
  if (!LIVE_FAMILIES.includes(liveFamily as LiveTipFamily)) return null;
  if (!TIP_REGIONS.includes(region as TipRegion)) return null;
  if (typeof item.id !== "string" || typeof item.line !== "string") return null;
  const requires = Array.isArray(item.requires)
    ? item.requires.filter((token): token is string => typeof token === "string")
    : [];
  return {
    id: item.id,
    category: category as TipCategory,
    liveFamily: liveFamily as LiveTipFamily,
    region: region as TipRegion,
    requires,
    line: item.line,
  };
}

export const campaignTips: CampaignTip[] = (seed.tips ?? []).map(asTip).filter((row): row is CampaignTip => Boolean(row));

export function tenSecondLine(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (RATIO.test(clean) || WIKI.test(clean)) return "Seguí el diario. Nada más.";
  if (clean.length <= TEN_SECOND_MAX) return clean;
  const cut = clean.slice(0, TEN_SECOND_MAX - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 80 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/**
 * Live watcher family. Thresholds only — no mission parse, no wiki rank.
 * balance red → coins; saturation → brake; island hit → applies now.
 */
export function liveTipFamily(snapshot: LiveSnapshot | null): LiveTipFamily | null {
  if (!snapshot) return null;
  if (snapshot.pulseHint?.coins === "down") return "coins";
  const houses = snapshot.pulseHint?.houses;
  if (houses === "yellow" || houses === "empty") return "brake";
  if ((snapshot.telemetry?.islands?.length ?? 0) > 0) return "applies-now";
  return null;
}

function blobOf(input: CampaignTipInput): string {
  const parts: string[] = [];
  for (const stamp of input.stamps ?? []) parts.push(stamp);
  if (input.missionId) parts.push(input.missionId);
  for (const id of input.completed ?? []) parts.push(id);
  const snapshot = input.snapshot;
  if (!snapshot) return parts.join("\n");
  for (const quest of snapshot.quests ?? []) {
    parts.push(quest.title);
    if (quest.objective) parts.push(quest.objective);
  }
  const tel = snapshot.telemetry;
  if (tel) {
    for (const row of [...(tel.islands ?? []), ...(tel.buildings ?? []), ...(tel.people ?? []), ...(tel.chains ?? [])]) {
      parts.push(row.id, row.name);
    }
    for (const hint of tel.hints ?? []) parts.push(hint);
  }
  return parts.join("\n");
}

export function regionArrived(region: TipRegion, blob: string): boolean {
  if (region === "old-world") return true;
  if (region === "new-world") return NEW_WORLD.test(blob);
  if (region === "arctic") return ARCTIC.test(blob);
  return ENBESA.test(blob);
}

function alreadySeen(tip: CampaignTip, blob: string): boolean {
  if (!regionArrived(tip.region, blob)) return false;
  const lower = blob.toLowerCase();
  return tip.requires.every((token) => lower.includes(token.toLowerCase()));
}

export function filterSeenTips(family: LiveTipFamily, input: CampaignTipInput): CampaignTip[] {
  const blob = blobOf(input);
  return campaignTips.filter((tip) => tip.liveFamily === family && alreadySeen(tip, blob));
}

/** One 10s tip as Esto ahora, or one chip. Never a list. */
export function pickCampaignTip(input: CampaignTipInput): CampaignTipPick | null {
  const family = liveTipFamily(input.snapshot);
  if (!family) return null;
  const seen = filterSeenTips(family, input);
  const tip = seen[0];
  if (!tip) {
    return { kind: "chip", family, id: null, line: CAMPAIGN_TIP_CHIP };
  }
  return {
    kind: "esto-ahora",
    family,
    id: tip.id,
    line: tenSecondLine(tip.line),
  };
}

export function campaignEstoAhoraLine(input: CampaignTipInput, fallback: string): string {
  const pick = pickCampaignTip(input);
  if (!pick || pick.kind !== "esto-ahora") return fallback;
  return pick.line;
}
