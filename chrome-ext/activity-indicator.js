(() => {
  "use strict";

  const INDICATOR_ID = "oc-activity-indicator";
  const CHECK_INTERVAL = 2000;
  let lastMsgCount = 0;
  let lastMsgText = "";
  let stableCount = 0;

  function getLog() {
    const app = document.querySelector("openclaw-app");
    return app?.querySelector('[role="log"]');
  }

  function getLastAssistantGroup() {
    const log = getLog();
    if (!log) return null;
    const groups = log.querySelectorAll(".chat-group.assistant");
    return groups.length > 0 ? groups[groups.length - 1] : null;
  }

  function isStreaming() {
    const app = document.querySelector("openclaw-app");
    if (!app) return false;
    // Dashboard 在流式输出时，send 按钮会被禁用或变为 stop
    const sendBtn = app.querySelector('.chat-compose button');
    if (sendBtn && (sendBtn.textContent.includes('Stop') || sendBtn.textContent.includes('停止'))) {
      return true;
    }
    // 检查是否有 typing/streaming 类
    const streaming = app.querySelector('.streaming, .chat-typing, [data-streaming="true"]');
    if (streaming) return true;
    return false;
  }

  function isDisconnected() {
    const app = document.querySelector("openclaw-app");
    if (!app) return false;
    const disconnectMsg = app.querySelector('.chat-status, .chat-disconnect');
    if (disconnectMsg && disconnectMsg.textContent.includes('断开')) return true;
    // 检查 textarea 是否 disabled
    const ta = app.querySelector('.chat-compose textarea');
    return ta && ta.disabled;
  }

  function ensureIndicator() {
    let el = document.getElementById(INDICATOR_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = INDICATOR_ID;
    el.style.cssText = `
      position: fixed; bottom: 70px; left: 50%; transform: translateX(-50%);
      z-index: 9998; padding: 8px 16px; border-radius: 20px;
      font-size: 13px; font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: rgba(59, 130, 246, 0.15); color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      display: flex; align-items: center; gap: 8px;
      cursor: pointer; transition: opacity 0.3s ease;
    `;
    el.addEventListener("click", () => {
      // 点击刷新聊天数据
      const app = document.querySelector("openclaw-app");
      const refreshBtn = app?.querySelector('button[title*="刷新"]');
      if (refreshBtn) refreshBtn.click();
      hideIndicator();
    });
    document.body.appendChild(el);
    return el;
  }

  function showIndicator(text) {
    const el = ensureIndicator();
    el.innerHTML = `<span style="animation: oc-spin 1.2s linear infinite; display:inline-block;">⟳</span> ${text}`;
    el.style.opacity = "1";
    el.style.pointerEvents = "auto";
  }

  function hideIndicator() {
    const el = document.getElementById(INDICATOR_ID);
    if (el) {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    }
  }

  function check() {
    if (isStreaming()) {
      showIndicator("Agent 正在回复中…");
      stableCount = 0;
      return;
    }

    if (isDisconnected()) {
      // 断线后，检查 DOM 是否在更新（可能 reconnect 后恢复）
      const log = getLog();
      const currentCount = log?.children?.length || 0;
      const lastGroup = getLastAssistantGroup();
      const currentText = lastGroup?.textContent?.substring(0, 200) || "";

      if (currentCount !== lastMsgCount || currentText !== lastMsgText) {
        // DOM 在变化，说明有新内容
        showIndicator("正在接收回复…");
        stableCount = 0;
      } else {
        stableCount++;
        if (stableCount > 3) {
          hideIndicator();
        }
      }
      lastMsgCount = currentCount;
      lastMsgText = currentText;
      return;
    }

    // 正常连接且不在 streaming
    hideIndicator();
    stableCount = 0;
  }

  function start() {
    if (!document.querySelector("openclaw-app")) return;
    setInterval(check, CHECK_INTERVAL);
    console.log("[OC Activity] Activity indicator active");
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
