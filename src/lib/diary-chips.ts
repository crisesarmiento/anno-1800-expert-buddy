import { chapters, missionsById } from "@/lib/data";

export type DiaryTitleChip = {
  id: string;
  title: string;
  chapterId: string;
};

/** One journal title per chapter — Home chips, not goods. */
export function diaryTitleChips(): DiaryTitleChip[] {
  return chapters.map((chapter) => {
    const id = chapter.missionIds[0] ?? chapter.id;
    const mission = missionsById[id];
    return {
      id,
      title: mission?.title ?? chapter.title,
      chapterId: chapter.id,
    };
  });
}

export const ESTO_AHORA_IDLE = "Tocá el título que ves en el diario.";
