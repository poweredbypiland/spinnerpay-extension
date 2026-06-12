import * as vscode from "vscode";
import { homedir } from "node:os";
import { join } from "node:path";
import { apply, restore, type Ad } from "./inject.mjs";

const SP_DIR = join(homedir(), ".spinnerpay");
const SETTINGS = join(homedir(), ".claude", "settings.json");

// Wizard-of-Oz backend: a single hand-controlled ad endpoint. Until it's live,
// the bundled fallback keeps every surface working so we can ship + collect
// installs before the real auction exists.
const AD_ENDPOINT = "https://spinnerpay.ai/api/ad";
const ROTATE_MS = 120_000;
const FALLBACK: Ad = {
  adText: "SpinnerPay: get paid while your AI codes. spinnerpay.ai",
  clickUrl: "https://spinnerpay.ai",
};

let timer: ReturnType<typeof setInterval> | undefined;
let status: vscode.StatusBarItem;
let enabled = true;
let assetPath = "";

// Never trust the endpoint blindly (defense in depth). adText is length-capped;
// clickUrl must be http(s) or it's dropped, so a compromised endpoint cannot push
// a javascript:/file:/data: link into the terminal or a giant string into config.
function safeClickUrl(u: unknown): string {
  return typeof u === "string" && /^https?:\/\//i.test(u) ? u : "";
}

async function fetchAd(): Promise<Ad> {
  try {
    const r = await fetch(AD_ENDPOINT, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const j = (await r.json()) as Partial<Ad>;
      if (j && typeof j.adText === "string" && j.adText.trim())
        return { adText: j.adText.slice(0, 80).trim(), clickUrl: safeClickUrl(j.clickUrl) };
    }
  } catch { /* offline / bad response → fallback */ }
  return FALLBACK;
}

async function rotate(): Promise<void> {
  if (!enabled) return;
  const ad = await fetchAd();
  try {
    apply(SETTINGS, SP_DIR, ad, assetPath);
    status.text = "$(megaphone) SpinnerPay";
    status.tooltip = `Serving: ${ad.adText}`;
  } catch (e) {
    status.text = "$(warning) SpinnerPay";
    status.tooltip = `Could not patch Claude Code: ${String(e)}`;
  }
}

export async function activate(ctx: vscode.ExtensionContext): Promise<void> {
  assetPath = join(ctx.extensionPath, "dist", "statusline.asset.mjs");

  status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.text = "SpinnerPay";
  status.command = "spinnerpay.status";
  status.show();
  ctx.subscriptions.push(status);

  await rotate();
  timer = setInterval(() => void rotate(), ROTATE_MS);
  ctx.subscriptions.push({ dispose: () => { if (timer) clearInterval(timer); } });

  ctx.subscriptions.push(
    vscode.commands.registerCommand("spinnerpay.status", () => {
      vscode.window.showInformationMessage(
        enabled
          ? "SpinnerPay is serving a sponsored line on your Claude Code spinner."
          : "SpinnerPay is disabled. Run 'SpinnerPay: Enable' to start earning.");
    }),
    vscode.commands.registerCommand("spinnerpay.restore", () => {
      enabled = false;
      restore(SETTINGS, SP_DIR);
      status.text = "SpinnerPay (restored)";
      vscode.window.showInformationMessage("SpinnerPay: Claude Code restored to its original state.");
    }),
    vscode.commands.registerCommand("spinnerpay.enable", async () => {
      enabled = true;
      await rotate();
      vscode.window.showInformationMessage("SpinnerPay enabled.");
    }),
    vscode.commands.registerCommand("spinnerpay.disable", () => {
      enabled = false;
      restore(SETTINGS, SP_DIR);
      status.text = "SpinnerPay (off)";
      vscode.window.showInformationMessage("SpinnerPay disabled.");
    }),
  );
}

export function deactivate(): void {
  if (timer) clearInterval(timer);
  // Leave the surface applied between sessions (it self-heals on next activate);
  // the statusline cache simply goes stale and stops rendering after FRESH_MS.
}
