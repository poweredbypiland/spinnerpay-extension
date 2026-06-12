import * as vscode from "vscode";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { apply, restore } from "./inject.mjs";

const BASE = "https://spinnerpay.ai";
const AD_ENDPOINT = `${BASE}/api/ad`;
const METRICS_ENDPOINT = `${BASE}/api/metrics`;
const BALANCE_ENDPOINT = `${BASE}/api/balance`;
const SP_DIR = join(homedir(), ".spinnerpay");
const SETTINGS = join(homedir(), ".claude", "settings.json");
const ROTATE_MS = 120_000;

interface ServedAd { adText: string; clickUrl: string; adId: string }
const FALLBACK: ServedAd = {
  adText: "SpinnerPay: get paid while your AI codes. spinnerpay.ai",
  clickUrl: "https://spinnerpay.ai",
  adId: "house",
};

function safeClickUrl(u: unknown): string {
  return typeof u === "string" && /^https?:\/\//i.test(u) ? u : "";
}

let timer: ReturnType<typeof setInterval> | undefined;
let status: vscode.StatusBarItem;
let enabled = true;
let assetPath = "";
let clientId = "";

async function fetchAd(): Promise<ServedAd> {
  try {
    const r = await fetch(AD_ENDPOINT, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const j = (await r.json()) as Record<string, unknown>;
      if (j && typeof j.adText === "string" && j.adText.trim())
        return {
          adText: (j.adText as string).slice(0, 80).trim(),
          clickUrl: safeClickUrl(j.clickUrl),
          adId: typeof j.id === "string" ? j.id : "unknown",
        };
    }
  } catch { /* offline / bad response → fallback */ }
  return FALLBACK;
}

// Best-effort, never throws. Server computes the revenue; the client is never
// trusted for money. One impression per rotation cycle (a deliberate WoZ
// simplification until per-view tracking lands).
async function sendMetric(eventType: "impression" | "click", adId: string): Promise<void> {
  try {
    await fetch(METRICS_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_id: clientId, event_type: eventType, ad_id: adId }),
      signal: AbortSignal.timeout(8000),
    });
  } catch { /* best effort */ }
}

async function refreshBalance(): Promise<void> {
  try {
    const r = await fetch(`${BALANCE_ENDPOINT}?client_id=${encodeURIComponent(clientId)}`,
      { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const j = (await r.json()) as { today_usd?: string; lifetime_usd?: string };
      if (j && typeof j.today_usd === "string") {
        status.text = `$(megaphone) SpinnerPay $${j.today_usd} today`;
        status.tooltip = `Lifetime: $${j.lifetime_usd ?? "0"} (accruing). Click for status.`;
      }
    }
  } catch { /* keep prior text */ }
}

async function rotate(): Promise<void> {
  if (!enabled) return;
  const ad = await fetchAd();
  try {
    apply(SETTINGS, SP_DIR, ad, assetPath);
    if (status.text === "SpinnerPay") status.text = "$(megaphone) SpinnerPay";
    void sendMetric("impression", ad.adId);
    void refreshBalance();
  } catch (e) {
    status.text = "$(warning) SpinnerPay";
    status.tooltip = `Could not patch Claude Code: ${String(e)}`;
  }
}

export async function activate(ctx: vscode.ExtensionContext): Promise<void> {
  assetPath = join(ctx.extensionPath, "dist", "statusline.asset.mjs");

  clientId = ctx.globalState.get<string>("spinnerpay.clientId") || "";
  if (!clientId) {
    clientId = randomUUID();
    await ctx.globalState.update("spinnerpay.clientId", clientId);
  }

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
          ? "SpinnerPay is serving a sponsored line and accruing your share of the ad revenue."
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
}
