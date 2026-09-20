// Integration check against real Chromium IndexedDB, using the production TS modules.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = resolve(root, "tmp");
mkdirSync(tempRoot, { recursive: true });
const profile = mkdtempSync(resolve(tempRoot, "history-browser-"));
const server = createServer((req, res) => {
  const path = resolve(root, `.${new URL(req.url, "http://localhost").pathname}`);
  if (!path.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  if (req.url === "/") {
    res.setHeader("Content-Type", "text/html");
    res.end("<title>History integration</title>");
    return;
  }
  try {
    const output = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText;
    res.setHeader("Content-Type", "text/javascript");
    res.end(output);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
const origin = `http://127.0.0.1:${server.address().port}`;
let context;
try {
  context = await chromium.launchPersistentContext(profile, { headless: true });
  const page = await context.newPage();
  await page.goto(origin);
  const fixture = JSON.parse(
    readFileSync(resolve(root, "src/lib/live/fixture-islands.json"), "utf8"),
  );
  const result = await page.evaluate(async (fixture) => {
    const { createIndexedDbHistoryStore } = await import("/src/lib/history/store.ts");
    const store = createIndexedDbHistoryStore();
    const missing = await store.record(fixture);
    if (missing.ok) throw Error("Unverified campaign was auto-selected");
    const results = await Promise.all(
      [1, 2, 3].map((simTime) =>
        createIndexedDbHistoryStore().record(
          { ...fixture, simTime },
          { explicitCampaignId: "integration" },
        ),
      ),
    );
    if (results.some((row) => !row.ok)) throw Error("Record failed");
    return (await store.list("integration")).length;
  }, fixture);
  assert.equal(result, 3);
  await context.close();
  context = await chromium.launchPersistentContext(profile, { headless: true });
  const restored = await context.newPage();
  await restored.goto(origin);
  const durable = await restored.evaluate(async () => {
    const { createIndexedDbHistoryStore } = await import("/src/lib/history/store.ts");
    const rows = await createIndexedDbHistoryStore().list("integration");
    return {
      count: rows.length,
      amounts: rows[0].summary.islands.map((island) => island.stock[0].amount),
    };
  });
  assert.deepEqual(durable, { count: 3, amounts: [10, 50] });
  const failed = await restored.evaluate(async (fixture) => {
    const { createIndexedDbHistoryStore } = await import("/src/lib/history/store.ts");
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = original.apply(this, args);
      this.transaction.abort();
      return request;
    };
    let rejected = false;
    try {
      await createIndexedDbHistoryStore().record(
        { ...fixture, simTime: 4 },
        { explicitCampaignId: "integration" },
      );
    } catch {
      rejected = true;
    } finally {
      IDBObjectStore.prototype.put = original;
    }
    return { rejected, count: (await createIndexedDbHistoryStore().list("integration")).length };
  }, fixture);
  assert.deepEqual(failed, { rejected: true, count: 3 });
  console.log(
    "PASS: explicit identity, concurrent writes, browser restart, independent island stock, transaction abort.",
  );
} finally {
  await context?.close();
  await new Promise((done) => server.close(done));
  assert.ok(resolve(profile).startsWith(tempRoot + sep), "Unexpected profile path");
  rmSync(profile, { recursive: true, force: true });
}
