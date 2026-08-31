import { create } from "zustand";
import { persist } from "zustand/middleware";
import { firstPlayableMissionId, missionsById } from "@/lib/data";
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
  setMissionId: (id: string | null) => void;
  setSpoilers: (value: boolean) => void;
  setCalm: (value: CalmMode) => void;
  setPulse: (patch: Partial<Pulse>) => void;
  toggleCheck: (missionId: string, index: number) => void;
  markComplete: (id: string) => void;
  addChat: (turn: ChatTurn) => void;
  clearChat: () => void;
  resetProgress: () => void;
};

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
      setMissionId: (id) => set({ missionId: id, calm: "session" }),
      setSpoilers: (value) => set({ spoilers: value }),
      setCalm: (value) => set({ calm: value }),
      setPulse: (patch) => set({ pulse: { ...get().pulse, ...patch } }),
      toggleCheck: (missionId, index) => {
        const current = get().checks[missionId] ?? [];
        const next = current.includes(index)
          ? current.filter((item) => item !== index)
          : [...current, index];
        set({ checks: { ...get().checks, [missionId]: next } });
      },
      markComplete: (id) => {
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
        }),
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
      }),
    },
  ),
);
