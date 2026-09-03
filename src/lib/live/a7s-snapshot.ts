import { lookupGuid } from "../data/guids.ts";
import { unpackA7s, visitFileDb, leafI32, leafText } from "./a7s-read.ts";
import type { LiveNamedHit, LivePulseHint, LiveQuest, LiveSnapshot, LiveTelemetry, LiveWorkforce } from "./types.ts";

const MONEY_GUID = 1010017;

export type SaveScan = {
  sessionName: string;
  buildingCounts: Map<string, { name: string; count: number }>;
  goods: Map<string, { name: string; amount: number }>;
  money: number | null;
  islands: Set<string>;
  islandNames: Map<string, string>;
  questGuids: number[];
  farmers: boolean;
  workers: boolean;
  artisans: boolean;
  engineers: boolean;
};

function addCount(map: Map<string, { name: string; count: number }>, id: string, name: string, n: number) {
  const prev = map.get(id);
  map.set(id, { name, count: (prev?.count ?? 0) + n });
}

function parseStrgPairs(bytes: Buffer): { guid: number; amount: number }[] {
  const out: { guid: number; amount: number }[] = [];
  for (let i = 0; i + 8 <= bytes.length; i += 8) {
    out.push({ guid: bytes.readInt32LE(i), amount: bytes.readInt32LE(i + 4) });
  }
  return out;
}

export function scanSaveBytes(buf: Buffer): SaveScan {
  const files = unpackA7s(buf);
  const scan: SaveScan = {
    sessionName: "",
    buildingCounts: new Map(),
    goods: new Map(),
    money: null,
    islands: new Set(),
    islandNames: new Map(),
    questGuids: [],
    farmers: false,
    workers: false,
    artisans: false,
    engineers: false,
  };

  for (const file of files) {
    if (file.name === "meta.a7s") {
      visitFileDb(file.bytes, (_path, attr, bytes) => {
        if (attr === "CorporationSaveGameName") {
          const name = leafText(bytes).replace(/\.a7s$/i, "");
          if (name) scan.sessionName = name.slice(0, 200);
        }
      });
    }
  }

  const data = files.find((file) => file.name === "data.a7s") ?? files[files.length - 1];
  if (!data) return scan;

  let pendingGuid: number | null = null;
  let lastParticipant: number | null = null;
  const humanGoods = new Map<string, { name: string; amount: number }>();
  let humanMoney: number | null = null;

  visitFileDb(data.bytes, (path, attr, bytes) => {
    const value = leafI32(bytes);

    if (attr === "ParticipantID" && value != null) lastParticipant = value;

    if (path.endsWith("CountsPerGUID") && value != null) {
      if (pendingGuid == null) {
        pendingGuid = value;
      } else {
        const row = lookupGuid(pendingGuid);
        if (row?.kind === "building" && value > 0) {
          addCount(scan.buildingCounts, row.id, row.name, value);
          if (row.id === "farmer-house") scan.farmers = true;
          if (row.id === "worker-house") scan.workers = true;
          if (row.id === "artisan-house") scan.artisans = true;
          if (row.id === "engineer-house") scan.engineers = true;
        }
        pendingGuid = null;
      }
    }

    if (attr === "StrgLrg") {
      const pairs = parseStrgPairs(bytes);
      const moneyPair = pairs.find((pair) => pair.guid === MONEY_GUID);
      const useHuman = lastParticipant === 0 || (moneyPair != null && (humanMoney == null || moneyPair.amount > humanMoney));
      const target = useHuman ? humanGoods : scan.goods;
      for (const pair of pairs) {
        if (pair.guid === MONEY_GUID) {
          if (useHuman) humanMoney = pair.amount;
          else if (scan.money == null) scan.money = pair.amount;
          continue;
        }
        const row = lookupGuid(pair.guid);
        if (row?.kind !== "good") continue;
        target.set(row.id, { name: row.name, amount: pair.amount });
      }
    }

    if ((attr === "QuestGUID" || attr === "QuestID") && value && value > 1000) {
      const row = lookupGuid(value);
      if (row?.kind === "quest") scan.questGuids.push(value);
    }

    if (
      (attr === "CurrentlyActiveSession" || attr === "LastActiveSession" || attr === "StartSessionGUID") &&
      value
    ) {
      const row = lookupGuid(value);
      if (row?.kind === "island") {
        scan.islands.add(row.id);
        scan.islandNames.set(row.id, row.name);
      }
    }
  });

  if (humanGoods.size) {
    scan.goods = humanGoods;
  }
  if (humanMoney != null) scan.money = humanMoney;

  return scan;
}

