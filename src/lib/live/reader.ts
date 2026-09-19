import type { LiveFileHandle } from "./handle-store.ts";

export type ReaderStatus = "imported" | "watching" | "stopped";

/** One explicitly authorized reader per app, independent of route lifetimes.
 * A generation token prevents late reads from restoring paused/replaced files.
 * Failed/partial reads are retried without advancing the accepted file mtime.
 */
export function createLiveReader(options: {
  accept: (file: File) => Promise<(() => void) | null>;
  status: (status: ReaderStatus) => void;
  intervalMs?: number;
}) {
  let generation = 0;
  let handle: LiveFileHandle | undefined;
  let modified = -1;
  let timer: ReturnType<typeof setInterval> | undefined;
  let busyGeneration: number | undefined;
  async function tick() {
    const token = generation;
    if (!handle || busyGeneration === token) return;
    busyGeneration = token;
    try {
      const file = await handle.getFile();
      if (token !== generation) return;
      if (file.lastModified !== modified) {
        const commit = await options.accept(file);
        if (token !== generation) return;
        if (!commit) {
          options.status("stopped");
          return;
        }
        commit();
        if (token !== generation) return;
        modified = file.lastModified;
      }
      options.status("watching");
    } catch {
      if (token === generation) options.status("stopped");
    } finally {
      if (busyGeneration === token) busyGeneration = undefined;
    }
  }
  function stop() {
    generation++;
    clearInterval(timer);
    timer = undefined;
    handle = undefined;
    options.status("imported");
  }
  async function start(next: LiveFileHandle) {
    stop();
    handle = next;
    modified = -1;
    timer = setInterval(() => void tick(), options.intervalMs ?? 2500);
    await tick();
  }
  return { start, stop, tick };
}
