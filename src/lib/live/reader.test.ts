import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { createLiveReader } from "./reader.ts";

const file = (mtime = 1) => new File(["{}"], "live.json", { lastModified: mtime });

it("reads changed files, retries rejected same-mtime reads, and stops on pause", async () => {
  let accepted = 0,
    attempts = 0,
    mtime = 1;
  const reader = createLiveReader({
    status: () => {},
    intervalMs: 100000,
    accept: async () => {
      attempts++;
      return attempts === 1
        ? null
        : () => {
            accepted++;
          };
    },
  });
  try {
    await reader.start({ getFile: async () => file(mtime) });
    assert.equal(accepted, 0);
    await reader.tick();
    assert.equal(accepted, 1);
    await reader.tick();
    assert.equal(attempts, 2);
    mtime++;
    await reader.tick();
    assert.equal(accepted, 2);
    reader.stop();
    await reader.tick();
    assert.equal(accepted, 2);
  } finally {
    reader.stop();
  }
});

it("discards an old pending read after replacement and never overlaps ticks", async () => {
  let finish!: (file: File) => void;
  let calls = 0,
    commits = 0;
  const reader = createLiveReader({
    status: () => {},
    intervalMs: 100000,
    accept: async () => () => {
      commits++;
    },
  });
  try {
    const pending = reader.start({
      getFile: () => {
        calls++;
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    });
    await reader.tick();
    assert.equal(calls, 1);
    await reader.start({ getFile: async () => file(2) });
    finish(file());
    await pending;
    assert.equal(commits, 1);
  } finally {
    reader.stop();
  }
});

it("pause while parsing prevents a late commit", async () => {
  let finish!: (commit: () => void) => void;
  let commits = 0;
  const reader = createLiveReader({
    status: () => {},
    intervalMs: 100000,
    accept: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const pending = reader.start({ getFile: async () => file() });
  await Promise.resolve();
  reader.stop();
  finish(() => {
    commits++;
  });
  await pending;
  assert.equal(commits, 0);
});

it("recovers from transient getFile failures", async () => {
  let attempts = 0,
    commits = 0;
  const statuses: string[] = [];
  const reader = createLiveReader({
    status: (status) => statuses.push(status),
    intervalMs: 100000,
    accept: async () => () => {
      commits++;
    },
  });
  try {
    await reader.start({
      getFile: async () => {
        if (++attempts === 1) throw Error("busy");
        return file();
      },
    });
    assert.equal(statuses.at(-1), "stopped");
    await reader.tick();
    assert.equal(commits, 1);
    assert.equal(statuses.at(-1), "watching");
  } finally {
    reader.stop();
  }
});

it("route components share one root-owned lifecycle; manual imports stop it", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  assert.match(read("../../routes/__root.tsx"), /<LiveReaderLifecycle/);
  assert.doesNotMatch(read("../../components/live-panel.tsx"), /watchTimer|tickLiveHandle/);
  assert.match(
    read("../../components/live-panel.tsx"),
    /liveReader.stop\(\);\s*applyLiveSnapshot/g,
  );
  assert.doesNotMatch(
    read("../../components/editorial-home.tsx"),
    /tickLiveHandle|clearInterval\(timer/,
  );
});
