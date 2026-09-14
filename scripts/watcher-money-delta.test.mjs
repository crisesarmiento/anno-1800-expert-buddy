import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ps1 = readFileSync(join(root, "public/watch-harbor-live.ps1"), "utf8");
const bat = readFileSync(join(root, "public/watch-harbor-live.bat"), "utf8");
const schema = JSON.parse(readFileSync(join(root, "docs/harbor-live.schema.json"), "utf8"));

test("coins delta reads/writes a money sidecar, not the public harbor-live.json", () => {
  assert.match(ps1, /\$moneyStatePath = Join-Path \$anno "harbor-live\.money\.json"/);
  assert.match(ps1, /if \(Test-Path -LiteralPath \$moneyStatePath\)/);
  assert.doesNotMatch(ps1, /\$prev = Get-Content -LiteralPath \$outJson/);
});

test("money is persisted for the next tick only after a real money reading", () => {
  assert.match(ps1, /if \(\$scan\.PSObject\.Properties\.Name -contains "money"\) \{/);
  assert.match(ps1, /\[System\.IO\.File\]::WriteAllText\(\$moneyStatePath, \$moneyJson, \$utf8\)/);
});

test("the money sidecar never becomes part of the harbor-live-v1 schema", () => {
  assert.equal(schema.properties.money, undefined);
  assert.equal(schema.properties.pulseHint.properties.money, undefined);
});

test("bundled .bat ships the same sidecar-based delta as the .ps1 source", () => {
  assert.match(bat, /\$moneyStatePath = Join-Path \$anno "harbor-live\.money\.json"/);
  assert.doesNotMatch(bat, /\$prev = Get-Content -LiteralPath \$outJson/);
});

test("still only harbor-live.json / last-good go through the crash-safe writer", () => {
  assert.doesNotMatch(ps1, /Write-HarborLiveCrashSafe \$moneyStatePath/);
});
