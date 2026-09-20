import { lookupGuid } from "../data/guids.ts";
import { parseNestedFileDbTree, leafI32, leafText, type FileDbNode } from "./a7s-read.ts";
import { islandKey } from "./island-key.ts";
import { isPlayerParticipant } from "./evidence.ts";
import {
  LIVE_MAX_ISLAND_BUILDINGS,
  LIVE_MAX_ISLAND_SNAPSHOTS,
  LIVE_MAX_ISLAND_STOCK,
  type LiveBuildingHit,
  type LiveFieldCoverage,
  type LiveIslandNameSource,
  type LiveIslandSnapshot,
  type LiveIslandStock,
} from "./types.ts";

export { LIVE_MAX_ISLAND_BUILDINGS, LIVE_MAX_ISLAND_SNAPSHOTS, LIVE_MAX_ISLAND_STOCK };

export type ExtractedIsland = {
  regionId: number;
  areaId: number;
  ownerId: number;
  cityName: string | null;
  cityNameGuid: number | null;
  name: string;
  nameSource: LiveIslandNameSource;
  stock?: LiveIslandStock[];
  buildings?: LiveBuildingHit[];
};

export type ExtractedSaveMeta = {
  snapshotId: string | null;
  simTime: number | null;
};

export type ExtractedSaveIslands = {
  islands: ExtractedIsland[];
  meta: ExtractedSaveMeta;
};

function child(node: FileDbNode, tag: string): FileDbNode | undefined {
  return node.children.find((item) => item.tag === tag);
}

function leaf(node: FileDbNode, attr: string): Buffer | undefined {
  return node.leaves.find((item) => item.attr === attr)?.bytes;
}

function leafInt(node: FileDbNode, attr: string): number | null {
  const bytes = leaf(node, attr);
  return bytes ? leafI32(bytes) : null;
}

function findDescendant(node: FileDbNode, tag: string): FileDbNode | undefined {
  if (node.tag === tag) return node;
  for (const item of node.children) {
    const hit = findDescendant(item, tag);
    if (hit) return hit;
  }
  return undefined;
}

function findLeafInt(node: FileDbNode, attr: string, depth = 4): number | null {
  const direct = leafInt(node, attr);
  if (direct != null) return direct;
  if (depth <= 0) return null;
  for (const item of node.children) {
    const hit = findLeafInt(item, attr, depth - 1);
    if (hit != null) return hit;
  }
  return null;
}

function findLeafText(node: FileDbNode, attr: string, depth = 4): string | null {
  const bytes = leaf(node, attr);
  if (bytes) {
    const text = leafText(bytes).trim();
    if (text) return text;
  }
  if (depth <= 0) return null;
  for (const item of node.children) {
    const hit = findLeafText(item, attr, depth - 1);
    if (hit) return hit;
  }
  return null;
}

export { islandKey };

export function neutralIslandName(cityNameGuid: number | null, areaId: number) {
  if (cityNameGuid != null && cityNameGuid !== 0) return `[${cityNameGuid}]`;
  return `area-${areaId}`;
}

export function resolveIslandName(input: {
  cityName: string | null;
  cityNameGuid: number | null;
  areaId: number;
  translate?: (guid: number) => string | undefined;
}): { name: string; nameSource: LiveIslandNameSource } {
  const cityName = input.cityName?.trim() ?? "";
  if (cityName) return { name: cityName.slice(0, 200), nameSource: "city-name" };
  if (input.cityNameGuid != null && input.cityNameGuid !== 0) {
    const translated = input.translate?.(input.cityNameGuid)?.trim();
    if (translated) return { name: translated.slice(0, 200), nameSource: "city-name-guid" };
    // Untranslated GUID stays bracketed; nameSource marks evidence for coverage.islandNames.
    return { name: `[${input.cityNameGuid}]`, nameSource: "city-name-guid" };
  }
  return { name: `area-${input.areaId}`, nameSource: "neutral" };
}

function parseStrgPairs(bytes: Buffer): { guid: number; amount: number }[] {
  const out: { guid: number; amount: number }[] = [];
  for (let i = 0; i + 8 <= bytes.length; i += 8) {
    out.push({ guid: bytes.readInt32LE(i), amount: bytes.readInt32LE(i + 4) });
  }
  return out;
}

function collectAttr(node: FileDbNode, attr: string, acc: Buffer[]) {
  for (const item of node.leaves) {
    if (item.attr === attr && item.bytes.length) acc.push(item.bytes);
  }
  for (const childNode of node.children) collectAttr(childNode, attr, acc);
}

