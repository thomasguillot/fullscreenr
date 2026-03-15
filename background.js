chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (message.type === "check-displays") {
		chrome.system.display.getInfo(function (displays) {
			sendResponse({ multipleDisplays: displays && displays.length > 1 });
		});
		return true;
	}
});