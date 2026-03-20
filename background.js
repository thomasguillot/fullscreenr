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
