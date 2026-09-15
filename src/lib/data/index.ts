export * from "./types.ts";
export * from "./layouts.ts";
export * from "./buildings.ts";
export * from "./campaign.ts";
export * from "./harbor-life.ts";
export * from "./find.ts";
export * from "./chains.ts";
export * from "./yellow-bar.ts";
export * from "./wiki-catalog.ts";
export * from "./guids.ts";

import { buildingsById } from "./buildings.ts";
import { chapters, chaptersById, missionsById } from "./campaign.ts";
import { layoutsById } from "./layouts.ts";
import {
  lifeAsks,
  lifeByChapter,
  peopleForChapter,
  type ChapterLife,
  type HarborPerson,
} from "./harbor-life.ts";
import type { Building, Chapter, Layout, Mission } from "./types.ts";

export function resolveMission(missionId: string | null): {
  mission: Mission;
  chapter: Chapter;
  layout?: Layout;
  buildings: Building[];
  life?: ChapterLife;
  people: HarborPerson[];
  lifeAsks: string[];
} | null {
  if (!missionId) return null;
  const mission = missionsById[missionId];
  if (!mission) return null;
  const chapter = chaptersById[mission.chapterId];
  if (!chapter) return null;
  return {
    mission,
    chapter,
    layout: mission.layoutId ? layoutsById[mission.layoutId] : undefined,
    buildings: mission.buildingIds
      .map((id) => buildingsById[id])
      .filter((building): building is Building => Boolean(building)),
    life: lifeByChapter[chapter.id],
    people: peopleForChapter(chapter.id),
    lifeAsks: lifeAsks[chapter.id] ?? [],
  };
}

export const firstPlayableMissionId = "ch1-spark";

export const welcomeChapters = chapters.filter((chapter) =>
  ["ch1", "ch2", "ch3", "ch4"].includes(chapter.id),
);
