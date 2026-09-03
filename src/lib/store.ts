import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyLiveToProgress,
  liveMissLine,
  liveOkLine,
  liveOkSaveLine,
  matchLiveSnapshot,
  type LiveSnapshot,
} from "@/lib/live";
import { firstPlayableMissionId, missionsById } from "@/lib/data";
import type { PulseSample } from "@/lib/dash";
import { DEFAULT_LOCALE, LOCALE_META, isLocale, type Locale } from "@/lib/i18n";
import {
  initialOverbuildBrake,
  reduceOverbuildBrake,
  type HudPulse,
  type OverbuildBrakeState,
} from "@/lib/overbuild-brake";
import { defaultPulse, type Pulse } from "@/lib/play";
import type { SessionCheckItem } from "@/lib/session-store";

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
  checkItems: SessionCheckItem[];
  stamps: string[];
  overbuildBrake: OverbuildBrakeState;
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
  noteHudPulse: (pulse: HudPulse) => void;
  acknowledgeMovedIn: () => void;
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
      checkItems: [],
      stamps: [],
      overbuildBrake: initialOverbuildBrake,
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
        const prev = get().missionId;
        const mission = id ? missionsById[id] : undefined;
        const checkItems =
          id && id === prev && get().checkItems.length > 0
            ? get().checkItems
            : (mission?.do ?? []).map((text) => ({ text, done: false }));
        set({
          missionId: id,
          calm: "session",
          checkItems,
          overbuildBrake: reduceOverbuildBrake(get().overbuildBrake, { type: "navigated" }),
        });
      },
      setSpoilers: (value) => set({ spoilers: value }),
      setCalm: (value) => set({ calm: value }),
      setPulse: (patch) => {
        const pulse = { ...get().pulse, ...patch };
        const samples = pushSample(get().samples, pulse);
        const hud: HudPulse | null =
          pulse.coins === "down" ? "rojo" : pulse.houses === "yellow" ? "amarillo" : null;
        set({
          pulse,
          samples,
          overbuildBrake: hud
            ? reduceOverbuildBrake(get().overbuildBrake, { type: "pulse", pulse: hud })
            : get().overbuildBrake,
        });
      },
      noteHudPulse: (pulse) =>
        set({
          overbuildBrake: reduceOverbuildBrake(get().overbuildBrake, { type: "pulse", pulse }),
        }),
      acknowledgeMovedIn: () =>
        set({
          overbuildBrake: reduceOverbuildBrake(get().overbuildBrake, { type: "acknowledgeMovedIn" }),
        }),
      toggleCheck: (missionId, index) => {
        if (isLiveLocked(get())) return;
        const current = get().checks[missionId] ?? [];
        const next = current.includes(index)
          ? current.filter((item) => item !== index)
          : [...current, index];
        const mission = missionsById[missionId];
        const checkItems = get().checkItems.map((item, i) =>
          i === index ? { ...item, done: !item.done } : item,
        );
        set({
          checks: { ...get().checks, [missionId]: next },
          checkItems,
          overbuildBrake: reduceOverbuildBrake(get().overbuildBrake, {
            type: "checklistChanged",
            missionKind: mission?.kind,
            itemCount: mission?.do.length,
            checkedCount: next.length,
          }),
        });
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
          checkItems: [],
          stamps: [],
          samples: [],
          liveEnabled: false,
          liveSnapshot: null,
          liveMissionId: null,
          liveConfidence: 0,
          liveFileName: null,
          lastImportedAt: null,
          liveBanner: null,
          liveBannerFailed: false,
          overbuildBrake: reduceOverbuildBrake(get().overbuildBrake, { type: "sessionLifecycle" }),
        }),
      applyLiveSnapshot: (snapshot, fileName) => {
        const match = matchLiveSnapshot(snapshot);
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
        const pulse = { ...get().pulse, ...progress.pulse };
        const banner =
          snapshot.quests.length > 0
            ? liveOkLine(snapshot.quests.length, title, get().locale)
            : liveOkSaveLine(title, get().locale);
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
          pulse,
          samples: pushSample(get().samples, pulse),
          calm: "session",
          liveBanner: banner,
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
      skipHydration: true,
      partialize: (state) => ({
        missionId: state.missionId,
        spoilers: state.spoilers,
        calm: state.calm,
        completed: state.completed,
        chat: state.chat,
        pulse: state.pulse,
        checks: state.checks,
        checkItems: state.checkItems,
        stamps: state.stamps,
        overbuildBrake: state.overbuildBrake,
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
