(function () {
	var script = document.createElement("script");
	script.src = chrome.runtime.getURL("injected.js");
	script.type = "text/javascript";
	(document.documentElement || document.head).appendChild(script);
  
	var ready = false;
	var multipleDisplays = false;
  
	function tryActivate() {
		if (ready && multipleDisplays) {
			window.postMessage({ type: "fullscreenr-activate" }, "*");
		}
	}

	window.addEventListener("message", function (event) {
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
}());