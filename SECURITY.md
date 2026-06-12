# SpinnerPay Extension — Security Model

SpinnerPay modifies Claude Code configuration and renders a remote-fetched
sponsored line into your terminal. We treat that as a real attack surface. This
documents the threat model and the controls in place.

## Trust boundary

The only untrusted input is the **ad payload** fetched from our endpoint
(`/api/ad`). Everything downstream treats it as hostile.

## Controls

| Risk | Control |
|---|---|
| Malicious click target (`javascript:`/`file:`/`data:` URL rendered as a clickable OSC-8 terminal link) | `clickUrl` must match `^https?://` or it is dropped. Enforced in **both** the extension (`safeClickUrl`) and the render script (`statusline.asset.mjs`), and server-side in `/api/ad`. |
| ANSI/OSC escape injection via ad text | Render script strips all C0/DEL/C1 control chars; the OSC-8 frame is the only escape ever emitted. |
| Config/UI bloat via oversized text | `adText` capped at 80 chars client-side and server-side. |
| Corrupting the user's `settings.json` | Writes are key-scoped (only `statusLine` + `spinnerVerbs`); a first-apply backup is taken; values are JSON-escaped via `JSON.stringify`; parse failures fail safe (no write). |
| Irreversibility | `SpinnerPay: Restore Claude Code` removes only our keys and restores the original; round-trip is byte-identical (verified). |
| Reading user code/prompts | The extension reads none of it. The only network call is a GET for the ad; no code, prompts, or chat content is sent. |
| Transport | Ad endpoint is HTTPS only. |

## Known limitations (hardening backlog)

- Ad payloads are trusted over HTTPS but not cryptographically signed. A future
  version should sign payloads so a compromised CDN/endpoint can't serve content.
- `settings.json` is reformatted on write (JSON.parse/stringify). A future
  version should do raw-text key-scoped edits to preserve user formatting and
  JSONC comments.
- No self-update integrity pinning yet.

## Reporting

Security issues: security@spinnerpay.ai
