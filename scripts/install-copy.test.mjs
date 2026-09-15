import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const installPs1 = readFileSync(join(root, "public/install-harbor-buddy.ps1"), "utf8");
const installBat = readFileSync(join(root, "public/install-harbor-buddy.bat"), "utf8");
const watchPs1 = readFileSync(join(root, "public/watch-harbor-live.ps1"), "utf8");
const watchBat = readFileSync(join(root, "public/watch-harbor-live.bat"), "utf8");
const i18n = readFileSync(join(root, "src/lib/i18n.ts"), "utf8");

test("install-harbor-buddy copy stays reassuring: no admin, does not touch saves, never blames the player", () => {
  assert.match(installPs1, /Tranquilo: solo copia una carpeta/);
  assert.match(installPs1, /No pide admin ni toca tus partidas guardadas/);
  assert.match(installPs1, /Harbor Buddy anda igual sin él/);
  assert.doesNotMatch(installPs1, /error del usuario|tu culpa/i);
});

test("install-harbor-buddy never suggests a blind path open — every candidate is Test-Path checked first", () => {
  for (const src of [installPs1, watchPs1, watchBat]) {
    assert.match(src, /if \(-not \(Test-Path -LiteralPath \$typed\)\)/);
  }
});

test("watch-harbor-live copy stays calm and specific about what it reads/writes, .bat mirrors the .ps1", () => {
  assert.match(watchPs1, /la leo, nunca la toco/);
  assert.match(watchPs1, /Dejá esta ventana abierta y jugá tranquilo/);
  assert.match(watchBat, /la leo, nunca la toco/);
  assert.match(watchBat, /Dejá esta ventana abierta y jugá tranquilo/);
});

test("no script promises Steam auto-F5, DLL injection, or writing the .a7s save", () => {
  for (const src of [installPs1, installBat, watchPs1, watchBat]) {
    assert.doesNotMatch(src, /auto-F5|SendKeys|AppActivate/i);
    assert.doesNotMatch(src, /LoadLibrary|\.dll\b/i);
  }
  assert.match(watchPs1, /No inyecta Anno/);
});

test("i18n install.* (es) reassures without overclaiming: no admin, saves untouched, no Lua", () => {
  const esInstall = i18n.slice(i18n.indexOf("  install: {"), i18n.indexOf("  connect: {"));
  assert.match(esInstall, /sin pedir administrador ni tocar tus partidas guardadas/);
  assert.match(esInstall, /ni corre Lua/);
  assert.match(esInstall, /Nunca manda F5 ni toca teclas por vos/);
});
