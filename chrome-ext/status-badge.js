(() => {
  "use strict";

  // 尝试多个可能的 cursor-proxy 端口
  const CANDIDATE_PORTS = [18790, 41219];
  const POLL_WORKING_MS = 2000;
  const POLL_IDLE_MS = 5000;
  const BADGE_ID = "oc-status-badge";

  let pollTimer = null;
  let lastRendered = null;
  let restarting = false;
  let activePort = null;
  let HEALTH_URL = null;
  let RESTART_URL = null;

  function fmt(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m${s}s` : `${m}m`;
  }

  async function detectPort() {
    for (const port of CANDIDATE_PORTS) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/v1/health`, { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          const data = await res.json();
          if (data.acp !== undefined || data.running !== undefined) {
            activePort = port;
            HEALTH_URL = `http://127.0.0.1:${port}/v1/health`;
            RESTART_URL = `http://127.0.0.1:${port}/v1/acp/restart`;
            return true;
          }
        }
      } catch {}
    }
    return false;
  }

  async function restartAcp() {
    if (restarting || !RESTART_URL) return;
    restarting = true;
    render({ phase: "restarting", text: "正在重启 ACP…", icon: "⟳", color: "yellow" });
    try {
      const res = await fetch(RESTART_URL, { method: "POST", signal: AbortSignal.timeout(30000) });
      const data = await res.json();
      if (data.ok) {
        render({ phase: "idle", text: "重启成功", icon: "✓", color: "green" });
      } else {
        render({ phase: "offline", text: `重启失败: ${data.error?.message || "unknown"}`, icon: "✗", color: "red" });
      }
    } catch (e) {
      render({ phase: "offline", text: "重启失败: 连接超时", icon: "✗", color: "red" });
    }
    restarting = false;
    lastRendered = null;
    setTimeout(poll, 2000);
  }

  function deriveState(data) {
    if (!data || data.status === "degraded" || !data.acp?.running) {
      return null; // cursor-proxy 不可用，不显示徽章
    }

    const acp = data.acp;
    const sess = acp.session || {};
    const prompt = acp.activePrompt;

    if (prompt) {
      const elapsed = prompt.elapsed || 0;
      const idle = prompt.lastActivity || 0;
      const idleTimeouts = sess.consecutiveIdleTimeouts || 0;

      if (idleTimeouts > 0) {
        return {
          phase: "stalled",
          text: `可能卡住 · idle timeout ×${idleTimeouts} · ${fmt(elapsed)}`,
          icon: "⚠",
          color: "yellow",
        };
      }

      const parts = [`请求 #${sess.requests || 1}`, fmt(elapsed)];
      if (idle > 10) parts.push(`静默 ${fmt(idle)}`);

      return {
        phase: "working",
        text: `执行中 · ${parts.join(" · ")}`,
        icon: "⟳",
        color: "blue",
      };
    }

    if (acp.pendingRequests > 0) {
      return { phase: "working", text: "处理中…", icon: "⟳", color: "blue" };
    }

    return {
      phase: "idle",
      text: acp.totalRequests > 0
        ? `就绪 · 已处理 ${acp.totalRequests} 请求 · session ${sess.utilizationPct || 0}%`
        : "就绪",
      icon: "●",
      color: "green",
    };
  }

  function ensureBadge() {
    let el = document.getElementById(BADGE_ID);
    if (el) return el;

    el = document.createElement("div");
    el.id = BADGE_ID;

    const compose = document.querySelector(".chat-compose");
    if (compose) {
      compose.parentElement.insertBefore(el, compose);
    } else {
      const chatMain = document.querySelector(".chat-main");
      (chatMain || document.body).appendChild(el);
    }
    return el;
  }

  function hideBadge() {
    const el = document.getElementById(BADGE_ID);
    if (el) el.classList.add("oc-badge--hidden");
  }

  function render(state) {
    const key = `${state.phase}:${state.text}`;
    if (lastRendered === key) return;
    lastRendered = key;

    const badge = ensureBadge();
    const spin = (state.phase === "working" || state.phase === "restarting") ? " oc-spin" : "";
    badge.className = `oc-badge oc-badge--${state.color}`;
    badge.innerHTML =
      `<span class="oc-badge__icon${spin}">${state.icon}</span>` +
      `<span class="oc-badge__label">${state.text}</span>` +
      `<button class="oc-badge__restart" title="重启 ACP">↻</button>`;

    const btn = badge.querySelector(".oc-badge__restart");
    if (btn) btn.addEventListener("click", restartAcp);
  }

  let currentInterval = POLL_IDLE_MS;

  async function poll() {
    if (restarting) return;
    if (!HEALTH_URL) return;

    let state;
    try {
      const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) { hideBadge(); return; }
      state = deriveState(await res.json());
    } catch {
      hideBadge();
      return;
    }

    if (!state) {
      hideBadge();
      return;
    }

    render(state);

    const wantInterval = state.phase === "working" || state.phase === "stalled"
      ? POLL_WORKING_MS
      : POLL_IDLE_MS;

    if (wantInterval !== currentInterval) {
      currentInterval = wantInterval;
      clearInterval(pollTimer);
      pollTimer = setInterval(poll, currentInterval);
    }
  }

  async function activate() {
    if (!document.querySelector("openclaw-app")) return;
    const found = await detectPort();
    if (!found) {
      console.log("[OC Status] cursor-proxy not detected, badge disabled");
      return;
    }
    console.log(`[OC Status] cursor-proxy detected on port ${activePort}`);
    poll();
    pollTimer = setInterval(poll, currentInterval);
  }

  function waitForApp() {
    const t0 = Date.now();
    const timer = setInterval(() => {
      if (document.querySelector("openclaw-app") || Date.now() - t0 > 30000) {
        clearInterval(timer);
        if (document.querySelector("openclaw-app")) activate();
      }
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForApp);
  } else {
    waitForApp();
  }
})();
