import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ps1 = readFileSync(join(root, "public/watch-harbor-live.ps1"), "utf8");
const bat = readFileSync(join(root, "public/watch-harbor-live.bat"), "utf8");

test("Get-HarborCoverage casts List fields via ToArray for Windows PowerShell 5.1", () => {
  assert.match(ps1, /\$coverage = \[ordered\]@\{ fields = \[object\[\]\]\$fields\.ToArray\(\) \}/);
  assert.doesNotMatch(ps1, /\$coverage = \[ordered\]@\{ fields = @\(\$fields\) \}/);
  assert.match(bat, /\[object\[\]\]\$fields\.ToArray\(\)/);
  assert.doesNotMatch(bat, /fields = @\(\$fields\)/);
});

test(
  "Get-HarborCoverage builds coverage without ArgumentException on PS 5.1",
  { skip: process.platform !== "win32" },
  () => {
    const lines = [];
    lines.push("$ErrorActionPreference = 'Stop'");
    lines.push("$fields = New-Object System.Collections.Generic.List[object]");
    lines.push("$fields.Add([ordered]@{ field = 'buildings'; status = 'present'; count = 1 })");
    lines.push("$fields.Add([ordered]@{ field = 'quests'; status = 'unavailable'; reason = 'empty-on-purpose' })");
    lines.push("try {");
    lines.push("  $bad = [ordered]@{ fields = @($fields) }");
    lines.push("  throw 'expected ArgumentException for @($fields) on List[object]'");
    lines.push("} catch [System.ArgumentException] {");
    lines.push("  # expected on Windows PowerShell 5.1");
    lines.push("}");
    lines.push("$coverage = [ordered]@{ fields = [object[]]$fields.ToArray() }");
    lines.push("if ($coverage.fields.Count -ne 2) { throw 'expected 2 fields' }");
    lines.push("if ($coverage.fields[0].field -ne 'buildings') { throw 'first field wrong' }");
    lines.push("Write-Output 'ok'");
    const harness = lines.join("\n");
    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", harness],
      { encoding: "utf8", cwd: root },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /ok/);
  },
);
