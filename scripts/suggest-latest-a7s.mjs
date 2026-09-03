/**
 * Policy for Windows watcher/installer: pick the newest .a7s under
 * Documents Anno 1800 accounts (registry Documents / OneDrive redirect).
 * Runtime is public/*.ps1 — this module is the CI-testable contract.
 */

export function expandEnv(value, env = process.env) {
  if (!value) return "";
  return String(value).replace(/%([^%]+)%/g, (_, name) => env[name] ?? `%${name}%`);
}

export function documentFolders({
  userProfile,
  myDocuments,
  oneDrive,
  oneDriveConsumer,
  oneDriveCommercial,
  registryPersonal = [],
  env = process.env,
} = {}) {
  const folders = [];
  const add = (path) => {
    const expanded = expandEnv(path, env).replace(/[\\/]+$/, "");
    if (!expanded) return;
    if (!folders.includes(expanded)) folders.push(expanded);
  };
  if (userProfile) {
    add(userProfile + "\\Documents");
    add(userProfile + "\\Documentos");
    add(userProfile + "\\OneDrive\\Documents");
    add(userProfile + "\\OneDrive\\Documentos");
  }
  add(myDocuments);
  for (const root of [oneDrive, oneDriveConsumer, oneDriveCommercial]) {
    if (!root) continue;
    add(root + "\\Documents");
    add(root + "\\Documentos");
  }
  for (const personal of registryPersonal) add(personal);
  return folders;
}

export function annoCandidates(docs) {
  return docs.map((doc) => doc + "\\Anno 1800");
}

export function pickLatestA7s(files) {
  const saves = (files ?? []).filter((file) => /\.a7s$/i.test(file.name ?? file.path ?? ""));
  if (saves.length === 0) return null;
  return [...saves].sort((a, b) => (b.mtimeMs ?? 0) - (a.mtimeMs ?? 0))[0];
}

export function annoRootFromSavePath(savePath) {
  if (!savePath) return null;
  const parts = String(savePath).split(/[\\/]/);
  const idx = parts.lastIndexOf("Anno 1800");
  if (idx < 0) return null;
  return parts.slice(0, idx + 1).join("\\");
}
