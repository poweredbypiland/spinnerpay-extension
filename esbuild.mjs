import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";

await build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  external: ["vscode"],          // provided by the VS Code host
  outfile: "dist/extension.js",
  sourcemap: true,
  minify: process.argv.includes("--minify"),
});

// statusline.asset.mjs is NOT bundled — it's copied to the user's machine at
// runtime (apply → ~/.spinnerpay/statusline.mjs). Ship it alongside the bundle;
// extension.ts resolves it via ctx.extensionPath/dist/statusline.asset.mjs.
mkdirSync("dist", { recursive: true });
copyFileSync("src/statusline.asset.mjs", "dist/statusline.asset.mjs");
console.log("built dist/extension.js + dist/statusline.asset.mjs");
