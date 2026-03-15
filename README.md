# Fullscreenr

[![License: GPL v2](https://img.shields.io/badge/License-GPL%20v2-blue.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html)

**Fullscreen video without blacking out your second display.**

A small Chrome extension: install it and forget it. No settings, no UI. When you have multiple monitors and you fullscreen a video in the browser, Fullscreenr keeps your other screen(s) active instead of turning them black (e.g. on macOS, where true fullscreen often ties to Spaces and blanks the rest).

---

## The problem

On multi-display setups (especially macOS), using the browser’s real fullscreen for a video can:

- Turn your **other display(s) black**, or
- Trigger **Spaces / fullscreen desktop** and hide everything else

So you can’t comfortably watch a video on one screen while using the other.

## What Fullscreenr does

- **Detects multiple displays** (via Chrome’s `system.display` API).
- **Only when you have more than one screen:** it intercepts fullscreen requests (e.g. from YouTube, Netflix, Vimeo, Twitch) and replaces them with a **“fake” fullscreen** that simply fills the **current browser window**.
- **Single display:** it does nothing; you keep normal browser fullscreen.
- **No configuration.** Install → it works when you have multiple displays. Press **Escape** (or the site’s exit fullscreen) to leave fake fullscreen.

So: **install and forget**. Your second screen stays on.

---

## How it works

1. **Background script** checks how many displays are connected (`chrome.system.display.getInfo`). Only if there’s more than one does it enable the behavior.
2. **Content script** loads a small **injected script** into each page and tells it to activate when the multi-display check says so.
3. When a page calls `element.requestFullscreen()` (or webkit/moz variants):
   - Fullscreenr **blocks** the real fullscreen.
   - It **remembers** the element (usually the `<video>`), applies a fixed full-viewport style so it fills the window, and fires the usual fullscreen events so the site still thinks it’s “fullscreen.”
4. **Escape** or the site’s exit fullscreen removes that style and restores the element.

All logic and styles are local; no analytics or network calls.

---

## Installation (unpacked)

1. Clone or download this repo.
2. **Icons (required for the extension to look right):**
   ```bash
   npm install
   npm run generate:icons
   ```
   This creates `icons/icon16.png`, `icon48.png`, and `icon128.png` from `icons/fullscreenr.svg`.
3. In Chrome, open **chrome://extensions/**.
4. Turn on **Developer mode** (top right).
5. Click **Load unpacked** and select the project folder (the one that contains `manifest.json`).

After that, use the web as usual; fullscreen on video sites will use in-window “fake” fullscreen when you have multiple displays.

---

## Usage

- Use YouTube, Netflix, Vimeo, Twitch, or any site that uses the standard fullscreen API.
- Click the site’s fullscreen button or press **F** (where supported); the video will fill the **current browser window** instead of taking over the whole display.
- Press **Escape** to exit.
- For a cinema-like experience, maximize the browser window on the display where you’re watching.

---

## Permissions and privacy

- **`system.display`** — Used only to count how many displays you have, so the extension activates only on multi-display setups. No data is sent anywhere.
- **Background service worker** — Runs only to answer the “how many displays?” check when a tab loads.
- No analytics, no telemetry, no remote scripts. Everything runs locally.

---

## Development

### Icon generation

Icons are built from `icons/fullscreenr.svg` (white rounded background, dark icon).

```bash
npm install
npm run generate:icons
```

Output: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`.

### Linting

[ESLint](https://eslint.org/) is used for the extension scripts and tools (tabs, unused vars, etc.):

```bash
npm run lint        # check only
npm run lint:fix    # check and auto-fix
```

### Security checks

Before packaging or publishing:

```bash
npm run security:check
```

This checks manifest version, permissions, and that the content script doesn’t use `eval()` or `new Function()`.

To run both lint and security checks:

```bash
npm run check
```

---

## Testing checklist

- [ ] YouTube — fullscreen button and **F** key.
- [ ] Vimeo, Netflix, Twitch.
- [ ] Plain HTML5 `<video>` with fullscreen controls.
- [ ] **Escape** exits correctly.
- [ ] With **two displays**: second screen stays on (no blackout).
- [ ] With **one display**: normal fullscreen still works.
- [ ] No console errors on tested sites.

---

## License

This project is licensed under the **GNU General Public License v2.0** (GPL-2.0). See [LICENSE](LICENSE) for the full text.
