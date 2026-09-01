import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyLiveToProgress, liveMissLine, liveOkLine, matchLiveQuests, type LiveSnapshot } from "@/lib/live";
import { firstPlayableMissionId, missionsById } from "@/lib/data";
import type { PulseSample } from "@/lib/dash";
import { DEFAULT_LOCALE, LOCALE_META, isLocale, type Locale } from "@/lib/i18n";
import { defaultPulse, type Pulse } from "@/lib/play";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type CalmMode = "session" | "overwhelmed" | "broke";

type HarborState = {
  missionId: string | null;
  spoilers: boolean;
  calm: CalmMode;
  completed: string[];
  chat: ChatTurn[];
  pulse: Pulse;
  checks: Record<string, number[]>;
  liveEnabled: boolean;
  liveSnapshot: LiveSnapshot | null;
  liveMissionId: string | null;
  liveConfidence: number;
  liveFileName: string | null;
  lastImportedAt: string | null;
  liveBanner: string | null;
  liveBannerFailed: boolean;
  locale: Locale;
  samples: PulseSample[];
  setMissionId: (id: string | null) => void;
  setSpoilers: (value: boolean) => void;
  setCalm: (value: CalmMode) => void;
  setPulse: (patch: Partial<Pulse>) => void;
  toggleCheck: (missionId: string, index: number) => void;
  markComplete: (id: string) => void;
  addChat: (turn: ChatTurn) => void;
  clearChat: () => void;
  resetProgress: () => void;
  applyLiveSnapshot: (snapshot: LiveSnapshot, fileName?: string | null) => void;
  clearLive: () => void;
  setLiveEnabled: (value: boolean) => void;
  setLiveBanner: (text: string | null, failed?: boolean) => void;
  setLocale: (value: Locale) => void;
};

export function isLiveLocked(state: {
  liveEnabled: boolean;
  liveSnapshot: LiveSnapshot | null;
  liveMissionId: string | null;
}) {
  return Boolean(state.liveEnabled && state.liveSnapshot && state.liveMissionId);
}

