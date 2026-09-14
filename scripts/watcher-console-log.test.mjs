import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ps1 = readFileSync(join(root, "public/watch-harbor-live.ps1"), "utf8");
const bat = readFileSync(join(root, "public/watch-harbor-live.bat"), "utf8");

test("summary line keeps counts and adds pulseHint coins/houses, in Spanish", () => {
  assert.match(ps1, /function Get-CoinsLabel\(\[string\]\$coins\) \{/);
  assert.match(ps1, /function Get-HousesLabel\(\[string\]\$houses\) \{/);
  assert.match(
    ps1,
    /Write-Host "\$\(Get-Date -Format HH:mm:ss\) \$\(\$save\.Name\) -> \$bCount edificios \/ \$gCount bienes \| Monedas: \$coinsLabel \| Casas: \$housesLabel"/,
  );
});

test("names line: top building names (catalog Spanish name, GUID-name fallback), capped, with a '+K más' overflow", () => {
  assert.match(ps1, /function Get-BuildingsLogLine\(\$buildings, \$catalog, \[int\]\$maxNames\) \{/);
  assert.match(ps1, /function Get-BuildingLabel\(\[string\]\$id, \[string\]\$fallback, \$catalog\) \{/);
  assert.match(ps1, /\$label×\$\(\[int\]\$b\.count\)/);
  assert.match(ps1, /\+\$extra más/);
  assert.match(ps1, /Get-BuildingsLogLine \$buildings \$catalog 10/);
  assert.match(ps1, /if \(\$namesLine\) \{ Write-Host "  Edificios: \$namesLine" \}/);
});

test("names line caps between 8 and 12 entries before overflowing", () => {
  const call = ps1.match(/Get-BuildingsLogLine \$buildings \$catalog (\d+)/);
  assert.ok(call, "Get-BuildingsLogLine call with a numeric cap must exist");
  const cap = Number(call[1]);
  assert.ok(cap >= 8 && cap <= 12, `expected cap in [8,12], got ${cap}`);
});

test("optional goods line: top stock by amount, max ~6", () => {
  assert.match(ps1, /function Get-GoodsLogLine\(\$goods, \[int\]\$maxGoods\) \{/);
  // Sort-Object -Property "<name>" silently fails to compare Hashtable/[ordered]@{} values;
  // the fix uses a scriptblock with bracket indexing instead — see the ps1 comment above Get-BuildingsLogLine.
  assert.match(ps1, /Sort-Object -Property \{ \$_\["amount"\] \} -Descending/);
  assert.doesNotMatch(ps1, /Sort-Object -Property amount -Descending/);
  assert.match(ps1, /Get-GoodsLogLine \$goods 6/);
  assert.match(ps1, /if \(\$goodsLine\) \{ Write-Host "  Bienes: \$goodsLine" \}/);
});

test("building names line sorts by count via bracket indexing, not the broken -Property <name> form", () => {
  assert.match(ps1, /Sort-Object -Property \{ \$_\["count"\] \} -Descending/);
  assert.doesNotMatch(ps1, /Sort-Object -Property count -Descending/);
});

test("no raw GUID dump in any Write-Host line", () => {
  const hostLines = ps1.match(/Write-Host "[^"]*"/g) ?? [];
  for (const line of hostLines) {
    assert.doesNotMatch(line, /\bguid\b/i, `Write-Host line leaks a guid reference: ${line}`);
  }
});

test("bundled .bat ships the same console-log helpers as the .ps1 source", () => {
  assert.match(bat, /function Get-BuildingsLogLine\(\$buildings, \$catalog, \[int\]\$maxNames\) \{/);
  assert.match(bat, /function Get-GoodsLogLine\(\$goods, \[int\]\$maxGoods\) \{/);
  assert.match(bat, /Monedas: \$coinsLabel \| Casas: \$housesLabel/);
});
