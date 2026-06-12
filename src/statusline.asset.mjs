// SpinnerPay CLI status line. Reads the cached ad next to this script and
// prints one clickable line. Pure: no network, no stdin, never throws — the
// prime directive is to never break the user's terminal.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FRESH_MS = 10 * 60 * 1000; // ignore a stale cache (extension offline)
const ESC = String.fromCharCode(27);

// Strip C0/DEL/C1 control chars so ad text can never emit its own ANSI/OSC
// escapes — the OSC 8 hyperlink below is the only escape we ever print.
function strip(s) {
  let out = "";
  for (const ch of String(s)) {
    const k = ch.codePointAt(0);
    if (k <= 0x1f || (k >= 0x7f && k <= 0x9f)) continue;
    out += ch;
  }
  return out;
}

try {
  const here = dirname(fileURLToPath(import.meta.url));
  const o = JSON.parse(readFileSync(join(here, "ad.json"), "utf8"));
  const fresh = o && typeof o.ts === "number"
    && (Date.now() - o.ts) <= FRESH_MS
    && typeof o.adText === "string" && o.adText.length > 0;
  if (fresh) {
    const text = "ad" + String.fromCharCode(183) + " " + strip(o.adText).slice(0, 80); // "ad· "
    let url = typeof o.clickUrl === "string" ? strip(o.clickUrl) : "";
    // Only ever emit an http(s) hyperlink. A javascript:/file:/data: clickUrl
    // from a spoofed/compromised cache must never become a clickable terminal link.
    if (!/^https?:\/\//i.test(url)) url = "";
    // OSC 8 hyperlink:  ESC ]8;; <url> ESC \   <text>   ESC ]8;; ESC \
    const out = url
      ? ESC + "]8;;" + url + ESC + "\\" + text + ESC + "]8;;" + ESC + "\\"
      : text;
    process.stdout.write(out);
  }
} catch { /* never break the CLI */ }
process.exit(0);
