# Fullscreenr

[![License: GPL v2](https://img.shields.io/badge/License-GPL%20v2-blue.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html)

**Fullscreen video without blacking out your second display.**

A small Chrome extension: install it and forget it. No settings, no UI. When you have multiple monitors and you fullscreen a video in the browser, Fullscreenr keeps your other screen(s) active instead of turning them black (e.g. on macOS, where true fullscreen often ties to Spaces and blanks the rest).

Click the fullscreen button (or press **F** where supported) — the video fills the browser window. Press **Escape** to exit. Your second screen stays on.

---

## The problem

On multi-display setups (especially macOS), using the browser's real fullscreen for a video can:

- Turn your **other display(s) black**, or
- Trigger **Spaces / fullscreen desktop** and hide everything else

So you can't comfortably watch a video on one screen while using the other.

## What Fullscreenr does

- **Detects multiple displays** (via Chrome's `system.display` API) and updates instantly when you plug in or unplug a monitor.
- **Only when you have more than one screen:** intercepts fullscreen requests (e.g. from YouTube, Netflix, Vimeo, Twitch) and replaces them with a **"fake" fullscreen** that fills the **current browser window**.
- **Single display:** does nothing — normal browser fullscreen works as usual.
- **No configuration.** Install → it works.

---

## How it works

1. **Background script** checks how many displays are connected (`chrome.system.display.getInfo`) and listens for display changes (`onDisplayChanged`). Only when there's more than one display does it enable the behavior — and it updates live as you connect or disconnect monitors.
2. **Content script** loads a small **injected script** into each page and tells it to activate or deactivate based on the current display count.
3. When a page calls `element.requestFullscreen()` (or webkit/moz variants):
   - Fullscreenr **blocks** the real fullscreen.
   - It applies a fixed full-viewport style so the element fills the window, and fires the usual fullscreen events so the site still thinks it's in fullscreen.
4. **Escape** or the site's exit fullscreen removes that style and restores the element.

All logic and styles are local; no analytics or network calls.

---

## Installation

1. Clone or download this repo.
2. Generate the icons:
   ```bash
   npm install
   npm run generate:icons
   ```
3. In Chrome, open **chrome://extensions/**.
4. Turn on **Developer mode** (top right).
5. Click **Load unpacked** and select the project folder (the one with `manifest.json`).

After that, use the web as usual. For a cinema-like experience, maximize the browser window on the display where you're watching.

---

## Permissions and privacy

- **`system.display`** — Used to count connected displays and detect changes. No display data leaves your machine.
- **`tabs`** — Used to broadcast display-change updates to open tabs when you plug in or unplug a monitor.
- No analytics, no telemetry, no remote scripts. Everything runs locally.

---

## Development

```bash
npm run lint          # ESLint check
npm run lint:fix      # ESLint check + auto-fix
npm run check         # lint + security check (manifest, permissions, no eval())
npm run generate:icons  # rebuild icons from icons/fullscreenr.svg
```

---

## License

This project is licensed under the **GNU General Public License v2.0** (GPL-2.0). See [LICENSE](LICENSE) for the full text.
