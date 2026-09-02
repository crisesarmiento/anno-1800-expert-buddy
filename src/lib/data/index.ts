export * from "./types";
export * from "./layouts";
export * from "./buildings";
export * from "./campaign";
export * from "./harbor-life";
export * from "./find";
export * from "./chains";
export * from "./yellow-bar";
export * from "./wiki-catalog";

import { buildingsById } from "./buildings";
import { chapters, chaptersById, missionsById } from "./campaign";
import { layoutsById } from "./layouts";
import {
  lifeAsks,
  lifeByChapter,
  peopleForChapter,
  type ChapterLife,
  type HarborPerson,
} from "./harbor-life";
import type { Building, Chapter, Layout, Mission } from "./types";

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
