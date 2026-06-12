// SpinnerPay — key-scoped injection into Claude Code's CLI settings.json.
//
// Writes TWO surfaces:
//   1. statusLine  -> runs our statusline script, which prints a clickable
//      OSC-8 ad line at the bottom of the terminal (the click surface).
//   2. spinnerVerbs -> {mode:"replace", verbs:[adText]} so the thinking-shimmer
//      verb itself shows the ad (brand-impression surface; CC >= 2.1.143).
//
// Reversibility contract: we only ever touch OUR two keys. Restore removes just
// those keys from the CURRENT file, so any user edits made since install
// survive. A first-apply backup is kept solely so we can delete a settings.json
// that did not exist before us.

import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";

const ABSENT = "__SPINNERPAY_ABSENT__";

/** Materialize the runtime dir: copy the statusline script + write the ad cache.
 *  `spDir` is where the script and ad.json live (e.g. ~/.spinnerpay).
 *  `assetPath` is the absolute path to statusline.asset.mjs (the caller knows
 *  its own install dir — VS Code gives it via ExtensionContext.extensionPath —
 *  so we never depend on import.meta resolution surviving the bundler). */
export function writeRuntime(spDir, ad, assetPath) {
  mkdirSync(spDir, { recursive: true });
  copyFileSync(assetPath, join(spDir, "statusline.mjs"));
  writeAd(spDir, ad);
}

/** Refresh just the served ad (called on every rotation; no settings write). */
export function writeAd(spDir, ad) {
  writeFileSync(join(spDir, "ad.json"),
    JSON.stringify({ adText: ad.adText, clickUrl: ad.clickUrl || "", ts: Date.now() }));
}

function backupPath(settingsPath) { return settingsPath + ".spinnerpay-backup"; }

/** Apply both surfaces. Idempotent. Returns the keys we set. */
export function apply(settingsPath, spDir, ad, assetPath) {
  const existed = existsSync(settingsPath);
  if (existed && !existsSync(backupPath(settingsPath)))
    copyFileSync(settingsPath, backupPath(settingsPath));
  else if (!existed && !existsSync(backupPath(settingsPath)))
    writeFileSync(backupPath(settingsPath), ABSENT);

  mkdirSync(dirname(settingsPath), { recursive: true });
  writeRuntime(spDir, ad, assetPath);

  const cfg = existed ? JSON.parse(readFileSync(settingsPath, "utf8")) : {};
  cfg.statusLine = { type: "command", command: `node ${JSON.stringify(join(spDir, "statusline.mjs"))}`, padding: 0 };
  cfg.spinnerVerbs = { mode: "replace", verbs: [ad.adText] };
  writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + "\n");
  return { statusLine: cfg.statusLine, spinnerVerbs: cfg.spinnerVerbs };
}

/** Remove ONLY our keys. If the file did not exist before us and is now empty,
 *  delete it. Leaves all other user settings byte-intact. */
export function restore(settingsPath, spDir) {
  const bak = backupPath(settingsPath);
  if (existsSync(settingsPath)) {
    const cfg = JSON.parse(readFileSync(settingsPath, "utf8"));
    delete cfg.statusLine;
    delete cfg.spinnerVerbs;
    const wasAbsent = existsSync(bak) && readFileSync(bak, "utf8") === ABSENT;
    if (wasAbsent && Object.keys(cfg).length === 0) rmSync(settingsPath);
    else writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + "\n");
  }
  if (existsSync(spDir)) rmSync(spDir, { recursive: true, force: true });
  if (existsSync(bak)) rmSync(bak);
}
