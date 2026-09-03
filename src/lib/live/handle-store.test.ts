import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  LIVE_HANDLE_KEY,
  LIVE_POLL_MS,
  createMemoryHandleKv,
  ensureReadPermission,
  liveAutoPath,
  liveChipCopy,
  liveChipLabel,
  persistLiveHandle,
  readPersistedLiveHandle,
  refreshLiveHandle,
  shouldReadOnHydrate,
  tickLiveHandle,
} from "./handle-store.ts";

function fakeHandle(opts?: {
  name?: string;
  lastModified?: number;
  permission?: PermissionState;
  reads?: File[];
}) {
  let permission: PermissionState = opts?.permission ?? "granted";
  let lastModified = opts?.lastModified ?? 10;
  const reads = opts?.reads ?? [];
  let readCount = 0;
  const handle = {
    name: opts?.name ?? "harbor-live.json",
    queryPermission: async () => permission,
    requestPermission: async () => {
      if (permission === "denied") return permission;
      permission = "granted";
      return permission;
    },
    getFile: async () => {
      readCount += 1;
      if (reads.length) return reads[Math.min(readCount - 1, reads.length - 1)]!;
      return { name: handle.name, lastModified, text: async () => "{}" } as File;
    },
    readCount: () => readCount,
  };
  return handle;
}

describe("persist harbor-live FileSystemFileHandle", () => {
  it("round-trips the chosen handle through the KV (IndexedDB stand-in)", async () => {
    const kv = createMemoryHandleKv();
    const handle = fakeHandle();
    await persistLiveHandle(handle, kv);
    const loaded = await readPersistedLiveHandle(kv);
    assert.equal(loaded, handle);
    assert.equal(LIVE_HANDLE_KEY, "harbor-live.json");
  });

  it("rehydrates the handle without reading the file", async () => {
    const kv = createMemoryHandleKv();
    const handle = fakeHandle();
    await persistLiveHandle(handle, kv);
    assert.equal(shouldReadOnHydrate(), false);
    const loaded = await readPersistedLiveHandle(kv);
    assert.ok(loaded);
    assert.equal(handle.readCount(), 0);
  });

  it("never auto-reads Documents\\Anno 1800", () => {
    assert.equal(liveAutoPath(), null);
    const src = readFileSync(new URL("./handle-store.ts", import.meta.url), "utf8");
    assert.doesNotMatch(src, /Documents\\\\Anno 1800|Documents\/Anno 1800/i);
  });

  it("Actualizar re-reads the same handle after permission", async () => {
    const kv = createMemoryHandleKv();
    const handle = fakeHandle({ permission: "prompt" });
    await persistLiveHandle(handle, kv);
    const file = await refreshLiveHandle(kv);
    assert.equal(file?.name, "harbor-live.json");
    assert.equal(handle.readCount(), 1);
    assert.equal(await ensureReadPermission(handle), "granted");
  });

  it("stays calm when permission is denied — no file read", async () => {
    const kv = createMemoryHandleKv();
    const handle = fakeHandle({ permission: "denied" });
    await persistLiveHandle(handle, kv);
    const file = await refreshLiveHandle(kv);
    assert.equal(file, undefined);
    assert.equal(handle.readCount(), 0);
  });

  it("polls only when lastModified changes", async () => {
    const first = { name: "harbor-live.json", lastModified: 1 } as File;
    const same = { name: "harbor-live.json", lastModified: 1 } as File;
    const next = { name: "harbor-live.json", lastModified: 2 } as File;
    const handle = fakeHandle({ reads: [first, same, next] });
    const seen: number[] = [];
    let last = 0;
    last = await tickLiveHandle(handle, last, async (file) => {
      seen.push(file.lastModified);
    });
    last = await tickLiveHandle(handle, last, async (file) => {
      seen.push(file.lastModified);
    });
    last = await tickLiveHandle(handle, last, async (file) => {
      seen.push(file.lastModified);
    });
    assert.deepEqual(seen, [1, 2]);
    assert.equal(LIVE_POLL_MS, 2500);
  });

  it("uses Spanish Actualizar once a handle exists, Elegir live before", () => {
    const copy = liveChipCopy("es");
    assert.equal(copy.refresh, "Actualizar");
    assert.equal(copy.pick, "Elegir live");
    assert.equal(liveChipLabel(false, copy), "Elegir live");
    assert.equal(liveChipLabel(true, copy), "Actualizar");
  });
});

function sliceFn(src: string, name: string) {
  const exportStart = src.indexOf(`export function ${name}(`);
  const start = exportStart >= 0 ? exportStart : src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const nextExport = src.indexOf("\nexport function ", start + 1);
  const nextFn = src.indexOf("\nfunction ", start + 1);
  const candidates = [nextExport, nextFn].filter((n) => n >= 0);
  const next = candidates.length ? Math.min(...candidates) : -1;
  return src.slice(start, next === -1 ? undefined : next);
}

describe("Actualizar chip on collapsed PowerUpStrip", () => {
  const panel = readFileSync(new URL("../../components/live-panel.tsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../../components/harbor-app.tsx", import.meta.url), "utf8");
  const desk = readFileSync(new URL("../../components/session-desk.tsx", import.meta.url), "utf8");
  const bat = readFileSync(new URL("../../../public/watch-harbor-live.bat", import.meta.url), "utf8");
  const ps1 = readFileSync(new URL("../../../public/watch-harbor-live.ps1", import.meta.url), "utf8");

  it("puts a paper/ink stamp chip on the collapsed strip summary, not a brass Button", () => {
    const power = sliceFn(panel, "PowerUpSection");
    assert.match(power, /data-live-refresh-chip=/);
    assert.match(power, /<summary/);
    assert.match(power, /!open/);
    assert.match(power, /InkSeal/);
    assert.match(power, /tone="ink"/);
    assert.match(power, /liveChipLabel/);
    assert.doesNotMatch(power, /<Button[^>]*data-live-refresh-chip/);
    assert.doesNotMatch(power, /variant="default"/);
  });

  it("never mounts the chip on Home hero", () => {
    const welcome = sliceFn(app, "Welcome");
    const heroStart = welcome.indexOf('data-hero="esto-ahora"');
    const heroEnd = welcome.indexOf("data-welcome-primary");
    assert.ok(heroStart >= 0 && heroEnd > heroStart);
    const hero = welcome.slice(heroStart, heroEnd);
    assert.doesNotMatch(hero, /data-live-refresh-chip/);
    assert.doesNotMatch(hero, /Actualizar/);
    const deskHeroStart = desk.indexOf('data-hero="esto-ahora"');
    const deskHeroEnd = desk.indexOf("data-home-primary");
    const deskHero = desk.slice(deskHeroStart, deskHeroEnd);
    assert.doesNotMatch(deskHero, /data-live-refresh-chip/);
  });

  it("does not auto-open or nag, and leaves watcher scripts alone", () => {
    const power = sliceFn(panel, "PowerUpSection");
    assert.match(power, /useState\(false\)/);
    assert.doesNotMatch(power, /shouldReadOnHydrate\(\) === true/);
    assert.doesNotMatch(panel, /Elegí el archivo ahora|conectá ya|¡/);
    assert.match(bat, /watch-harbor-live/);
    assert.match(ps1, /harbor-live\.json/);
    assert.doesNotMatch(panel, /writeFile|spawn\(|exec\(/);
  });
});
