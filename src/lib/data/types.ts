export type CellKind =
  | "R"
  | "H"
  | "G"
  | "P"
  | "W"
  | "F"
  | "I"
  | "T"
  | "M"
  | ".";

export type MissionKind = "build" | "errand" | "wait" | "combat" | "expedition";

export type Layout = {
  id: string;
  title: string;
  hint: string;
  steps: string[];
  grid: string[];
};

export type Building = {
  id: string;
  name: string;
  unlock: string;
  where: string;
  buddy: string;
  trap: string;
};

export type Mission = {
  id: string;
  chapterId: string;
  title: string;
  kind: MissionKind;
  objective: string;
  why: string;
  do: string[];
  dont: string;
  trap: string;
  overwhelmed: string;
  buildingIds: string[];
  layoutId?: string;
  suggestedAsks: string[];
  spoilers?: string;
};

export type Chapter = {
  id: string;
  roman: string;
  title: string;
  subtitle: string;
  missionIds: string[];
};
