# Fullscreenr v1.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply bug fixes, security hardening, meaningful improvements, and DX polish to the Fullscreenr Chrome extension, then bump the version to 1.1.0.

**Architecture:** Three-layer Chrome MV3 extension: `background.js` (service worker) handles display detection, `content.js` (content script) bridges the extension and page worlds, `injected.js` (page-world script) overrides browser fullscreen APIs. All communication uses `chrome.runtime.sendMessage` between background↔content and `window.postMessage` between content↔injected.

**Tech Stack:** Chrome Extension Manifest V3, vanilla ES5 JavaScript (no build step), ESLint 9, Node.js for dev tooling (sharp for icons, custom security check script).

---

## Context

- **Repo:** `/Users/thomasguillot/Sites/fullscreenr`
- **Run lint:** `npm run lint` (must pass after every task)
- **Run full check:** `npm run check` (lint + security check)
- **No automated test suite** (out of scope per spec). Verification is via lint + security check + manual steps described per task.
- **Working directory for all commands:** `/Users/thomasguillot/Sites/fullscreenr`

---

## File Map

| File | Role |
|------|------|
| `.gitignore` | New — ignore node_modules, generated PNGs, OS junk |
| `manifest.json` | Add `"tabs"` permission; bump version to `1.1.0` |
| `background.js` | Add `onDisplayChanged` listener + tab broadcast |
| `content.js` | Add `onMessage` handler for deactivate; fix postMessage origins |
| `injected.js` | Add webkit/moz exit overrides; `fullscreenEnabled` getter; options param; deactivate handler; fix postMessage origins; defer style injection |
| `tools/check-security.mjs` | Scan all 3 JS files; add `"tabs"` to allowed permissions |

---

## Task 1: Add `.gitignore`

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create the file**

```
node_modules/
icons/*.png
.DS_Store
```

Save as `.gitignore` in the project root.

- [ ] **Step 2: Verify lint still passes**

```bash
npm run lint
```

Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore"
```

---

## Task 2: Expand security check to all JS files

**Files:**
- Modify: `tools/check-security.mjs`

Currently `checkContentScript()` only scans `content.js`. Refactor it to a generic helper and call it for all three extension JS files. Also add `"tabs"` to `allowedPermissions` (needed for Task 6).

- [ ] **Step 1: Update `tools/check-security.mjs`**

Replace the entire file with:

```js
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(projectRoot, "manifest.json");

function fail(message) {
	console.error(`❌ ${message}`);
	process.exitCode = 1;
}

function ok(message) {
	console.log(`✅ ${message}`);
}

async function readJson(filePath) {
	const raw = await fs.readFile(filePath, "utf8");
	return JSON.parse(raw);
}

async function checkManifest() {
	const manifest = await readJson(manifestPath);

	if (manifest.manifest_version !== 3) {
		fail("manifest_version must be 3");
	} else {
		ok("manifest_version is 3");
	}

	const allowedPermissions = ["system.display", "tabs"];
	const perms = manifest.permissions || [];

	const unexpectedPerms = perms.filter((p) => !allowedPermissions.includes(p));
	if (unexpectedPerms.length > 0) {
		fail(`Unexpected permissions in manifest: ${unexpectedPerms.join(", ")}`);
	} else {
		ok("Only expected permissions are requested");
	}

	if (manifest.host_permissions && manifest.host_permissions.length > 0) {
		fail("host_permissions should not be used unless absolutely necessary");
	} else {
		ok("No host_permissions defined");
	}

	const csp = manifest.content_security_policy && manifest.content_security_policy.extension_pages;
	if (csp) {
		if (csp.includes("unsafe-eval")) {
			fail("CSP must not include 'unsafe-eval'");
		}
		if (csp.includes("http:") || csp.includes("https:")) {
			fail("CSP should not reference remote script sources");
		}
		ok("Content Security Policy looks strict");
	} else {
		ok("No custom CSP (Chrome MV3 default applies)");
	}
}

async function checkJsFile(filePath) {
	const code = await fs.readFile(filePath, "utf8");
	const name = path.basename(filePath);

	if (code.includes("eval(")) {
		fail(`${name} must not use eval()`);
	}

	if (code.includes("new Function(")) {
		fail(`${name} must not use new Function()`);
	}

	ok(`${name} does not use eval() or new Function()`);
}

