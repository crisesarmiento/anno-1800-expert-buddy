import { create } from "zustand";
import { ingestSnapshotHistory } from "@/lib/history";
import { useHarbor } from "@/lib/store";
import { ingestLiveFile, type LiveSnapshot } from "@/lib/live";
import { createLiveReader, type ReaderStatus } from "@/lib/live/reader";
import {
  ensureReadPermission,
  readPersistedLiveHandle,
  type LiveFileHandle,
} from "@/lib/live/handle-store";

export function commitLiveSnapshot(snapshot: LiveSnapshot, fileName?: string | null) {
  useHarbor.getState().applyLiveSnapshot(snapshot, fileName);
  const harbor = useHarbor.getState();
  void ingestSnapshotHistory(snapshot, {
    explicitCampaignId: snapshot.campaignId
      ? undefined
      : (harbor.manualHistoryCampaignId ?? harbor.historyCampaignId ?? undefined),
  })
    .then((history) => {
      if (useHarbor.getState().liveSnapshot !== snapshot) return;
      useHarbor.getState().applyHistoryResult(history);
    })
    .catch(() => {
      if (useHarbor.getState().liveSnapshot !== snapshot) return;
      useHarbor.setState({
        historyError:
          "No se pudo guardar el historial en este navegador. La lectura de la partida sigue disponible.",
      });
    });
}

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
export async function startLiveReader(
  handle: LiveFileHandle,
  opts?: { resetCampaign?: boolean },
) {
  liveReader.stop();
  // A newly picked file is a different stream. Resuming the same handle must
  // keep the campaign the player already chose.
  if (opts?.resetCampaign !== false) {
    useHarbor.setState({
      manualHistoryCampaignId: null,
      pendingCampaign: null,
      historyCampaignId: null,
    });
  }
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
    await startLiveReader(handle, { resetCampaign: false });
  } catch {
    if (token !== authorization) return;
    liveReader.stop();
    useLiveReader.setState({ status: "stopped" });
  }
}
