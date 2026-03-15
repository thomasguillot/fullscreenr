(function () {
	if (window.__fullscreenrInitialized) {
		return;
	}

	window.__fullscreenrInitialized = true;

	var ACTIVE_CLASS = "fullscreenr-active";
	var STYLE_ELEMENT_ID = "fullscreenr-styles";
	var enabled = false;

	var activeElement = null;
	var originalInlineStyle = null;

	var originalRequestFullscreen = Element.prototype.requestFullscreen;
	var originalWebkitRequestFullscreen = Element.prototype.webkitRequestFullscreen;
	var originalMozRequestFullScreen = Element.prototype.mozRequestFullScreen;
	var originalExitFullscreen = Document.prototype.exitFullscreen;
	var originalFullscreenElementGetter = Object.getOwnPropertyDescriptor(Document.prototype, "fullscreenElement");
	var originalWebkitFullscreenElementGetter = Object.getOwnPropertyDescriptor(Document.prototype, "webkitFullscreenElement");
	var originalFullscreenGetter = Object.getOwnPropertyDescriptor(Document.prototype, "fullscreen");
	var originalWebkitIsFullScreenGetter = Object.getOwnPropertyDescriptor(Document.prototype, "webkitIsFullScreen");

	function injectStyles() {
		if (document.getElementById(STYLE_ELEMENT_ID)) {
			return;
		}

		var style = document.createElement("style");
		style.id = STYLE_ELEMENT_ID;
		style.textContent =
			"." + ACTIVE_CLASS + " {" +
			"  position: fixed !important;" +
			"  top: 0 !important;" +
			"  left: 0 !important;" +
			"  width: 100vw !important;" +
			"  height: 100vh !important;" +
			"  z-index: 999999 !important;" +
			"  background: #000 !important;" +
			"  margin: 0 !important;" +
			"}";

		(document.head || document.documentElement).appendChild(style);
	}

	function fireFullscreenEvents() {
		document.dispatchEvent(new Event("fullscreenchange"));
		document.dispatchEvent(new Event("webkitfullscreenchange"));
	}

	function exitFakeFullscreen() {
		if (!activeElement) {
			return;
		}

		activeElement.classList.remove(ACTIVE_CLASS);

		if (originalInlineStyle === null) {
			activeElement.removeAttribute("style");
		} else {
			activeElement.setAttribute("style", originalInlineStyle);
		}

		document.documentElement.style.overflow = "";
		document.body.style.overflow = "";

		activeElement = null;
		originalInlineStyle = null;

		fireFullscreenEvents();
	}

	function enterFakeFullscreen(element) {
		injectStyles();

		if (activeElement === element) {
			return;
		}

		if (activeElement) {
			exitFakeFullscreen();
		}

		activeElement = element;
		originalInlineStyle = element.getAttribute("style");

		element.classList.add(ACTIVE_CLASS);

		document.documentElement.style.overflow = "hidden";
		document.body.style.overflow = "hidden";

		fireFullscreenEvents();
	}

	function overrideFullscreenGetters() {
		Object.defineProperty(Document.prototype, "fullscreenElement", {
			get: function () {
				if (enabled) return activeElement;
				return originalFullscreenElementGetter ? originalFullscreenElementGetter.get.call(this) : null;
			},
			configurable: true,
		});

		if (originalWebkitFullscreenElementGetter) {
			Object.defineProperty(Document.prototype, "webkitFullscreenElement", {
				get: function () {
					if (enabled) return activeElement;
					return originalWebkitFullscreenElementGetter.get.call(this);
				},
				configurable: true,
			});
		}

		if (originalFullscreenGetter) {
			Object.defineProperty(Document.prototype, "fullscreen", {
				get: function () {
					if (enabled) return activeElement !== null;
					return originalFullscreenGetter.get.call(this);
				},
				configurable: true,
			});
		}

		if (originalWebkitIsFullScreenGetter) {
			Object.defineProperty(Document.prototype, "webkitIsFullScreen", {
				get: function () {
					if (enabled) return activeElement !== null;
					return originalWebkitIsFullScreenGetter.get.call(this);
				},
				configurable: true,
			});
		}
	}

	Element.prototype.requestFullscreen = function () {
		if (enabled) {
			enterFakeFullscreen(this);
			return Promise.resolve();
		}
		return originalRequestFullscreen.call(this);
	};

	if (originalWebkitRequestFullscreen) {
		Element.prototype.webkitRequestFullscreen = function () {
			if (enabled) {
				enterFakeFullscreen(this);
				return Promise.resolve();
			}
			return originalWebkitRequestFullscreen.call(this);
		};
	}

	if (originalMozRequestFullScreen) {
		Element.prototype.mozRequestFullScreen = function () {
			if (enabled) {
				enterFakeFullscreen(this);
				return Promise.resolve();
			}
			return originalMozRequestFullScreen.call(this);
		};
	}

	Document.prototype.exitFullscreen = function () {
		if (enabled) {
			exitFakeFullscreen();
			return Promise.resolve();
		}
		return originalExitFullscreen.call(this);
	};

	function handleKeydown(event) {
		if (event.key === "Escape" || event.key === "Esc") {
			if (enabled && activeElement) {
				exitFakeFullscreen();
				event.stopPropagation();
			}
		}
	}

	injectStyles();
	overrideFullscreenGetters();

	document.addEventListener("keydown", handleKeydown, true);

	window.addEventListener("beforeunload", function () {
		if (activeElement) {
			exitFakeFullscreen();
		}
	});

	window.addEventListener("message", function (event) {
		if (event.data && event.data.type === "fullscreenr-activate") {
			enabled = true;
		}
	});

	window.postMessage({ type: "fullscreenr-ready" }, "*");
}());
