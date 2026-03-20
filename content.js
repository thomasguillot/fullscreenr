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
