import { closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, writeSync } from "node:fs";
import { join } from "node:path";
import {
  HARBOR_LIVE_LAST_GOOD,
  HARBOR_LIVE_NAME,
  ingestLivePreferLastGood,
  type LivePreferResult,
} from "./crash-safe.ts";

function writeFsync(path: string, text: string) {
  const fd = openSync(path, "w");
  try {
    writeSync(fd, text.endsWith("\n") ? text : `${text}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/** Same-volume tmp → fsync → rename. Never writes .a7s. */
export function writeHarborLiveCrashSafe(dir: string, jsonText: string) {
  JSON.parse(jsonText);
  const dest = join(dir, HARBOR_LIVE_NAME);
  const lastGood = join(dir, HARBOR_LIVE_LAST_GOOD);
  const tmp = join(dir, `${HARBOR_LIVE_NAME}.tmp`);
  const lastTmp = join(dir, `${HARBOR_LIVE_LAST_GOOD}.tmp`);
  writeFsync(tmp, jsonText);
  renameSync(tmp, dest);
  writeFsync(lastTmp, jsonText);
  renameSync(lastTmp, lastGood);
}

export function readHarborLiveCrashSafe(dir: string, locale?: string | null): LivePreferResult {
  const dest = join(dir, HARBOR_LIVE_NAME);
  const lastGood = join(dir, HARBOR_LIVE_LAST_GOOD);
  const primary = existsSync(dest) ? readFileSync(dest, "utf8") : "";
  const fallback = existsSync(lastGood) ? readFileSync(lastGood, "utf8") : null;
  return ingestLivePreferLastGood({ primary, lastGood: fallback, locale });
}
