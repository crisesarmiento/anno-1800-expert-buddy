import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { it } from "node:test";

it(
  "executes the real PowerShell writer: no capture preserves evidence; valid capture refreshes it",
  { skip: process.platform !== "win32" },
  () => {
    const code = String.raw`
$ErrorActionPreference = 'Stop'
$tokens=$null; $errors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile((Join-Path (Get-Location) 'public/watch-harbor-live.ps1'),[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw 'Parse failed' }
$names=@('Update-HarborNative','Test-NativeProperty','Get-NativeProbeReason')
$ast.FindAll({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $names -contains $n.Name},$true) | ForEach-Object { Invoke-Expression $_.Extent.Text }
$outJson='test-only'; $nativeEndpoint='http://127.0.0.1:8000'; $NativeLanguage='spanish'
$nativeHeartbeatSeconds=45; $nativeResidenceGuids=@{}; $guidByNumber=@{}
$nativeProductionByIsland=@{}; $nativeCountsByIsland=@{}; $nativeCountsObservedAtByIsland=@{}
$seed='{"updatedAt":"2026-01-01T00:00:00Z","connection":{"mode":"manual","native":{"provider":"ux-enhancer-ocr","view":"production","islandName":"Demo","observedAt":"2026-01-01T00:00:00Z"}},"telemetry":{"production":[{"guid":123,"observedAt":"2026-01-01T00:00:00Z"}]}}'
function Test-Path { return $true }
function Get-Content { return $seed }
function Write-HarborLiveCrashSafe($path,$json) { $script:written=$json | ConvertFrom-Json }
function Invoke-WebRequest { return [pscustomobject]@{StatusCode=$script:status;Content=$script:body} }
function Write-Host {}
foreach ($case in @(
  @{code=200;body='{"version":"v11.0"}';result='no_observation'},
  @{code=204;body='';result='no_window'},
  @{code=200;body='{bad';result=$null},
  @{code=200;body='{"version":"v11.0","islandName":"Demo","123":{"limit":4,"percentBoost":100}}';result='observation'}
)) {
  $script:status=$case.code; $script:body=$case.body; $script:nativeLastSignature=$null
  Update-HarborNative
  if ($written.connection.nativeProbe.result -ne $case.result) { throw 'Wrong capture outcome' }
  if ($case.result -ne 'observation') {
    if ($written.connection.native.observedAt -ne '2026-01-01T00:00:00Z') { throw 'Refreshed historical evidence' }
    if ($written.telemetry.production[0].observedAt -ne '2026-01-01T00:00:00Z') { throw 'Replaced historical rows' }
  } else {
    if ($written.telemetry.production[0].requiredTMin -ne 4) { throw 'Missing real demand' }
    if ($written.connection.native.observedAt -eq '2026-01-01T00:00:00Z') { throw 'Observation not refreshed' }
  }
}
'PASS'
`;
    const run = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        Buffer.from(code, "utf16le").toString("base64"),
      ],
      { encoding: "utf8", timeout: 20000 },
    );
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /PASS/);
  },
);
