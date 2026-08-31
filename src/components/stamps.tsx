import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ICONS: Record<string, ReactNode> = {
  cottage: (
    <>
      <path d="M4 11.5 12 4l8 7.5V20H4z" />
      <path d="M10 20v-6h4v6" />
      <path d="M16 9.2V6h2.2" />
    </>
  ),
  brick: (
    <>
      <path d="M5 10h14v10H5z" />
      <path d="M5 14h14M12 10v10M8.5 10v4M15.5 14v6" />
      <path d="M4 10 12 4l8 6" />
    </>
  ),
  stall: (
    <>
      <path d="M4 9h16l-1.5 3H5.5z" />
      <path d="M6 12v8M18 12v8M8 20h8" />
      <path d="M8 16h3M14 16h2" />
      <circle cx="12" cy="6" r="1.4" />
    </>
  ),
  cabin: (
    <>
      <path d="M3 13 12 5l9 8" />
      <path d="M6 12.5V20h12v-7.5" />
      <path d="M10 20v-5h4v5" />
      <path d="M7.5 16.5h2" />
    </>
  ),
  mill: (
    <>
      <circle cx="12" cy="11" r="4" />
      <path d="M12 7V4M12 15v3M8 11H5M16 11h3" />
      <path d="M9.2 8.2 7 6M14.8 13.8 17 16M14.8 8.2 17 6M9.2 13.8 7 16" />
      <path d="M8 20h8" />
    </>
  ),
  fish: (
    <>
      <path d="M4 12c4-5 12-5 14 0-2 5-10 5-14 0Z" />
      <path d="M18 12l4-3v6z" />
      <circle cx="8.2" cy="11" r=".8" fill="currentColor" />
    </>
  ),
  sheep: (
    <>
      <circle cx="10" cy="13" r="5" />
      <circle cx="15.5" cy="11.5" r="3.2" />
      <path d="M7 18v2M13 18v2M18 14.2v2" />
      <circle cx="16.6" cy="10.4" r=".6" fill="currentColor" />
    </>
  ),
  yarn: (
    <>
      <circle cx="12" cy="11" r="5.5" />
      <path d="M7.5 9c2 2 7 2 9 0M7.5 13c2 2 7 2 9 0" />
      <path d="M14 16.5 16 21h3" />
    </>
  ),
  plant: (
    <>
      <path d="M12 21V11" />
      <path d="M12 14c-4-1-6-5-5-8 3 1 5 4 5 8Z" />
      <path d="M12 13c4-1 6-5 5-8-3 1-5 4-5 8Z" />
      <path d="M8 21h8" />
    </>
  ),
  barrel: (
    <>
      <path d="M7 6h10v12H7z" />
      <path d="M7 6c0-1.4 2.2-2.2 5-2.2S17 4.6 17 6M7 18c0 1.4 2.2 2.2 5 2.2S17 19.4 17 18" />
      <path d="M7 10h10M7 14h10" />
    </>
  ),
  tankard: (
    <>
      <path d="M7 8h8v10a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3z" />
      <path d="M15 10h2.5a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H15" />
      <path d="M8 8V6h6v2" />
    </>
  ),
  pig: (
    <>
      <ellipse cx="12" cy="13" rx="7" ry="5" />
      <path d="M6 11c-2-3 1-5 3-3" />
      <circle cx="16.5" cy="12" r="2.2" />
      <path d="M8 18v2M14 18v2" />
      <circle cx="17.2" cy="11.4" r=".5" fill="currentColor" />
    </>
  ),
  wheat: (
    <>
      <path d="M12 21V8" />
      <path d="M12 10c-3-2-3-5 0-6M12 10c3-2 3-5 0-6" />
      <path d="M12 14c-3-2-3-5 0-6M12 14c3-2 3-5 0-6" />
      <path d="M12 18c-3-2-3-4 0-5M12 18c3-2 3-4 0-5" />
    </>
  ),
  soap: (
    <>
      <rect x="5" y="9" width="14" height="8" rx="3" />
      <path d="M9 9c0-2 2-3 3.5-2.2" />
    </>
  ),
  bell: (
    <>
      <path d="M8 10a4 4 0 1 1 8 0c0 4 1.5 6 1.5 6H6.5S8 14 8 10Z" />
      <path d="M10.5 16.5a1.5 1.5 0 0 0 3 0" />
      <path d="M12 6V4" />
    </>
  ),
  chapel: (
    <>
      <path d="M6 20V11l6-5 6 5v9z" />
      <path d="M12 6V3M10.5 3h3" />
      <path d="M10.5 20v-5h3v5" />
    </>
  ),
  crate: (
    <>
      <path d="M4 8h16v12H4z" />
      <path d="M4 8 12 4l8 4" />
      <path d="M4 12h16M12 8v12" />
    </>
  ),
  pick: (
    <>
      <path d="M5 19 14 10" />
      <path d="M12 8c4-1 7 2 6 6" />
      <path d="M4 20h4" />
    </>
  ),
  kiln: (
    <>
      <path d="M7 20V11l5-5 5 5v9z" />
      <path d="M10 20v-5h4v5" />
      <path d="M9 13h6" />
    </>
  ),
  fire: (
    <>
      <path d="M12 20c4 0 6-3 6-7 0-5-4-7-6-11-2 4-6 6-6 11 0 4 2 7 6 7Z" />
      <path d="M12 17c1.6 0 2.5-1.3 2.5-3 0-2-1.5-3-2.5-4.5" />
    </>
  ),
  anvil: (
    <>
      <path d="M5 11h14v3H5z" />
      <path d="M8 14v5h8v-5" />
      <path d="M6 11V8h7l4 3" />
      <path d="M7 20h10" />
    </>
  ),
  cannon: (
    <>
      <path d="M4 14h13a3 3 0 0 0 3-3V9H8" />
      <circle cx="7" cy="16.5" r="2.3" />
      <circle cx="16" cy="16.5" r="2.3" />
      <path d="M4 11V8h3" />
    </>
  ),
  sail: (
    <>
      <path d="M12 20V5" />
      <path d="M12 6c6 1 7 8 0 10" />
      <path d="M7 20h10" />
    </>
  ),
  hut: (
    <>
      <path d="M4 13 12 5l8 8" />
      <path d="M6 13v7h12v-7" />
      <path d="M4 13h16" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  leaf: (
    <>
      <path d="M12 21c0-8 7-12 7-12S16 4 12 4 5 9 5 9s7 4 7 12Z" />
      <path d="M12 21V8" />
    </>
  ),
  star: (
    <>
      <path d="M12 3.5 14.2 9h5.8l-4.7 3.6 1.8 5.6L12 15.2 7 18.2l1.8-5.6L4 9h5.8z" />
    </>
  ),
  cross: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  wall: (
    <>
      <path d="M3 10h18v10H3z" />
      <path d="M3 14h18M9 10v10M15 10v10" />
      <path d="M6 10V8h3v2M12 10V7h3v3M18 10V8h3" />
    </>
  ),
  road: (
    <>
      <path d="M9 3 6 21M15 3l3 18" />
      <path d="M12 5v3M12 11v3M12 17v3" />
    </>
  ),
  garden: (
    <>
      <path d="M12 20V11" />
      <circle cx="12" cy="9" r="3.2" />
      <path d="M7 20h10" />
    </>
  ),
  farm: (
    <>
      <path d="M4 17h16M4 20h16" />
      <path d="M6 17V12M10 17V10M14 17V12M18 17V11" />
    </>
  ),
  tree: (
    <>
      <path d="M12 21v-6" />
      <path d="M12 15 7 19h10z" />
      <path d="M12 11 6.5 16h11z" />
      <path d="M12 7 8 12h8z" />
    </>
  ),
  water: (
    <>
      <path d="M4 9c2 2 4 2 6 0s4-2 6 0 4 2 6 0" />
      <path d="M4 14c2 2 4 2 6 0s4-2 6 0 4 2 6 0" />
      <path d="M4 19c2 2 4 2 6 0s4-2 6 0 4 2 6 0" />
    </>
  ),
  industry: (
    <>
      <path d="M4 20V11l6 3V11l6 3V8l4-2v14z" />
      <path d="M16 8V4h2" />
    </>
  ),
  axe: (
    <>
      <path d="M8 21 14 8" />
      <path d="M12.5 6.5 18 4l1.5 5.5-5.2 2.2z" />
    </>
  ),
};

export function Stamp({
  name,
  className,
  title,
}: {
  name: string;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox={svg.viewBox}
      fill={svg.fill}
      stroke={svg.stroke}
      strokeWidth={svg.strokeWidth}
      strokeLinecap={svg.strokeLinecap}
      strokeLinejoin={svg.strokeLinejoin}
      className={cn("shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {ICONS[name] ?? ICONS.cottage}
    </svg>
  );
}

export const BUILDING_STAMP: Record<string, string> = {
  lumberjack: "cabin",
  sawmill: "mill",
  marketplace: "stall",
  "farmer-house": "cottage",
  fishery: "fish",
  sheep: "sheep",
  knitters: "yarn",
  potato: "plant",
  distillery: "barrel",
  pub: "tankard",
  "worker-house": "brick",
  sausage: "pig",
  bread: "wheat",
  soap: "soap",
  school: "bell",
  church: "chapel",
  warehouse: "crate",
  "iron-mine": "pick",
  charcoal: "kiln",
  furnace: "fire",
  steelworks: "anvil",
  weapons: "cannon",
  sails: "sail",
  jornalero: "hut",
  plantain: "leaf",
  police: "star",
  hospital: "cross",
  obrero: "brick",
  defenses: "wall",
};

export const CELL_STAMP: Record<string, string> = {
  R: "road",
  H: "cottage",
  G: "garden",
  P: "chapel",
  M: "stall",
  W: "water",
  F: "farm",
  I: "industry",
  T: "tree",
};

export function buildingStamp(id: string) {
  return BUILDING_STAMP[id] ?? "cottage";
}

const TILE: Record<string, ReactNode> = {
  cottage: <path fill="currentColor" stroke="none" d="M3.5 11.5 12 4.2 20.5 11.5V20.5H14v-6h-4v6H3.5z" />,
  garden: (
    <>
      <circle fill="currentColor" stroke="none" cx="12" cy="9.5" r="4.2" />
      <path fill="currentColor" stroke="none" d="M11 13h2v8h-2z" />
    </>
  ),
  chapel: (
    <>
      <path fill="currentColor" stroke="none" d="M5 20.5V11l7-6 7 6v9.5h-5v-5H10v5z" />
      <path fill="currentColor" stroke="none" d="M11 3h2v3h-2zM10 3.8h4v1.4h-4z" />
    </>
  ),
  stall: (
    <>
      <path fill="currentColor" stroke="none" d="M3.5 8.5h17l-2 4.2H5.5z" />
      <path fill="currentColor" stroke="none" d="M6.2 12.7h2.2v8.3H6.2zM15.6 12.7h2.2v8.3h-2.2zM9 18.5h6v2.5H9z" />
    </>
  ),
  farm: (
    <>
      <path fill="currentColor" stroke="none" d="M5 8h2.4v13H5zM10.8 5.5h2.4V21h-2.4zM16.6 9h2.4v12h-2.4z" />
    </>
  ),
  industry: (
    <>
      <path fill="currentColor" stroke="none" d="M3.5 20.5V12l5 2.2V11.5l5 2.3V9.5l6.5-2.2v13z" />
      <path fill="currentColor" stroke="none" d="M16.2 4h2.3v4h-2.3z" />
    </>
  ),
  tree: (
    <>
      <path fill="currentColor" stroke="none" d="M12 3.5 6 12h12z" />
      <path fill="currentColor" stroke="none" d="M12 8 5.2 17h13.6z" />
      <path fill="currentColor" stroke="none" d="M11 16h2v5h-2z" />
    </>
  ),
  water: (
    <>
      <path fill="currentColor" stroke="none" d="M3 9.2c2.2 2.4 4.4 2.4 6.5 0 2.2-2.4 4.3-2.4 6.5 0 2.1 2.4 4.3 2.4 5 1.2v3.2c-2 .8-3.6-.4-5-1.8-2.2-2.2-4.3-2.2-6.5 0-2.1 2.2-4.3 2.2-6.5 0z" />
      <path fill="currentColor" stroke="none" d="M3 15.4c2.2 2.4 4.4 2.4 6.5 0 2.2-2.4 4.3-2.4 6.5 0 2.1 2.4 4.3 2.4 5 1.2v3.2c-2 .8-3.6-.4-5-1.8-2.2-2.2-4.3-2.2-6.5 0-2.1 2.2-4.3 2.2-6.5 0z" />
    </>
  ),
  crate: <path fill="currentColor" stroke="none" d="M4 8.2 12 4.2 20 8.2V20H4zM4 12h16M12 8.2V20" />,
};

export function TileMark({ name, className }: { name: string; className?: string }) {
  const glyph = TILE[name];
  if (!glyph) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("pointer-events-none", className)}
      aria-hidden
    >
      {glyph}
    </svg>
  );
}

export const CELL_TILE: Record<string, string> = {
  H: "cottage",
  G: "garden",
  P: "chapel",
  M: "stall",
  W: "water",
  F: "farm",
  I: "industry",
  T: "tree",
};

