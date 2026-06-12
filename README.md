<h1 align="center">SpinnerPay</h1>

<p align="center"><em>A sponsored line on the Claude Code spinner. Fully reversible.</em></p>

---

## What it does

While Claude Code is thinking, its spinner shows a random verb
("Discombobulating…", "Baking…"). SpinnerPay replaces that verb with a small,
clickable sponsored line, and shows the same sponsor as a clickable link in your
terminal status line. That's it.

## How it works

SpinnerPay edits `~/.claude/settings.json` to add two keys it owns:

- `statusLine`: runs a small script that prints one clickable sponsored line.
- `spinnerVerbs`: sets the thinking-spinner verb to the sponsored line.

Both are **key-scoped**: SpinnerPay only ever touches its own two keys, so any
other settings you have are left untouched.

## Fully reversible

Run **SpinnerPay: Restore Claude Code** from the command palette at any time. It
removes only SpinnerPay's keys and restores Claude Code to its original state.

## Privacy

SpinnerPay **never reads your code, prompts, completions, or chat content.** It
only manages the sponsored line.

## Commands

| Command | What it does |
| --- | --- |
| SpinnerPay: Show status | Show current state |
| SpinnerPay: Restore Claude Code | Remove SpinnerPay, restore original state |
| SpinnerPay: Enable | Start showing the sponsored line |
| SpinnerPay: Disable | Stop and restore |

[spinnerpay.ai](https://spinnerpay.ai)