function namedHits(map: Map<string, { name: string; count?: number; amount?: number }>): LiveNamedHit[] {
  return [...map.entries()]
    .filter(([, row]) => (row.count ?? 1) > 0)
    .map(([id, row]) => ({ id, name: row.name }))
    .slice(0, 80);
}

export function snapshotFromScan(
  scan: SaveScan,
  opts: { previousMoney?: number | null; savedAt?: string; sessionName?: string },
): LiveSnapshot {
  const buildings = namedHits(scan.buildingCounts);
  const goodsHits = [...scan.goods.entries()]
    .filter(([, row]) => row.amount !== 0)
    .slice(0, 40)
    .map(([id, row]) => ({ id, name: row.name, amount: row.amount }));

  const islands = [...scan.islands].map((id) => ({
    id,
    name: scan.islandNames.get(id) ?? id,
  }));

  const chains: LiveNamedHit[] = [];
  const chainOf: Record<string, string> = {
    lumberjack: "wood",
    sawmill: "wood",
    fishery: "fish",
    sheep: "clothes",
    knitters: "clothes",
    potato: "schnapps",
    distillery: "schnapps",
    sausage: "workers",
    bread: "workers",
    charcoal: "steel",
    furnace: "steel",
    steelworks: "steel",
  };
  const seenChain = new Set<string>();
  for (const hit of buildings) {
    const chain = chainOf[hit.id];
    if (chain && !seenChain.has(chain)) {
      seenChain.add(chain);
      const labels: Record<string, string> = {
        wood: "Wood",
        fish: "Fish",
        clothes: "Clothes",
        schnapps: "Schnapps",
        workers: "Worker food",
        steel: "Steel",
      };
      chains.push({ id: chain, name: labels[chain] ?? chain });
    }
  }

  const workforce: LiveWorkforce = {};
  if (scan.farmers) workforce.farmers = true;
  if (scan.workers) workforce.workers = true;
  if (scan.artisans) workforce.artisans = true;
  if (scan.engineers) workforce.engineers = true;

  const hints: string[] = [];
  if (scan.farmers) hints.push("farmers");
  if (scan.workers) hints.push("workers");
  if (scan.artisans) hints.push("artisans");
  if (scan.engineers) hints.push("engineers");
  if (scan.goods.has("schnapps")) hints.push("schnapps");
  if (scan.goods.has("steel")) hints.push("steel");

  const quests: LiveQuest[] = [];
  for (const guid of scan.questGuids) {
    const row = lookupGuid(guid);
    if (!row || row.kind !== "quest") continue;
    quests.push({ title: row.name, state: "active" });
  }

  let pulseHint: LivePulseHint | undefined;
  if (scan.money != null) {
    let coins: LivePulseHint["coins"] = "unknown";
    if (opts.previousMoney != null && opts.previousMoney !== scan.money) {
      coins = scan.money >= opts.previousMoney ? "up" : "down";
    } else if (scan.money < 0) {
      coins = "down";
    }
    pulseHint = { coins, houses: "unknown" };
  }

  const telemetry: LiveTelemetry = {};
  if (buildings.length) telemetry.buildings = buildings;
  if (islands.length) telemetry.islands = islands;
  if (chains.length) telemetry.chains = chains;
  if (hints.length) telemetry.hints = hints;
  if (goodsHits.length) telemetry.goods = goodsHits;

  const snapshot: LiveSnapshot = {
    schema: "harbor-live-v1",
    source: "save",
    updatedAt: new Date().toISOString(),
    game: "anno-1800",
    quests,
  };
  const sessionName = (opts.sessionName || scan.sessionName).slice(0, 200);
  if (sessionName) snapshot.sessionName = sessionName;
  if (opts.savedAt) snapshot.savedAt = opts.savedAt;
  if (islands[0]) snapshot.islandName = islands[0].name;
  if (pulseHint) snapshot.pulseHint = pulseHint;
  if (Object.keys(workforce).length) snapshot.workforce = workforce;
  if (Object.keys(telemetry).length) snapshot.telemetry = telemetry;
  return snapshot;
}

export function snapshotFromA7s(
  buf: Buffer,
  opts: { previousMoney?: number | null; savedAt?: string; sessionName?: string } = {},
): LiveSnapshot {
  return snapshotFromScan(scanSaveBytes(buf), opts);
}
