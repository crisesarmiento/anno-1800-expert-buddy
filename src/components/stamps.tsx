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
  book: (
    <>
      <path d="M5 7v13h14V7" />
      <path d="M5 7c2-2 4-3 7-3s5 1 7 3" />
      <path d="M12 7v13" />
    </>
  ),
  anchor: (
    <>
      <path d="M12 3v14" />
      <path d="M8 7h8" />
      <path d="M9 21h6l-3-4z" />
    </>
  ),
  blot: (
    <>
      <circle cx="10" cy="12" r="5" />
      <circle cx="15" cy="10" r="3" />
      <circle cx="14" cy="16" r="2" />
    </>
  ),
  warn: (
    <>
      <path d="M12 4 21 19H3z" />
      <path d="M12 10v5M12 17.5v.5" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="12" cy="8" rx="6" ry="2.4" />
      <path d="M6 8v3c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V8M6 11v3c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4v-3" />
    </>
  ),
  "check-seal": (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12.5 11 16l5-7" />
    </>
  ),
  chain: (
    <>
      <path d="M9 10a3 3 0 1 1 0-4h2M15 14a3 3 0 1 1 0 4h-2" />
      <path d="M10 8h4M10 16h4" />
    </>
  ),
  plug: (
    <>
      <path d="M8 14h8v5H8z" />
      <path d="M10 14V9h4v5M9 9V6M15 9V6" />
    </>
  ),
  hourglass: <path d="M7 5h10M7 19h10M8 5c0 4 8 4 8 7s-8 3-8 7M16 5c0 4-8 4-8 7s8 3 8 7" />,
  "coins-down": (
    <>
      <ellipse cx="12" cy="9" rx="6" ry="3" />
      <path d="M6 9v4c0 1.7 2.7 3 6 3s6-1.3 6-3V9M12 14v5M9.5 17.5 12 20l2.5-2.5" />
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
    <span className={cn("stamp-seal", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      <svg
        viewBox={svg.viewBox}
        fill={svg.fill}
        stroke={svg.stroke}
        strokeWidth={svg.strokeWidth}
        strokeLinecap={svg.strokeLinecap}
        strokeLinejoin={svg.strokeLinejoin}
        aria-hidden
      >
        {title ? <title>{title}</title> : null}
        {ICONS[name] ?? ICONS.cottage}
      </svg>
    </span>
  );
}

export type SealKind = "book" | "anchor" | "hourglass" | "coin-down" | "check";
export type SealTone = "ink" | "saturado" | "rojo";

const SEALS: Record<SealKind, ReactNode> = {
  book: (
    <>
      <path d="M7 6.5h10v11H7z" />
      <path d="M12 6.5v11" />
      <path d="M8.5 9h2M8.5 12h2M13.5 9h2" />
    </>
  ),
  anchor: (
    <>
      <circle cx="12" cy="7" r="1.6" />
      <path d="M12 8.6v9" />
      <path d="M8 13h8" />
      <path d="M7 16.5c1.4 2 3.2 2.8 5 2.8s3.6-.8 5-2.8" />
    </>
  ),
  hourglass: (
    <>
      <path d="M8 6h8v2c0 2-1.6 3.2-4 4 2.4.8 4 2 4 4v2H8v-2c0-2 1.6-3.2 4-4-2.4-.8-4-2-4-4z" />
    </>
  ),
  "coin-down": (
    <>
      <circle cx="12" cy="10" r="4.2" />
      <path d="M12 14.5v4" />
      <path d="M9.5 16.5 12 19l2.5-2.5" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M8.5 12.2 11 14.6 15.6 9.6" />
    </>
  ),
};

export function InkSeal({
  kind,
  tone = "ink",
  className,
  title,
}: {
  kind: SealKind;
  tone?: SealTone;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("ink-seal shrink-0", className)}
      data-tone={tone}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {SEALS[kind]}
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

export function TileMark({ name, className }: { name: string; className?: string }) {
  const glyph = ICONS[name];
  if (!glyph) return null;
  return (
    <svg
      viewBox={svg.viewBox}
      fill={svg.fill}
      stroke={svg.stroke}
      strokeWidth={1.85}
      strokeLinecap={svg.strokeLinecap}
      strokeLinejoin={svg.strokeLinejoin}
      className={cn("pointer-events-none tile-mark", className)}
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

