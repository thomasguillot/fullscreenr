# Fullscreenr v1.1 — Design Spec

**Date:** 2026-03-20
**Scope:** Bug fixes, security hardening, meaningful improvements, DX polish, version bump to 1.1.0

---

## Overview

Fullscreenr is a Chrome MV3 extension that intercepts `requestFullscreen()` calls on multi-display setups and replaces them with a "fake" fullscreen (filling the browser window) so secondary monitors don't black out. This spec covers all changes for the v1.1 release.

---

## Section 1: Bug Fixes & Security

### 1.1 `postMessage` wildcard origin

**Problem:** `content.js` posts `fullscreenr-activate` with `"*"` as the target origin, and `injected.js` accepts the message with no origin check. Any malicious page script can fake-activate the extension.

**Fix:**
- In `content.js`: use `window.location.origin` as the target origin when posting. For `file://` pages (where origin is `"null"`), fall back to `"*"`.
- In `injected.js`: verify `event.origin === window.location.origin` before acting on any incoming message. Apply the same `"null"` fallback.

### 1.2 Missing `webkitExitFullscreen` override

**Problem:** `injected.js` overrides `requestFullscreen` and its webkit/moz variants for entering fullscreen, and overrides `document.exitFullscreen` for exiting — but never overrides `document.webkitExitFullscreen`. Sites that call this variant to exit fake fullscreen won't trigger the cleanup.

**Fix:** Override `Document.prototype.webkitExitFullscreen` alongside `exitFullscreen`, mirroring the same pattern.

### 1.3 Security check only scans `content.js`

**Problem:** `tools/check-security.mjs` checks for `eval()` and `new Function()` in `content.js` only. `injected.js` and `background.js` are not scanned.

**Fix:** Refactor `checkContentScript()` into a generic `checkJsFile(filePath)` function and call it for all three JS files in the project root.

---

## Section 2: Meaningful Improvements

### 2.1 Dynamic display detection (hotplug)

**Problem:** The display count is checked once at page load. Plugging in or unplugging a display mid-session leaves the extension stuck in its initial state.

**Fix:**
- `background.js`: Listen to `chrome.system.display.onDisplayChanged`. On change, re-run the display count check and broadcast a `{ type: "displays-updated", multipleDisplays: bool }` message to all active tabs via `chrome.tabs.query` + `chrome.tabs.sendMessage`. Add `"tabs"` to the manifest permissions.
- `content.js`: Listen for `chrome.runtime.onMessage` for `displays-updated`. Forward the updated state to `injected.js` via `postMessage` — either `fullscreenr-activate` or the new `fullscreenr-deactivate`.
- `injected.js`: Handle `fullscreenr-deactivate` message — set `enabled = false`, and if currently in fake fullscreen, call `exitFakeFullscreen()`.

### 2.2 `document.fullscreenEnabled` getter override

**Problem:** Some sites check `document.fullscreenEnabled` before attempting fullscreen. This currently returns the real browser value, potentially `false` in sandboxed contexts, causing sites to skip fullscreen entirely.

**Fix:** In `overrideFullscreenGetters()`, add an override for `document.fullscreenEnabled` that returns `true` when the extension is enabled.

### 2.3 `requestFullscreen` options parameter

**Problem:** The `requestFullscreen(options)` override silently drops the `options` argument. While this doesn't break fake fullscreen visually, strict call sites may have issues.

**Fix:** Update all three `requestFullscreen` overrides (`standard`, `webkit`, `moz`) to accept and explicitly ignore the `options` parameter — signature becomes `function (options)` with the argument received but unused in fake fullscreen mode.

### 2.4 `mozCancelFullScreen` exit override

**Problem:** The moz exit variant `document.mozCancelFullScreen` is not overridden, leaving an unhandled exit path.

**Fix:** Override `Document.prototype.mozCancelFullScreen` mirroring the `exitFullscreen` pattern.

---

## Section 3: DX & Polish

### 3.1 `.gitignore`

Add `.gitignore` with:
- `node_modules/`
- `icons/*.png` (generated artifacts)
- `.DS_Store`

### 3.2 Defer style injection to first activation

**Problem:** `injectStyles()` is called unconditionally at script load in `injected.js`, injecting a `<style>` tag into every page even if the extension never activates.

**Fix:** Remove the unconditional `injectStyles()` call at the bottom of `injected.js`. It is already called at the top of `enterFakeFullscreen()`, which is the correct and sufficient location.

### 3.3 Comment `overrideFullscreenGetters` call timing

`overrideFullscreenGetters()` runs at load time on every page. This is intentional (getters must be in place before any site code runs), but add a brief inline comment to prevent it from being mistaken for an inadvertent early call.

---

## Section 4: Version Bump & Changelog

### 4.1 Version bump

Update `manifest.json` `"version"` from `"1.0.0"` to `"1.1.0"`. This is a minor bump: new features and bug fixes, no breaking changes.

### 4.2 Changelog output

At the end of all commits, produce a ready-to-paste changelog list covering all changes in this release.

---

## Commit Strategy

One commit per logical group, in order:

1. `chore: add .gitignore`
2. `fix: expand security check to all JS files`
3. `fix: add webkitExitFullscreen and mozCancelFullScreen overrides`
4. `fix: tighten postMessage origin checks`
5. `refactor: defer style injection to first activation`
6. `feat: dynamic display detection via onDisplayChanged`
7. `feat: fullscreenEnabled getter override and requestFullscreen options passthrough`
8. `chore: bump version to 1.1.0`

---

## Files Changed

| File | Changes |
|------|---------|
| `.gitignore` | New file |
| `manifest.json` | Version bump to 1.1.0; add `"tabs"` permission |
| `background.js` | Add `onDisplayChanged` listener; broadcast to tabs |
| `content.js` | Forward deactivate message; fix postMessage origin |
| `injected.js` | Add webkit/moz exit overrides; fullscreenEnabled getter; options param; deactivate handler; fix postMessage origin; defer style injection |
| `tools/check-security.mjs` | Scan all JS files, not just content.js |

---

## Out of Scope

- Popup UI or settings panel
- Firefox support
- Automated tests
- Chrome Web Store packaging/submission
