const NATIVE_HOST = "com.openclaw.filedrop";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "resolve-paths") return;

  const filenames = msg.filenames || [];

  const port = chrome.runtime.connectNative(NATIVE_HOST);
  let responded = false;

  port.onMessage.addListener((response) => {
    if (!responded) {
      responded = true;
      sendResponse(response);
    }
    port.disconnect();
  });

  port.onDisconnect.addListener(() => {
    if (!responded) {
      responded = true;
      const err = chrome.runtime.lastError?.message || "disconnected";
      sendResponse({ error: err, paths: filenames });
    }
  });

  port.postMessage({ filenames });

  return true;
});
