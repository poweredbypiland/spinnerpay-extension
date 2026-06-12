// Safe proof harness: copies your REAL ~/.claude/settings.json to a temp dir,
// applies the SpinnerPay ad surfaces, renders the clickable status line, then
// restores and proves the round-trip leaves the file byte-identical.
// Never touches your real settings.json.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { apply, restore } from "../src/inject.mjs";

const ASSET = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "statusline.asset.mjs");

const REAL = join(homedir(), ".claude", "settings.json");
const DEMO = "/tmp/spinnerpay-demo";
const settingsPath = join(DEMO, "settings.json");
const spDir = join(DEMO, ".spinnerpay");

rmSync(DEMO, { recursive: true, force: true });
mkdirSync(DEMO, { recursive: true });

// Build a PRISTINE pre-install baseline from the real settings shape. If
// SpinnerPay is already installed and live, its keys are in the real file;
// strip them so this tests a clean install round-trip, not a re-patch.
let baseObj = {};
if (existsSync(REAL)) { try { baseObj = JSON.parse(readFileSync(REAL, "utf8")); } catch { baseObj = {}; } }
delete baseObj.statusLine;
delete baseObj.spinnerVerbs;
const before = JSON.stringify(baseObj, null, 2) + "\n";
writeFileSync(settingsPath, before);
console.log(`pristine baseline from real settings (${before.length} bytes) -> ${settingsPath}\n`);

const ad = {
  adText: "SpinnerPay: get paid while your AI codes. spinnerpay.ai",
  clickUrl: "https://spinnerpay.ai",
};

// 1) APPLY
const keys = apply(settingsPath, spDir, ad, ASSET);
console.log("APPLIED. Keys written into settings.json:");
console.log("  statusLine  :", JSON.stringify(keys.statusLine));
console.log("  spinnerVerbs:", JSON.stringify(keys.spinnerVerbs));

// 2) RENDER the status line exactly as Claude Code's CLI would invoke it
const rendered = execFileSync("node", [join(spDir, "statusline.mjs")], { encoding: "utf8" });
console.log("\nRendered status line (raw bytes, cat -v style):");
console.log("  " + rendered.replace(/\x1b/g, "^[").replace(/\\/g, "\\"));
console.log("As your terminal shows it (clickable hyperlink):");
console.log("  " + rendered);

// 3) RESTORE
restore(settingsPath, spDir);
const after = existsSync(settingsPath) ? readFileSync(settingsPath, "utf8") : "__DELETED__";

// 4) PROVE clean round-trip
console.log("\nRound-trip check:");
console.log("  settings.json identical to original after restore:", after === before);
console.log("  runtime dir removed:", !existsSync(spDir));
if (after !== before) {
  console.log("  --- BEFORE ---\n" + before);
  console.log("  --- AFTER ----\n" + after);
  process.exit(1);
}
console.log("\nPASS — surfaces apply, render a clickable ad, and fully reverse.");