async function main() {
	await checkManifest();
	await checkJsFile(path.join(projectRoot, "content.js"));
	await checkJsFile(path.join(projectRoot, "injected.js"));
	await checkJsFile(path.join(projectRoot, "background.js"));

	if (process.exitCode && process.exitCode !== 0) {
		console.error("Security checks failed.");
		process.exitCode = 1;
	} else {
		ok("All automated security checks passed.");
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
```

- [ ] **Step 2: Run the full check**

```bash
npm run check
```

Expected output includes:
```
✅ manifest_version is 3
✅ Only expected permissions are requested
✅ No host_permissions defined
✅ No custom CSP (Chrome MV3 default applies)
✅ content.js does not use eval() or new Function()
✅ injected.js does not use eval() or new Function()
✅ background.js does not use eval() or new Function()
✅ All automated security checks passed.
```

- [ ] **Step 3: Commit**

```bash
git add tools/check-security.mjs
git commit -m "fix: expand security check to all JS files"
```

---

## Task 3: Add missing webkit and moz exit fullscreen overrides

**Files:**
- Modify: `injected.js`

`document.webkitExitFullscreen` and `document.mozCancelFullScreen` are not overridden. Sites calling these variants will bypass the fake-fullscreen cleanup.

- [ ] **Step 1: Add captures of original exit methods at the top of `injected.js`**

After line 18 (after `var originalWebkitIsFullScreenGetter = ...`), add two new variable declarations:

```js
	var originalWebkitExitFullscreen = Document.prototype.webkitExitFullscreen || null;
	var originalMozCancelFullScreen = Document.prototype.mozCancelFullScreen || null;
```

- [ ] **Step 2: Add the overrides after the existing `Document.prototype.exitFullscreen` override**

After the closing `};` of `Document.prototype.exitFullscreen` (currently ending around line 169), add:

```js
	if (originalWebkitExitFullscreen) {
		Document.prototype.webkitExitFullscreen = function () {
			if (enabled) {
				exitFakeFullscreen();
				return Promise.resolve();
			}
			return originalWebkitExitFullscreen.call(this);
		};
	}

	if (originalMozCancelFullScreen) {
		Document.prototype.mozCancelFullScreen = function () {
			if (enabled) {
				exitFakeFullscreen();
				return Promise.resolve();
			}
			return originalMozCancelFullScreen.call(this);
		};
	}
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Run security check**

```bash
npm run check
```

Expected: all checks pass.

- [ ] **Step 5: Commit**

```bash
git add injected.js
git commit -m "fix: add webkitExitFullscreen and mozCancelFullScreen overrides"
```

---

## Task 4: Tighten postMessage origin checks

**Files:**
- Modify: `content.js`
- Modify: `injected.js`

Both directions of the postMessage channel currently use `"*"` with no origin validation. A page script can spoof either message to manipulate the extension.

**Key rule:** `window.location.origin` is always a string. On `file://` pages it equals the string `"null"` (4 chars, not JS `null`). The `postMessage` API doesn't accept `"null"` as a valid opaque-origin target, so senders must fall back to `"*"` when `window.location.origin === "null"`. Receivers can use `event.origin === window.location.origin` uniformly — including on `file://` pages — with no special case needed.

Add a shared helper at the top of each file:

```js
var safeOrigin = window.location.origin === "null" ? "*" : window.location.origin;
```

- [ ] **Step 1: Update `content.js`**

Replace the entire file with:

```js
(function () {
	var script = document.createElement("script");
	script.src = chrome.runtime.getURL("injected.js");
	script.type = "text/javascript";
	(document.documentElement || document.head).appendChild(script);

	var safeOrigin = window.location.origin === "null" ? "*" : window.location.origin;
	var ready = false;
	var multipleDisplays = false;

	function tryActivate() {
		if (ready && multipleDisplays) {
			window.postMessage({ type: "fullscreenr-activate" }, safeOrigin);
		}
	}

	window.addEventListener("message", function (event) {
		if (event.origin !== window.location.origin) {
			return;
		}
		if (event.data && event.data.type === "fullscreenr-ready") {
			ready = true;
			tryActivate();
		}
	});

	chrome.runtime.sendMessage({ type: "check-displays" }, function (response) {
		if (response && response.multipleDisplays) {
			multipleDisplays = true;
			tryActivate();
		}
	});

	chrome.runtime.onMessage.addListener(function (message) {
		if (message.type === "displays-updated") {
			multipleDisplays = message.multipleDisplays;
			if (multipleDisplays) {
				window.postMessage({ type: "fullscreenr-activate" }, safeOrigin);
			} else {
				window.postMessage({ type: "fullscreenr-deactivate" }, safeOrigin);
			}
		}
	});
}());
```

Note: the `chrome.runtime.onMessage` handler for `displays-updated` is added here now (it will be wired up fully in Task 6 when `background.js` is updated, but adding it now is harmless and keeps this task self-contained).

- [ ] **Step 2: Update the message listener in `injected.js`**

Find the existing `window.addEventListener("message", ...)` block near the bottom of `injected.js` (currently around lines 191–195):

```js
	window.addEventListener("message", function (event) {
		if (event.data && event.data.type === "fullscreenr-activate") {
			enabled = true;
		}
	});
```

Replace it with:

```js
	window.addEventListener("message", function (event) {
		if (event.origin !== window.location.origin) {
			return;
		}
		if (event.data && event.data.type === "fullscreenr-activate") {
			enabled = true;
		}
		if (event.data && event.data.type === "fullscreenr-deactivate") {
			enabled = false;
			if (activeElement) {
				exitFakeFullscreen();
			}
		}
	});
```

- [ ] **Step 3: Update the `fullscreenr-ready` postMessage in `injected.js`**

Find the last line of `injected.js` (currently around line 197):

```js
	window.postMessage({ type: "fullscreenr-ready" }, "*");
```

Add the `safeOrigin` variable near the top of the IIFE (right after `window.__fullscreenrInitialized = true;`) and update the postMessage call:

After `window.__fullscreenrInitialized = true;` add:
```js
	var safeOrigin = window.location.origin === "null" ? "*" : window.location.origin;
```

Then change the postMessage call to:
```js
	window.postMessage({ type: "fullscreenr-ready" }, safeOrigin);
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Run full check**

```bash
npm run check
```

Expected: all checks pass.

- [ ] **Step 6: Commit**

```bash
git add content.js injected.js
git commit -m "fix: tighten postMessage origin checks"
```

---

## Task 5: Defer style injection to first activation

**Files:**
- Modify: `injected.js`

`injectStyles()` is called unconditionally at script load (currently around line 180), injecting a `<style>` tag into every page even if the extension never activates. It is already called inside `enterFakeFullscreen()`, which is the correct and sufficient location.

- [ ] **Step 1: Remove the unconditional `injectStyles()` call**

Find the block near the bottom of `injected.js` that reads:

```js
	injectStyles();
	overrideFullscreenGetters();
```

Remove only the `injectStyles();` line. Add a comment explaining why `overrideFullscreenGetters()` must stay early:

```js
	// Getters must be overridden before any site code runs, so this stays at load time.
	overrideFullscreenGetters();
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add injected.js
git commit -m "refactor: defer style injection to first activation"
```

---

## Task 6: Dynamic display detection via `onDisplayChanged`

**Files:**
- Modify: `background.js`
- Modify: `manifest.json`

When a display is plugged in or unplugged, the extension currently stays stuck in its initial state. Add a listener to `chrome.system.display.onDisplayChanged` that re-checks and broadcasts to all tabs.

- [ ] **Step 1: Update `manifest.json` to add the `"tabs"` permission**

Find the `"permissions"` array:

```json
"permissions": [
    "system.display"
],
```

Change it to:

```json
"permissions": [
    "system.display",
    "tabs"
],
```

- [ ] **Step 2: Update `background.js`**

Replace the entire file with:

```js
function broadcastDisplayStatus(multipleDisplays) {
	chrome.tabs.query({}, function (tabs) {
		tabs.forEach(function (tab) {
			chrome.tabs.sendMessage(tab.id, { type: "displays-updated", multipleDisplays: multipleDisplays }, function () {
				// Consume lastError to suppress uncaught errors for tabs with no content script
				// (e.g. chrome:// pages, extension pages, PDFs).
				void chrome.runtime.lastError;
			});
		});
	});
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (message.type === "check-displays") {
		chrome.system.display.getInfo(function (displays) {
			sendResponse({ multipleDisplays: displays && displays.length > 1 });
		});
		return true;
	}
});

