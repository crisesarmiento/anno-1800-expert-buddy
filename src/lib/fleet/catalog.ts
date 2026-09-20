/**
 * Wiki-sourced ship figures for Stage 6.
 * Catalog upkeep is inferred — never a save-confirmed ShipMaintenance total.
 * Missing stays omitted. ConstructionAI numbers stay unpublished.
 *
 * https://anno1800.fandom.com/wiki/Ships_properties
 */

export const SHIP_CATALOG_VERSION = "wiki-ships-v1-2026-09" as const;
export const SHIPS_PROPERTIES_WIKI = "https://anno1800.fandom.com/wiki/Ships_properties" as const;

export type ShipCatalogKind = "trade" | "military" | "flagship" | "unknown";

export type ShipMaterialNeed = {
  goodId: string;
  amount: number;
};

export type ShipCatalogRow = {
  id: string;
  guid: number;
  kind: ShipCatalogKind;
  name: string;
  /** Absolute coins per minute. Inferred from wiki, not the save. */
  upkeep?: number;
  purchase?: number;
  materials?: ShipMaterialNeed[];
  sourceUrl: string;
};

const wiki = SHIPS_PROPERTIES_WIKI;

/** Base-game sailing hulls with a sourced upkeep row on Ships_properties. */
export const SHIP_CATALOG: ShipCatalogRow[] = [
  {
    id: "schooner",
    guid: 100438,
    kind: "trade",
    name: "Schooner",
    upkeep: 15,
    purchase: 5000,
    materials: [
      { goodId: "wood", amount: 20 },
      { goodId: "sails", amount: 10 },
    ],
    sourceUrl: wiki,
  },
  {
    id: "gunboat",
    guid: 100437,
    kind: "military",
    name: "Gunboat",
    upkeep: 25,
    purchase: 12500,
    materials: [
      { goodId: "wood", amount: 10 },
      { goodId: "sails", amount: 20 },
      { goodId: "weapons", amount: 7 },
    ],
    sourceUrl: wiki,
  },
  {
    id: "frigate",
    guid: 100439,
    kind: "military",
    name: "Frigate",
    upkeep: 100,
    purchase: 20000,
    materials: [
      { goodId: "wood", amount: 40 },
      { goodId: "sails", amount: 20 },
      { goodId: "weapons", amount: 15 },
    ],
    sourceUrl: wiki,
  },
  {
    id: "clipper",
    guid: 100441,
    kind: "trade",
    name: "Clipper",
    upkeep: 175,
    purchase: 15000,
    materials: [
      { goodId: "wood", amount: 40 },
      { goodId: "sails", amount: 30 },
    ],
    sourceUrl: wiki,
  },
  {
    id: "ship-of-the-line",
    guid: 100440,
    kind: "military",
    name: "Ship of the Line",
    sourceUrl: wiki,
  },
  {
    id: "cargo-ship",
    guid: 1010062,
    kind: "trade",
    name: "Cargo Ship",
    sourceUrl: wiki,
  },
  {
    id: "battle-cruiser",
    guid: 100442,
    kind: "military",
    name: "Battle Cruiser",
    sourceUrl: wiki,
  },
  {
    id: "monitor",
    guid: 100443,
    kind: "military",
    name: "Monitor",
    sourceUrl: wiki,
  },
  {
    id: "oil-tanker",
    guid: 100853,
    kind: "trade",
    name: "Oil Tanker",
    sourceUrl: wiki,
  },
];

export const SHIP_BY_GUID = new Map(SHIP_CATALOG.map((row) => [row.guid, row]));
export const SHIP_BY_ID = new Map(SHIP_CATALOG.map((row) => [row.id, row]));

export function lookupShipCatalog(
  guid?: number | null,
  id?: string | null,
): ShipCatalogRow | undefined {
  if (typeof guid === "number" && Number.isFinite(guid)) {
    const byGuid = SHIP_BY_GUID.get(Math.trunc(guid));
    if (byGuid) return byGuid;
  }
  const key = id?.trim();
  if (key) return SHIP_BY_ID.get(key);
  return undefined;
}