function areaManagerId(tag: string): number | null {
  const match = /^AreaManager_(-?\d+)$/.exec(tag);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

function areaRecords(areaInfo: FileDbNode): { areaId: number | null; node: FileDbNode }[] {
  const records: { areaId: number | null; node: FileDbNode }[] = [];
  const idLeaves = areaInfo.leaves
    .map((item) => leafI32(item.bytes))
    .filter((value): value is number => value != null);
  if (areaInfo.children.length > 0 && idLeaves.length === areaInfo.children.length) {
    return areaInfo.children.map((node, index) => ({ areaId: idLeaves[index] ?? null, node }));
  }
  for (const node of areaInfo.children) {
    records.push({
      areaId: leafInt(node, "Identifier") ?? leafInt(node, "AreaID"),
      node,
    });
  }
  return records;
}

function stockFromManager(manager: FileDbNode): LiveIslandStock[] | undefined {
  const storage = findDescendant(manager, "AreaStorageManager");
  if (!storage) return undefined;
  const blobs: Buffer[] = [];
  collectAttr(storage, "StrgLrg", blobs);
  if (blobs.length !== 1 || blobs[0].length % 8 !== 0) return undefined;
  const byId = new Map<string, LiveIslandStock>();
  for (const blob of blobs) {
    for (const pair of parseStrgPairs(blob)) {
      const row = lookupGuid(pair.guid);
      if (row?.kind !== "good") continue;
      if (pair.amount < 0 || byId.has(row.id)) return undefined;
      byId.set(row.id, { id: row.id, name: row.name, amount: pair.amount });
    }
  }
  const stock = [...byId.values()];
  return stock.length ? stock : undefined;
}

function addBuildingCount(counts: Map<string, LiveBuildingHit>, guid: number, amount: number) {
  if (amount <= 0) return;
  const row = lookupGuid(guid);
  if (row?.kind !== "building") return;
  const prev = counts.get(row.id);
  counts.set(row.id, { id: row.id, name: row.name, count: (prev?.count ?? 0) + amount });
}

function buildingsFromCountsLeaves(manager: FileDbNode): LiveBuildingHit[] | undefined {
  const counts = new Map<string, LiveBuildingHit>();
  const walk = (node: FileDbNode) => {
    const inCounts = node.tag === "CountsPerGUID" || node.tag.endsWith("CountsPerGUID");
    if (inCounts) {
      let pending: number | null = null;
      for (const item of node.leaves) {
        if (item.bytes.length >= 8 && item.bytes.length % 8 === 0) {
          for (let i = 0; i + 8 <= item.bytes.length; i += 8) {
            addBuildingCount(counts, item.bytes.readInt32LE(i), item.bytes.readInt32LE(i + 4));
          }
          continue;
        }
        const value = leafI32(item.bytes);
        if (value == null) continue;
        if (pending == null) pending = value;
        else {
          addBuildingCount(counts, pending, value);
          pending = null;
        }
      }
    }
    for (const childNode of node.children) walk(childNode);
  };
  walk(manager);
  const hits = [...counts.values()];
  return hits.length ? hits : undefined;
}

function saveCoverage(): LiveFieldCoverage {
  return { source: "save" };
}

export function islandSnapshotFromExtracted(
  island: ExtractedIsland,
  observedAt?: string,
): LiveIslandSnapshot {
  const identity: LiveFieldCoverage = { source: "save" };
  if (observedAt) identity.observedAt = observedAt;
  const snapshot: LiveIslandSnapshot = {
    regionId: island.regionId,
    areaId: island.areaId,
    ownerId: island.ownerId,
    name: island.name,
    nameSource: island.nameSource,
    coverage: { identity },
  };
  if (island.stock?.length && island.stock.length <= LIVE_MAX_ISLAND_STOCK) {
    snapshot.stock = island.stock;
    snapshot.coverage.stock = { ...saveCoverage() };
    if (observedAt) snapshot.coverage.stock.observedAt = observedAt;
  }
  if (island.buildings?.length && island.buildings.length <= LIVE_MAX_ISLAND_BUILDINGS) {
    snapshot.buildings = island.buildings;
    snapshot.coverage.buildings = { ...saveCoverage() };
    if (observedAt) snapshot.coverage.buildings.observedAt = observedAt;
  }
  return snapshot;
}

/**
 * Player colonies from nested SessionData/AreaInfo + AreaManager.
 * Trading-post/route association is by areaId, not display name.
 */
export function extractIslands(dataBytes: Buffer): ExtractedSaveIslands {
  const root = parseNestedFileDbTree(dataBytes);
  if (!root) return { islands: [], meta: { snapshotId: null, simTime: null } };

  const metaManager = child(root, "MetaGameManager") ?? root;
  const snapshotId =
    findLeafText(metaManager, "SnapshotID") ?? findLeafText(metaManager, "SaveGUID");
  const sessionTimes: number[] = [];

  const islands: ExtractedIsland[] = [];
  const sessions = findDescendant(root, "GameSessions");
  const sessionNodes = sessions?.children?.length ? sessions.children : [];

  const walkSession = (sessionNode: FileDbNode) => {
    const desc = child(sessionNode, "SessionDesc") ?? sessionNode;
    const regionId =
      leafInt(desc, "SessionGUID") ??
      leafInt(sessionNode, "SessionGUID") ??
      findLeafInt(sessionNode, "SessionGUID");
    if (regionId == null) return;
    const manager = findDescendant(sessionNode, "GameSessionManager");
    if (!manager) return;
    const sessionTotal = leafInt(manager, "SessionTotalTime") ?? leafInt(manager, "GameTime");
    if (sessionTotal != null && sessionTotal > 0) sessionTimes.push(sessionTotal);
    const areaInfo = child(manager, "AreaInfo") ?? findDescendant(manager, "AreaInfo");
    const areaManagers = child(manager, "AreaManagers") ?? findDescendant(manager, "AreaManagers");
    const managersByArea = new Map<number, FileDbNode>();
    if (areaManagers) {
      for (const mgr of areaManagers.children) {
        const fromTag = areaManagerId(mgr.tag);
        const fromLeaf = leafInt(mgr, "Identifier") ?? leafInt(mgr, "AreaID");
        const areaId = fromTag ?? fromLeaf;
        if (areaId == null) continue;
        managersByArea.set(areaId, mgr);
      }
    }
    if (!areaInfo) return;
    for (const record of areaRecords(areaInfo)) {
      const ownerNode = child(record.node, "Owner");
      const ownerId = ownerNode ? leafInt(ownerNode, "id") : leafInt(record.node, "Owner");
      if (ownerId == null) continue;
      const areaId =
        record.areaId ?? leafInt(record.node, "Identifier") ?? leafInt(record.node, "AreaID");
      if (areaId == null) continue;
      const cityNameBytes = leaf(record.node, "CityName");
      const cityName = cityNameBytes ? leafText(cityNameBytes).trim() || null : null;
      const cityNameGuid = leafInt(record.node, "CityNameGuid");
      const resolved = resolveIslandName({ cityName, cityNameGuid, areaId });
      const extracted: ExtractedIsland = {
        regionId,
        areaId,
        ownerId,
        cityName,
        cityNameGuid,
        name: resolved.name,
        nameSource: resolved.nameSource,
      };
      const managerNode = managersByArea.get(areaId);
      if (managerNode && isPlayerParticipant(ownerId)) {
        const stock = stockFromManager(managerNode);
        if (stock) extracted.stock = stock;
        const buildings = buildingsFromCountsLeaves(managerNode);
        if (buildings) extracted.buildings = buildings;
      }
      islands.push(extracted);
    }
  };

  if (sessionNodes.length) {
    for (const sessionNode of sessionNodes) walkSession(sessionNode);
  } else {
    const manager = findDescendant(root, "GameSessionManager");
    if (manager) walkSession(manager);
  }

  const lastSnapshot = findLeafInt(metaManager, "lastSnapshot");
  const simTime =
    lastSnapshot != null && lastSnapshot > 0
      ? lastSnapshot
      : sessionTimes.length
        ? Math.max(...sessionTimes)
        : (findLeafInt(metaManager, "GameTime") ??
          findLeafInt(metaManager, "SimulationTime") ??
          findLeafInt(metaManager, "SessionTime"));

  return {
    islands,
    meta: { snapshotId, simTime },
  };
}

export function playerIslands(islands: ExtractedIsland[]): ExtractedIsland[] {
  return islands.filter((island) => isPlayerParticipant(island.ownerId));
}

export function islandByAreaId(islands: ExtractedIsland[], areaId: number): ExtractedIsland | null {
  const matches = islands.filter((island) => island.areaId === areaId);
  return matches.length === 1 ? matches[0]! : null;
}

export function capIslandSnapshots(islands: LiveIslandSnapshot[]): {
  kept: LiveIslandSnapshot[];
  omitted: number;
} {
  const player = islands.filter((island) => isPlayerParticipant(island.ownerId));
  const rest = islands.filter((island) => !isPlayerParticipant(island.ownerId));
  const ranked = [...player, ...rest];
  const kept = ranked.slice(0, LIVE_MAX_ISLAND_SNAPSHOTS).map((island) => {
    const next = { ...island };
    if (next.stock && next.stock.length > LIVE_MAX_ISLAND_STOCK) {
      delete next.stock;
      const { stock: _stock, ...coverage } = next.coverage;
      next.coverage = coverage;
    }
    if (next.buildings && next.buildings.length > LIVE_MAX_ISLAND_BUILDINGS) {
      delete next.buildings;
      const { buildings: _buildings, ...coverage } = next.coverage;
      next.coverage = coverage;
    }
    return next;
  });
  return { kept, omitted: Math.max(0, ranked.length - kept.length) };
}