chrome.system.display.onDisplayChanged.addListener(function () {
	chrome.system.display.getInfo(function (displays) {
		broadcastDisplayStatus(displays && displays.length > 1);
	});
});
```

- [ ] **Step 3: Run the full check**

```bash
npm run check
```

Expected: all checks pass, including the `"tabs"` permission now being in the allowed list.

- [ ] **Step 4: Commit**

```bash
git add manifest.json background.js
git commit -m "feat: dynamic display detection via onDisplayChanged"
```

---

## Task 7: `fullscreenEnabled` getter override and `requestFullscreen` options passthrough

**Files:**
- Modify: `injected.js`

Two independent improvements to `injected.js`:

1. Some sites check `document.fullscreenEnabled` before calling `requestFullscreen`. Override it to return `true` when the extension is active, preventing sites from skipping fullscreen in sandboxed contexts.
2. The `requestFullscreen` overrides currently drop the `options` argument. In passthrough mode (single display), this breaks API compatibility. Accept and forward `options` to the original.

- [ ] **Step 1: Capture the original `fullscreenEnabled` descriptor**

In the variable declarations block at the top of the IIFE (alongside the other `originalXxx` variables), add:

```js
	var originalFullscreenEnabledGetter = Object.getOwnPropertyDescriptor(Document.prototype, "fullscreenEnabled");
