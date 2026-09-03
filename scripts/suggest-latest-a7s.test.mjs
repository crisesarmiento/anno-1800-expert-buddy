import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  annoCandidates,
  annoRootFromSavePath,
  documentFolders,
  expandEnv,
  pickLatestA7s,
} from "./suggest-latest-a7s.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const watcher = readFileSync(join(root, "public/watch-harbor-live.ps1"), "utf8");
const installer = readFileSync(join(root, "public/install-harbor-buddy.ps1"), "utf8");
const scripts = [watcher, installer];

test("expands registry User Shell Folders style paths", () => {
  assert.equal(
    expandEnv("%USERPROFILE%\\Documents", { USERPROFILE: "C:\\Users\\Cris" }),
    "C:\\Users\\Cris\\Documents",
  );
});

test("Documents candidates include OneDrive, MyDocuments, and registry Personal", () => {
  const folders = documentFolders({
    userProfile: "C:\\Users\\Cris",
    myDocuments: "D:\\Docs",
    oneDrive: "C:\\Users\\Cris\\OneDrive",
    registryPersonal: ["%USERPROFILE%\\OneDrive\\Documents"],
    env: { USERPROFILE: "C:\\Users\\Cris" },
  });
  assert.ok(folders.includes("C:\\Users\\Cris\\Documents"));
  assert.ok(folders.includes("C:\\Users\\Cris\\OneDrive\\Documents"));
  assert.ok(folders.includes("D:\\Docs"));
  assert.deepEqual(annoCandidates(["D:\\Docs"]), ["D:\\Docs\\Anno 1800"]);
});

test("picks the newest .a7s by mtime and walks up to Anno 1800", () => {
  const latest = pickLatestA7s([
    { name: "old.a7s", mtimeMs: 10, path: "C:\\Docs\\Anno 1800\\accounts\\a\\old.a7s" },
    { name: "notes.txt", mtimeMs: 99, path: "C:\\Docs\\Anno 1800\\accounts\\a\\notes.txt" },
    { name: "new.a7s", mtimeMs: 50, path: "C:\\Docs\\Anno 1800\\accounts\\b\\new.a7s" },
  ]);
  assert.equal(latest.name, "new.a7s");
  assert.equal(annoRootFromSavePath(latest.path), "C:\\Docs\\Anno 1800");
  assert.equal(pickLatestA7s([]), null);
});

test("Windows ps1 scripts suggest latest save and fall back to browse", () => {
  for (const src of scripts) {
    assert.match(src, /User Shell Folders/);
    assert.match(src, /Shell Folders/);
    assert.match(src, /OneDriveConsumer/);
    assert.match(src, /Find-LatestA7sUnder/);
    assert.match(src, /Sort-Object LastWriteTimeUtc -Descending/);
    assert.match(src, /Filter "\*\.a7s"/);
    assert.match(src, /Browse-AnnoRoot/);
    assert.match(src, /Read-Host/);
    assert.doesNotMatch(src, /SendKeys/);
    assert.doesNotMatch(src, /WriteAllBytes\(\$save/);
    assert.doesNotMatch(src, /Set-Content[^\n]*\.a7s/);
  }
});

test("watcher reads saves and only writes harbor-live.json", () => {
  assert.match(watcher, /\[System\.IO\.File\]::ReadAllBytes\(\$save\.FullName\)/);
  assert.match(watcher, /function Write-HarborLiveCrashSafe/);
  assert.match(watcher, /HarborBuddy\.A7sScan/);
  assert.match(watcher, /Ctrl\+F5/);
  assert.match(watcher, /accountdata\.a7s/);
  assert.doesNotMatch(watcher, /WriteAllText\(\$outJson/);
  assert.equal((watcher.match(/WriteAllBytes/g) || []).length, 0);
});