export const useHarbor = create<HarborState>()(
  persist(
    (set, get) => ({
      missionId: null,
      spoilers: false,
      calm: "session",
      completed: [],
      chat: [],
      pulse: defaultPulse,
      checks: {},
      liveEnabled: false,
      liveSnapshot: null,
      liveMissionId: null,
      liveConfidence: 0,
      liveFileName: null,
      lastImportedAt: null,
      liveBanner: null,
      liveBannerFailed: false,
      locale: DEFAULT_LOCALE,
      samples: [],
      setMissionId: (id) => {
        if (isLiveLocked(get())) return;
        set({ missionId: id, calm: "session" });
      },
      setSpoilers: (value) => set({ spoilers: value }),
      setCalm: (value) => set({ calm: value }),
      setPulse: (patch) => {
        const pulse = { ...get().pulse, ...patch };
        const samples = pushSample(get().samples, pulse);
        set({ pulse, samples });
      },
      toggleCheck: (missionId, index) => {
        if (isLiveLocked(get())) return;
        const current = get().checks[missionId] ?? [];
        const next = current.includes(index)
          ? current.filter((item) => item !== index)
          : [...current, index];
        set({ checks: { ...get().checks, [missionId]: next } });
      },
      markComplete: (id) => {
        if (get().liveEnabled && get().liveSnapshot) return;
        const completed = get().completed.includes(id)
          ? get().completed
          : [...get().completed, id];
        const mission = missionsById[id];
        const chapterIds = mission
          ? Object.values(missionsById)
              .filter((item) => item.chapterId === mission.chapterId)
              .map((item) => item.id)
          : [];
        const currentIndex = chapterIds.indexOf(id);
        const nextId = chapterIds[currentIndex + 1];
        set({
          completed,
          missionId: nextId ?? get().missionId,
          calm: "session",
        });
      },
      addChat: (turn) =>
        set({
          chat: [...get().chat, turn].slice(-16),
        }),
      clearChat: () => set({ chat: [] }),
      resetProgress: () =>
        set({
          missionId: firstPlayableMissionId,
          completed: [],
          chat: [],
          calm: "session",
          pulse: defaultPulse,
          checks: {},
          samples: [],
          liveEnabled: false,
          liveSnapshot: null,
          liveMissionId: null,
          liveConfidence: 0,
          liveFileName: null,
          lastImportedAt: null,
          liveBanner: null,
          liveBannerFailed: false,
        }),
      applyLiveSnapshot: (snapshot, fileName) => {
        const match = matchLiveQuests(snapshot.quests);
        const progress = applyLiveToProgress(snapshot, match);
        const importedAt = new Date().toISOString();
        if (!progress.matched || !progress.missionId) {
          set({
            liveEnabled: true,
            liveSnapshot: snapshot,
            liveMissionId: null,
            liveConfidence: match.confidence,
            liveFileName: fileName ?? get().liveFileName,
            lastImportedAt: importedAt,
            liveBanner: liveMissLine(match.rawTitles, get().locale),
            liveBannerFailed: false,
          });
          return;
        }
        const title = missionsById[progress.missionId]?.title ?? progress.missionId;
        set({
          liveEnabled: true,
          liveSnapshot: snapshot,
          liveMissionId: progress.missionId,
          liveConfidence: match.confidence,
          liveFileName: fileName ?? get().liveFileName,
          lastImportedAt: importedAt,
          missionId: progress.missionId,
          completed: progress.completed,
          checks: { ...get().checks, ...progress.checks },
          pulse: { ...get().pulse, ...progress.pulse },
          samples: pushSample(get().samples, { ...get().pulse, ...progress.pulse }),
          calm: "session",
          liveBanner: liveOkLine(snapshot.quests.length, title, get().locale),
          liveBannerFailed: false,
        });
      },
      clearLive: () =>
        set({
          liveEnabled: false,
          liveSnapshot: null,
          liveMissionId: null,
          liveConfidence: 0,
          liveFileName: null,
          lastImportedAt: null,
          liveBanner: null,
          liveBannerFailed: false,
        }),
      setLiveEnabled: (value) => {
        const snapshot = get().liveSnapshot;
        if (value && snapshot) {
          get().applyLiveSnapshot(snapshot, get().liveFileName);
          return;
        }
        set({ liveEnabled: value });
      },
      setLiveBanner: (text, failed = false) =>
        set({ liveBanner: text, liveBannerFailed: failed }),
      setLocale: (value) => {
        const locale = isLocale(value) ? value : DEFAULT_LOCALE;
        if (typeof document !== "undefined") {
          document.documentElement.lang = LOCALE_META[locale].html;
        }
        set({ locale });
        const snapshot = get().liveSnapshot;
        if (snapshot && get().liveEnabled) {
          get().applyLiveSnapshot(snapshot, get().liveFileName);
        }
      },
    }),
    {
      name: "harbor-buddy-es",
      partialize: (state) => ({
        missionId: state.missionId,
        spoilers: state.spoilers,
        completed: state.completed,
        chat: state.chat,
        pulse: state.pulse,
        checks: state.checks,
        liveEnabled: state.liveEnabled,
        liveSnapshot: state.liveSnapshot,
        liveMissionId: state.liveMissionId,
        liveConfidence: state.liveConfidence,
        liveFileName: state.liveFileName,
        lastImportedAt: state.lastImportedAt,
        liveBanner: state.liveBanner,
        liveBannerFailed: state.liveBannerFailed,
        locale: state.locale,
        samples: state.samples,
      }),
    },
  ),
);

function pushSample(samples: PulseSample[], pulse: Pulse): PulseSample[] {
  const next: PulseSample = {
    at: new Date().toISOString(),
    coins: pulse.coins,
    houses: pulse.houses,
  };
  const last = samples[samples.length - 1];
  if (last && last.coins === next.coins && last.houses === next.houses) return samples;
  return [...samples, next].slice(-16);
}
