import { create } from "zustand";
import { ingestSnapshotHistory } from "@/lib/history";
import { useHarbor } from "@/lib/store";
import { ingestLiveFile, type LiveSnapshot } from "@/lib/live";

export function commitLiveSnapshot(snapshot: LiveSnapshot, fileName?: string | null) {
  useHarbor.getState().applyLiveSnapshot(snapshot, fileName);
  void ingestSnapshotHistory(snapshot).then((history) => {
    useHarbor.getState().applyHistoryResult(history);
  });
}
import { createLiveReader, type ReaderStatus } from "@/lib/live/reader";
import {
  ensureReadPermission,
  readPersistedLiveHandle,
  type LiveFileHandle,
} from "@/lib/live/handle-store";

export const useLiveReader = create<{ status: ReaderStatus }>(() => ({ status: "imported" }));
let authorization = 0;
const reader = createLiveReader({
  status: (status) => useLiveReader.setState({ status }),
  accept: async (file) => {
    const result = await ingestLiveFile(file, useHarbor.getState().locale);
    if (!result.ok) return null;
    return () => commitLiveSnapshot(result.snapshot, file.name);
  },
});
export const liveReader = {
  ...reader,
  stop: () => {
    authorization++;
    reader.stop();
  },
};

// These actions are only called from explicit picker/refresh button gestures.
export async function startLiveReader(handle: LiveFileHandle) {
  liveReader.stop();
  const token = authorization;
  let permission;
  try {
    permission = await ensureReadPermission(handle);
  } catch {
    permission = "denied";
  }
  if (token !== authorization) return;
  if (permission !== "granted") {
    useLiveReader.setState({ status: "stopped" });
    return;
  }
  useHarbor.getState().setLiveEnabled(true);
  await liveReader.start(handle);
}

export async function resumeLiveReader() {
  const token = authorization;
  try {
    const handle = await readPersistedLiveHandle();
    if (token !== authorization) return;
    if (!handle) throw new Error("No selected file");
    await startLiveReader(handle);
  } catch {
    if (token !== authorization) return;
    liveReader.stop();
    useLiveReader.setState({ status: "stopped" });
  }
}
