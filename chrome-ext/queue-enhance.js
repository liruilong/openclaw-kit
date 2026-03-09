(() => {
  "use strict";

  const OBSERVE_INTERVAL = 500;
  const BTN_CLASS = "oc-queue-jump";

  function getApp() {
    return document.querySelector("openclaw-app");
  }

  function moveToFront(itemEl) {
    const app = getApp();
    if (!app || !app.chatQueue?.length) return;

    const allItems = [...document.querySelectorAll(".chat-queue__item")];
    const idx = allItems.indexOf(itemEl);
    if (idx <= 0) return;

    const item = app.chatQueue[idx];
    if (!item) return;

    const newQueue = [item, ...app.chatQueue.filter((_, i) => i !== idx)];
    app.chatQueue = newQueue;
    app.requestUpdate();
  }

  function injectButtons() {
    const items = document.querySelectorAll(".chat-queue__item");
    if (items.length < 2) {
      document.querySelectorAll(`.${BTN_CLASS}`).forEach((b) => b.remove());
      return;
    }

    items.forEach((item, i) => {
      if (i === 0) {
        item.querySelector(`.${BTN_CLASS}`)?.remove();
        return;
      }

      if (item.querySelector(`.${BTN_CLASS}`)) return;

      const removeBtn = item.querySelector(".chat-queue__remove");
      if (!removeBtn) return;

      const jumpBtn = document.createElement("button");
      jumpBtn.className = `btn ${BTN_CLASS}`;
      jumpBtn.title = "插队到最前";
      jumpBtn.textContent = "⤒";
      jumpBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        moveToFront(item);
      });

      removeBtn.before(jumpBtn);
    });
  }

  function start() {
    const observer = new MutationObserver(() => injectButtons());
    const chatMain = document.querySelector(".chat-main");
    if (chatMain) {
      observer.observe(chatMain, { childList: true, subtree: true });
    }
    injectButtons();
    setInterval(injectButtons, OBSERVE_INTERVAL);
    console.log("[OC Queue] Queue enhance active");
  }

  function waitForApp() {
    const t0 = Date.now();
    const timer = setInterval(() => {
      if (document.querySelector("openclaw-app") || Date.now() - t0 > 30000) {
        clearInterval(timer);
        if (document.querySelector("openclaw-app")) start();
      }
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForApp);
  } else {
    waitForApp();
  }
})();
