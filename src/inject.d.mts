// Types for inject.mjs (plain-JS core, kept JS so the demo harness runs with no build).
export interface Ad { adText: string; clickUrl?: string; }
export function writeRuntime(spDir: string, ad: Ad, assetPath: string): void;
export function writeAd(spDir: string, ad: Ad): void;
export function apply(settingsPath: string, spDir: string, ad: Ad, assetPath: string): {
  statusLine: unknown; spinnerVerbs: unknown;
};
export function restore(settingsPath: string, spDir: string): void;
