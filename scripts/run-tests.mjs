/**
 * Portable test runner. Windows does not expand the scripts glob the way a
 * Unix shell does, so npm test enumerates files itself and reports counts.
 *
 * Harbor product tests live in scripts/watcher-*, install-copy, telemetry-ceiling,
 * write-atomic and suggest-latest-a7s. Grok Build harness tests (brand-check,
 * browser-smoke, grok-pwa, with-app-env, auth/migration/preview) are not the
 * app suite: they assume the Linux sandbox and fail on this Windows checkout.
 */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const SCRIPT_TEST_NAMES = new Set([
  "install-copy.test.mjs",
  "suggest-latest-a7s.test.mjs",
  "telemetry-ceiling.test.mjs",
  "write-atomic.test.mjs",
]);

function walk(dir, match, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, match, acc);
    else if (match(entry.name, full)) acc.push(full);
  }
  return acc;
}

function rel(file) {
  return relative(root, file).split("\\").join("/");
}

function stripAnsi(text) {
  return text.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "");
}

function lastInt(text, label) {
  const matches = [...text.matchAll(new RegExp(`(?:^|\\n)(?:# |ℹ )?${label}\\s+(\\d+)`, "g"))];
  const value = matches.length ? Number(matches[matches.length - 1][1]) : NaN;
  return Number.isFinite(value) ? value : 0;
}

function parseCounts(text) {
  const clean = stripAnsi(text);
  return {
    tests: lastInt(clean, "tests"),
    pass: lastInt(clean, "pass"),
    fail: lastInt(clean, "fail"),
  };
}

function runSuite(label, files, extraArgs = []) {
  if (files.length === 0) {
    console.error(`${label}: 0 files discovered — refusing to report a green suite`);
    process.exitCode = 1;
    return { label, files: 0, tests: 0, pass: 0, fail: 1 };
  }
  const result = spawnSync(process.execPath, [...extraArgs, "--test", ...files], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  const counts = parseCounts(output);
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  return { label, files: files.length, ...counts, status: result.status ?? 1 };
}

const scriptTests = walk(join(root, "scripts"), (name) => {
  if (name.startsWith("watcher-") && name.endsWith(".test.mjs")) return true;
  return SCRIPT_TEST_NAMES.has(name);
}).map(rel);

const appTests = walk(
  join(root, "src"),
  (name) => name.endsWith(".test.ts") || name.endsWith(".test.tsx"),
).map(rel);

const scripts = runSuite("scripts", scriptTests);
const app = runSuite("app", appTests, ["--experimental-strip-types"]);

console.log("");
console.log(
  `scripts: ${scripts.files} files, ${scripts.tests} tests (${scripts.pass} pass, ${scripts.fail} fail)`,
);
console.log(`app: ${app.files} files, ${app.tests} tests (${app.pass} pass, ${app.fail} fail)`);

if (scripts.files === 0 || app.files === 0) process.exitCode = 1;
if ((scripts.tests ?? 0) === 0 || (app.tests ?? 0) === 0) {
  console.error("A suite ran zero tests — not green.");
  process.exitCode = 1;
}
