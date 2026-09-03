import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dumpLive = join(root, "tools/harbor-buddy-telemetry/dump_live.lua");
const zipPath = join(root, "public/harbor-buddy-telemetry.zip");
const packMod = join(root, "scripts/pack-mod.mjs");
const assets = join(root, "mod/harbor-buddy-telemetry/data/config/export/main/asset/assets.xml");
const ceilingDoc = join(root, "docs/telemetry-ceiling.md");
const fieldsDoc = join(root, "docs/harbor-live-fields.md");

const shipped = [
  "public/install-harbor-buddy.bat",
  "public/install-harbor-buddy.ps1",
  "public/watch-harbor-live.bat",
  "public/watch-harbor-live.ps1",
].map((rel) => join(root, rel));

function zipLocalNames(buf) {
  const names = [];
  let i = 0;
  while (i + 30 <= buf.length) {
    if (buf.readUInt32LE(i) !== 0x04034b50) break;
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const compSize = buf.readUInt32LE(i + 18);
    names.push(buf.toString("utf8", i + 30, i + 30 + nameLen));
    i += 30 + nameLen + extraLen + compSize;
  }
  return names;
}

test("dump_live.lua exists in tools but is never shipped", () => {
  assert.equal(existsSync(dumpLive), true, "tools dump stays in-repo as the forbidden reference");
  const zip = readFileSync(zipPath);
  const names = zipLocalNames(zip);
  assert.ok(names.length > 0, "shipped zip has entries");
  assert.equal(
    names.some((name) => name.toLowerCase().endsWith(".lua") || name.includes("dump_live")),
    false,
    `lua leaked into zip: ${names.join(", ")}`,
  );
  assert.equal(zip.includes("dump_live.lua"), false);

  for (const file of shipped) {
    const text = readFileSync(file);
    assert.equal(text.includes("dump_live.lua"), false, `${file} must not mention dump_live.lua`);
    assert.doesNotMatch(text.toString("utf8"), /\.lua\b/i, `${file} must not ship lua`);
  }
});

test("pack-mod skips lua and scripts/; zip scan fails closed", () => {
  const src = readFileSync(packMod, "utf8");
  assert.match(src, /if \(name\.endsWith\("\.lua"\)\) continue/);
  assert.match(src, /if \(name === "scripts"\) continue/);
  assert.match(src, /dump_live\.lua/);
});

test("telemetry pack stays an empty stub; watcher does not need it", () => {
  const xml = readFileSync(assets, "utf8");
  assert.match(xml, /<ModOps>\s*<\/ModOps>/);
  assert.doesNotMatch(xml, /GUID/i);

  const watcher = readFileSync(join(root, "public/watch-harbor-live.ps1"), "utf8");
  assert.match(watcher, /ReadAllBytes\(\$save\.FullName\)/);
  assert.doesNotMatch(watcher, /WriteAll(?:Bytes|Text)\(\$save/);
  assert.doesNotMatch(watcher, /\.a7s["'].*(Write|Set-Content|Out-File)/i);
  assert.match(watcher, /WriteAllText\(\$outJson/);
  assert.doesNotMatch(watcher, /mods\\harbor-buddy-telemetry/);
  assert.doesNotMatch(watcher, /\bpython(?:\.exe)?\b/i);
  assert.doesNotMatch(watcher, /\b(?:LoadLibrary|AnnoPython|ctypes)\b/);

  const install = readFileSync(join(root, "public/install-harbor-buddy.ps1"), "utf8");
  assert.match(install, /Harbor Buddy anda igual sin él/);
  assert.match(install, /legacyLua/);
});

test("ceiling doc sits next to pulseHint contract", () => {
  const ceiling = readFileSync(ceilingDoc, "utf8");
  assert.match(ceiling, /pulseHint/);
  assert.match(ceiling, /dump_live\.lua/);
  assert.match(ceiling, /Read-only/);
  assert.match(ceiling, /Python/);
  const fields = readFileSync(fieldsDoc, "utf8");
  assert.match(fields, /telemetry-ceiling\.md/);
  assert.match(fields, /pulseHint/);
});