```

- [ ] **Step 2: Add the `fullscreenEnabled` override inside `overrideFullscreenGetters()`**

At the end of the `overrideFullscreenGetters` function body, before its closing `}`, add:

```js
		Object.defineProperty(Document.prototype, "fullscreenEnabled", {
			get: function () {
				if (enabled) return true;
				if (originalFullscreenEnabledGetter) return originalFullscreenEnabledGetter.get.call(this);
				return false;
			},
			configurable: true,
		});
```

- [ ] **Step 3: Add `options` parameter to `requestFullscreen` overrides**

Find the three `requestFullscreen` overrides and update each signature and passthrough call:

**Standard:**
```js
	Element.prototype.requestFullscreen = function (options) {
		if (enabled) {
			enterFakeFullscreen(this);
			return Promise.resolve();
		}
		return originalRequestFullscreen.call(this, options);
	};
```

**Webkit:**
```js
	if (originalWebkitRequestFullscreen) {
		Element.prototype.webkitRequestFullscreen = function (options) {
			if (enabled) {
				enterFakeFullscreen(this);
				return Promise.resolve();
			}
			return originalWebkitRequestFullscreen.call(this, options);
		};
	}
```

**Moz:**
```js
	if (originalMozRequestFullScreen) {
		Element.prototype.mozRequestFullScreen = function (options) {
			if (enabled) {
				enterFakeFullscreen(this);
				return Promise.resolve();
			}
			return originalMozRequestFullScreen.call(this, options);
		};
	}
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Run full check**

```bash
npm run check
```

Expected: all checks pass.

- [ ] **Step 6: Commit**

```bash
git add injected.js
git commit -m "feat: fullscreenEnabled getter override and requestFullscreen options passthrough"
```

---

## Task 8: Bump version to 1.1.0

**Files:**
- Modify: `manifest.json`

- [ ] **Step 1: Update the version field in `manifest.json`**

Change:
```json
"version": "1.0.0",
```

To:
```json
"version": "1.1.0",
```

- [ ] **Step 2: Run the full check one last time**

```bash
npm run check
```

Expected: all checks pass.

- [ ] **Step 3: Commit**

```bash
git add manifest.json
git commit -m "chore: bump version to 1.1.0"
```

---

## Task 9: Produce changelog

After all commits are done, output the following ready-to-paste changelog for the v1.1.0 release:

```
## v1.1.0

### Bug Fixes
- Fixed `webkitExitFullscreen` and `mozCancelFullScreen` not being intercepted — sites using these variants to exit fullscreen would bypass cleanup
- Hardened `postMessage` channel: both directions (content↔injected) now verify message origin, preventing page scripts from spoofing activation or the ready handshake
- Expanded security check (`npm run security:check`) to scan all extension JS files (`content.js`, `injected.js`, `background.js`), not just `content.js`

### Improvements
- **Hotplug support:** plugging in or unplugging a display mid-session now updates extension state immediately, without needing a page reload
- `document.fullscreenEnabled` is now overridden to return `true` when the extension is active, preventing sandboxed sites from skipping fullscreen
- `requestFullscreen(options)` argument is now forwarded to the original API in single-display passthrough mode, preserving full API compatibility

### Internals & DX
- Style tag is now injected only on first fake fullscreen activation, not on every page load
- Added `.gitignore` (ignores `node_modules/`, generated icon PNGs, `.DS_Store`)
- Added inline comment explaining why `overrideFullscreenGetters()` runs at script load time
```

No commit needed for this step — the changelog is for your release notes only.

---

## Verification Checklist (Manual)

After all tasks are complete, load the extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked) and verify:

- [ ] With **two displays**: clicking a video's fullscreen button fills the browser window; second display stays on
- [ ] With **two displays**: pressing Escape exits fake fullscreen cleanly
- [ ] With **one display**: normal browser fullscreen works unchanged
- [ ] **Hotplug (two → one display):** unplug second display → fullscreen reverts to normal browser fullscreen on next attempt (no reload needed)
- [ ] **Hotplug (one → two displays):** plug in second display → fake fullscreen activates on next attempt (no reload needed)
- [ ] No console errors on YouTube, Vimeo, or a plain HTML5 `<video>` page
