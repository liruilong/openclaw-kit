#!/usr/bin/env node

// Cursor Agent ACP → OpenAI-compatible streaming API proxy
//
// Uses `agent acp` as a PERSISTENT subprocess (no cold start per request).
// All communication happens via JSON-RPC 2.0 over stdin/stdout.
//
// Endpoints:
//   POST /v1/chat/completions   (stream: true/false)
//   GET  /v1/models
//   GET  /v1/health

import http from "node:http";
import { spawn, execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// ── Configuration ───────────────────────────────────────────────────────────

const PORT = parseInt(process.env.CURSOR_PROXY_PORT || "18790", 10);
const WORKSPACE_DIR = process.env.CURSOR_WORKSPACE_DIR || join(homedir(), ".openclaw");
const API_KEY = process.env.CURSOR_PROXY_API_KEY || "";
const CURSOR_MODEL = process.env.CURSOR_MODEL || "";

const FORWARD_THINKING = process.env.CURSOR_PROXY_FORWARD_THINKING === "true";
const REQUEST_TIMEOUT_MS = parseInt(process.env.CURSOR_PROXY_REQUEST_TIMEOUT || "300000", 10);

const ACP_RESTART_DELAY_MS = 2000;
const ACP_INIT_TIMEOUT_MS = 15000;

// 会话自动轮换阈值（同一 session 内的请求数）
const SESSION_MAX_REQUESTS = parseInt(process.env.CURSOR_SESSION_MAX_REQUESTS || "50", 10);
// 估算 token 上限（128k context window，预留 20% 缓冲）
const SESSION_MAX_ESTIMATED_TOKENS = parseInt(process.env.CURSOR_SESSION_MAX_TOKENS || "100000", 10);
// 每字符约 0.3 token（中英文混合粗估）
const CHARS_PER_TOKEN = 3.3;

// ── Script identity ─────────────────────────────────────────────────────────

function computeScriptHash() {
  try {
    const scriptPath = new URL(import.meta.url).pathname;
    const content = readFileSync(scriptPath, "utf-8");
    return createHash("sha256").update(content).digest("hex").slice(0, 12);
  } catch { return "unknown"; }
}
const SCRIPT_HASH = computeScriptHash();

// ── Cursor path auto-detection ──────────────────────────────────────────────

function detectCursorPath() {
  if (process.env.CURSOR_PATH) return process.env.CURSOR_PATH;
  const home = homedir();
  const candidates = [
    join(home, ".local", "bin", "agent"),
    "/usr/local/bin/agent",
    join(home, ".cursor", "bin", "agent"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  try {
    const result = execSync("which agent 2>/dev/null", { encoding: "utf-8", timeout: 3000 }).trim();
    if (result && existsSync(result.split("\n")[0])) return result.split("\n")[0];
  } catch {}
  return "";
}

const CURSOR_PATH = detectCursorPath();

function discoverModels() {
  if (!CURSOR_PATH) return [{ id: "auto", object: "model", created: 0, owned_by: "cursor" }];
  try {
    const out = execSync(`"${CURSOR_PATH}" --list-models`, { encoding: "utf-8", timeout: 15000, stdio: ["pipe", "pipe", "pipe"] });
    const models = [];
    for (const line of out.split("\n")) {
      const m = line.match(/^(\S+)\s+-\s+(.+?)(?:\s+\((current|default)\))?$/);
      if (m) models.push({ id: m[1], object: "model", created: 0, owned_by: "cursor" });
    }
    return models.length ? models : [{ id: "auto", object: "model", created: 0, owned_by: "cursor" }];
  } catch {
    return [{ id: "auto", object: "model", created: 0, owned_by: "cursor" }];
  }
}

const cachedModels = discoverModels();

// ── Logging ─────────────────────────────────────────────────────────────────

const OPENCLAW_DIR = join(homedir(), ".openclaw");
const LOG_FILE = join(OPENCLAW_DIR, "cursor-proxy.log");

function localTimestamp() {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function log(level, msg) {
  const line = `${localTimestamp()} [${level}] ${msg}\n`;
  process.stderr.write(`[cursor-proxy] ${line}`);
  try { appendFileSync(LOG_FILE, line); } catch {}
}

// ── SSE helpers ─────────────────────────────────────────────────────────────

function sseEvent(id, model, { content, reasoningContent, finishReason } = {}) {
  const delta = {};
  if (content !== undefined) delta.content = content;
  if (reasoningContent !== undefined) delta.reasoning_content = reasoningContent;
  const choice = { index: 0, delta };
  if (finishReason) choice.finish_reason = finishReason;
  return (
    "data: " +
    JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [choice],
    }) +
    "\n\n"
  );
}

function extractUserMessage(messages) {
  if (!Array.isArray(messages) || !messages.length) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) {
      return m.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
    }
  }
  return "";
}

// ── ACP Client ──────────────────────────────────────────────────────────────
// Persistent `agent acp` subprocess with JSON-RPC 2.0 communication

class ACPClient {
  constructor(agentPath, cwd) {
    this.agentPath = agentPath;
    this.cwd = cwd;
    this.child = null;
    this.rl = null;
    this.nextId = 1;
    this.pending = new Map();
    this.notificationHandlers = new Map(); // method -> Set<callback>
    this.initialized = false;
    this.sessionId = null;
    this.restarting = false;
    this.totalRequests = 0;
    this.startTime = null;
    this.sessionRequests = 0;
    this.sessionEstimatedTokens = 0;
    this.sessionRotations = 0;
    this._promptLock = null;
    this._promptLockTime = null;
  }

  async start() {
    if (this.child) return;
    log("info", "Starting ACP subprocess...");

    const args = ["acp"];
    const env = { ...process.env };
    if (process.platform !== "win32") env.SHELL = process.env.SHELL || "/bin/bash";

    this.child = spawn(this.agentPath, args, {
      cwd: this.cwd || undefined,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.child.stderr.on("data", (d) => {
      const text = d.toString().trim();
      if (text) log("debug", `acp stderr: ${text.slice(0, 500)}`);
    });

    this.child.on("exit", (code, signal) => {
      log("warn", `ACP process exited: code=${code}, signal=${signal}`);
      this.child = null;
      this.rl = null;
      this.initialized = false;
      this.sessionId = null;
      this._rejectAllPending("ACP process exited");
      if (!this.restarting) this._scheduleRestart();
    });

    this.child.on("error", (err) => {
      log("error", `ACP process error: ${err.message}`);
    });

    this.rl = createInterface({ input: this.child.stdout, terminal: false });
    this.rl.on("line", (line) => this._onLine(line));

    this.startTime = Date.now();

    await this._initialize();
    await this._authenticate();
    log("info", "ACP subprocess ready (initialized + authenticated)");
  }

  _onLine(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    let msg;
    try { msg = JSON.parse(trimmed); } catch { return; }

    // Response to our request
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const waiter = this.pending.get(msg.id);
      if (waiter) {
        this.pending.delete(msg.id);
        if (msg.error) {
          waiter.reject(msg.error);
        } else {
          waiter.resolve(msg.result);
        }
      }
      return;
    }

    // Notification (no id) or server request (has id, needs response)
    if (msg.method) {
      const handlers = this.notificationHandlers.get(msg.method);
      if (handlers) {
        for (const h of handlers) h(msg);
      }

      // Auto-approve permissions
      if (msg.method === "session/request_permission" && msg.id !== undefined) {
        this._respond(msg.id, { outcome: { outcome: "selected", optionId: "allow-always" } });
      }
    }
  }

  _send(method, params) {
    const id = this.nextId++;
    const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
    return new Promise((resolve, reject) => {
      if (!this.child || this.child.killed) {
        reject(new Error("ACP process not running"));
        return;
      }
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(msg);
    });
  }

  _respond(id, result) {
    if (!this.child || this.child.killed) return;
    const msg = JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n";
    this.child.stdin.write(msg);
  }

  _rejectAllPending(reason) {
    for (const [id, waiter] of this.pending) {
      waiter.reject(new Error(reason));
    }
    this.pending.clear();
  }

  async _initialize() {
    const result = await Promise.race([
      this._send("initialize", {
        protocolVersion: 1,
        clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
        clientInfo: { name: "openclaw-cursor-proxy", version: "2.0.0" },
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("ACP init timeout")), ACP_INIT_TIMEOUT_MS)),
    ]);
    this.initialized = true;
    log("info", `ACP initialized: ${JSON.stringify(result).slice(0, 200)}`);
    return result;
  }

  async _authenticate() {
    return this._send("authenticate", { methodId: "cursor_login" });
  }

  async ensureSession() {
    if (this.sessionId) return this.sessionId;
    return this._createNewSession();
  }

  async _createNewSession() {
    const result = await this._send("session/new", {
      cwd: this.cwd || process.cwd(),
      mcpServers: [],
    });
    this.sessionId = result.sessionId;
    this.sessionRequests = 0;
    this.sessionEstimatedTokens = 0;
    log("info", `ACP session created: ${this.sessionId}`);
    return this.sessionId;
  }

  async rotateSession(reason = "manual") {
    const oldId = this.sessionId;
    this.sessionId = null;
    this.sessionRotations++;
    log("info", `Session rotation (${reason}): old=${oldId}, requests=${this.sessionRequests}, est_tokens=${this.sessionEstimatedTokens}`);
    return this._createNewSession();
  }

  _shouldRotate() {
    if (this.sessionRequests >= SESSION_MAX_REQUESTS) return "max_requests";
    if (this.sessionEstimatedTokens >= SESSION_MAX_ESTIMATED_TOKENS) return "max_tokens";
    return null;
  }

  _trackTokens(text) {
    this.sessionEstimatedTokens += Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  async _acquirePromptLock(requestId) {
    const LOCK_WAIT_TIMEOUT_MS = 30000;
    const startWait = Date.now();

    while (this._promptLock) {
      const waited = Date.now() - startWait;
      if (waited > LOCK_WAIT_TIMEOUT_MS) {
        log("warn", `[${requestId}] prompt lock wait timeout (${LOCK_WAIT_TIMEOUT_MS}ms), held by ${this._promptLock}. Force-releasing.`);
        this._promptLock = null;
        break;
      }
      log("info", `[${requestId}] waiting for prompt lock (held by ${this._promptLock}, ${waited}ms elapsed)`);
      await new Promise((r) => setTimeout(r, 500));
    }
    this._promptLock = requestId;
    this._promptLockTime = Date.now();
  }

  _releasePromptLock(requestId) {
    if (this._promptLock === requestId) {
      this._promptLock = null;
      this._promptLockTime = null;
    }
  }

  async *prompt(text, { model, requestId } = {}) {
    await this._acquirePromptLock(requestId);

    try {
      // 复用 ACP session 直到达到阈值（默认 50 条请求或 10 万 token）
      // proxy 只发最后一条 user message，不存在历史叠加问题
      const rotateReason = this._shouldRotate();
      if (rotateReason) {
        await this.rotateSession(rotateReason);
      }
      const sessionId = await this.ensureSession();
      this.totalRequests++;
      this.sessionRequests++;
      this._trackTokens(text);

      const promptContent = [{ type: "text", text }];
      const promptParams = { sessionId, prompt: promptContent };
      if (model && model !== "auto") promptParams.model = model;

      const updateQueue = [];
      let updateResolve = null;
      let promptDone = false;
      let promptResult = null;
      let promptError = null;

      const onUpdate = (msg) => {
        const update = msg.params?.update;
        if (!update) return;
        updateQueue.push(update);
        if (updateResolve) {
          updateResolve();
          updateResolve = null;
        }
      };

      if (!this.notificationHandlers.has("session/update")) {
        this.notificationHandlers.set("session/update", new Set());
      }
      this.notificationHandlers.get("session/update").add(onUpdate);

      const PROMPT_IDLE_TIMEOUT_MS = parseInt(process.env.CURSOR_PROMPT_IDLE_TIMEOUT || "180000", 10);
      let lastActivity = Date.now();
      log("info", `[${requestId}] prompt sent: session=${sessionId}, textLen=${text.length}, est_tokens=${Math.ceil(text.length / CHARS_PER_TOKEN)}`);

      this._send("session/prompt", promptParams).then(
        (result) => {
          promptDone = true;
          promptResult = result;
          lastActivity = Date.now();
          if (updateResolve) { updateResolve(); updateResolve = null; }
        },
        (err) => {
          promptDone = true;
          promptError = err;
          lastActivity = Date.now();
          if (updateResolve) { updateResolve(); updateResolve = null; }
        }
      );

      const origOnUpdate = onUpdate;
      const trackingOnUpdate = (msg) => {
        lastActivity = Date.now();
        origOnUpdate(msg);
      };
      this.notificationHandlers.get("session/update").delete(onUpdate);
      this.notificationHandlers.get("session/update").add(trackingOnUpdate);

      try {
        while (true) {
          while (updateQueue.length > 0) {
            const update = updateQueue.shift();
            if (update.sessionUpdate === "agent_message_chunk" && update.content?.text) {
              this._trackTokens(update.content.text);
            }
            yield update;
          }
          if (promptDone) break;
          const idleMs = Date.now() - lastActivity;
          if (idleMs > PROMPT_IDLE_TIMEOUT_MS) {
            log("warn", `[${requestId}] ACP idle timeout (${PROMPT_IDLE_TIMEOUT_MS}ms with no activity), aborting prompt`);
            yield { _error: { message: `ACP idle timeout after ${Math.round(idleMs / 1000)}s` } };
            break;
          }
          await new Promise((r) => {
            updateResolve = r;
            setTimeout(r, 5000);
          });
        }
        while (updateQueue.length > 0) {
          const update = updateQueue.shift();
          if (update.sessionUpdate === "agent_message_chunk" && update.content?.text) {
            this._trackTokens(update.content.text);
          }
          yield update;
        }
        if (promptError) {
          const errMsg = promptError.message || JSON.stringify(promptError);
          if (/context.*(full|overflow|limit|too long)/i.test(errMsg) || /max.*token/i.test(errMsg)) {
            log("warn", `[${requestId}] Context overflow detected, scheduling session rotation`);
            this.sessionEstimatedTokens = SESSION_MAX_ESTIMATED_TOKENS;
          }
          yield { _error: promptError };
        }
        if (promptResult) {
          if (promptResult.stopReason === "max_tokens" || promptResult.stopReason === "length") {
            log("warn", `[${requestId}] stopReason=${promptResult.stopReason}, scheduling session rotation`);
            this.sessionEstimatedTokens = SESSION_MAX_ESTIMATED_TOKENS;
          }
          yield { _done: true, stopReason: promptResult.stopReason };
        }
      } finally {
        this.notificationHandlers.get("session/update")?.delete(trackingOnUpdate);
      }
    } finally {
      this._releasePromptLock(requestId);
    }
  }

  _scheduleRestart() {
    if (this.restarting) return;
    this.restarting = true;
    log("info", `Scheduling ACP restart in ${ACP_RESTART_DELAY_MS}ms...`);
    setTimeout(async () => {
      this.restarting = false;
      try {
        await this.start();
      } catch (e) {
        log("error", `ACP restart failed: ${e.message}`);
        this._scheduleRestart();
      }
    }, ACP_RESTART_DELAY_MS);
  }

  isReady() {
    return !!this.child && this.initialized && !this.child.killed;
  }

  status() {
    return {
      running: this.isReady(),
      pid: this.child?.pid || null,
      sessionId: this.sessionId,
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      totalRequests: this.totalRequests,
      pendingRequests: this.pending.size,
      session: {
        requests: this.sessionRequests,
        estimatedTokens: this.sessionEstimatedTokens,
        maxRequests: SESSION_MAX_REQUESTS,
        maxTokens: SESSION_MAX_ESTIMATED_TOKENS,
        utilizationPct: Math.round((this.sessionEstimatedTokens / SESSION_MAX_ESTIMATED_TOKENS) * 100),
      },
      sessionRotations: this.sessionRotations,
    };
  }

  async stop() {
    if (!this.child) return;
    log("info", "Stopping ACP subprocess...");
    this.child.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 1000));
    if (this.child && !this.child.killed) {
      this.child.kill("SIGKILL");
    }
  }
}

const acpClient = new ACPClient(CURSOR_PATH, WORKSPACE_DIR);

// ── Streaming handler ───────────────────────────────────────────────────────

async function handleStream(req, res, body) {
  const userMsg = extractUserMessage(body.messages);
  const model = body.model || "auto";
  const requestId = `chatcmpl-${randomUUID().slice(0, 8)}`;
  const msgPreview = userMsg.slice(0, 80).replace(/\n/g, " ");
  const startTime = Date.now();

  log("info", `[${requestId}] stream request: model=${model}, msg="${msgPreview}${userMsg.length > 80 ? "…" : ""}"`);

  if (!acpClient.isReady()) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "ACP agent not ready, please retry" } }));
    return;
  }

  let clientGone = false;
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    log("warn", `[${requestId}] request timeout after ${REQUEST_TIMEOUT_MS}ms`);
  }, REQUEST_TIMEOUT_MS);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  req.on("close", () => {
    clientGone = true;
    clearTimeout(timeout);
    log("info", `[${requestId}] client disconnected after ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  });

  let hasContent = false;

  try {
    for await (const update of acpClient.prompt(userMsg, { model, requestId })) {
      if (clientGone || timedOut) break;

      if (update._error) {
        log("error", `[${requestId}] prompt error: ${JSON.stringify(update._error)}`);
        if (!hasContent) {
          res.write(sseEvent(requestId, model, { content: `(error: ${update._error.message || JSON.stringify(update._error)})` }));
        }
        break;
      }

      if (update._done) {
        log("info", `[${requestId}] prompt done: stopReason=${update.stopReason}`);
        break;
      }

      const sessionUpdate = update.sessionUpdate;

      if (sessionUpdate === "agent_message_chunk") {
        const text = update.content?.text;
        if (text) {
          hasContent = true;
          res.write(sseEvent(requestId, model, { content: text }));
        }
      } else if (sessionUpdate === "agent_thinking_chunk") {
        if (FORWARD_THINKING && update.content?.text) {
          hasContent = true;
          res.write(sseEvent(requestId, model, { reasoningContent: update.content.text }));
        }
      } else if (sessionUpdate === "tool_call_start") {
        const toolName = update.toolCall?.name || "unknown";
        log("info", `[${requestId}] tool:start ${toolName}`);
      } else if (sessionUpdate === "tool_call_end") {
        const toolName = update.toolCall?.name || "unknown";
        log("info", `[${requestId}] tool:done ${toolName}`);
      }
    }
  } catch (e) {
    log("error", `[${requestId}] stream error: ${e.message}`);
    if (!hasContent) {
      res.write(sseEvent(requestId, model, { content: `(proxy error: ${e.message})` }));
    }
  }

  clearTimeout(timeout);

  if (!clientGone) {
    if (!hasContent) {
      res.write(sseEvent(requestId, model, { content: "(no response from cursor-agent)" }));
    }
    res.write(sseEvent(requestId, model, { finishReason: "stop" }));
    res.write("data: [DONE]\n\n");
    res.end();
  }

  log("info", `[${requestId}] completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s, hasContent=${hasContent}`);
}

// ── Non-streaming handler ───────────────────────────────────────────────────

async function handleNonStream(req, res, body) {
  const userMsg = extractUserMessage(body.messages);
  const model = body.model || "auto";
  const requestId = `chatcmpl-${randomUUID().slice(0, 8)}`;
  const msgPreview = userMsg.slice(0, 80).replace(/\n/g, " ");
  const startTime = Date.now();

  log("info", `[${requestId}] non-stream request: model=${model}, msg="${msgPreview}${userMsg.length > 80 ? "…" : ""}"`);

  if (!acpClient.isReady()) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "ACP agent not ready, please retry" } }));
    return;
  }

  let resultText = "";
  let thinkingText = "";
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    log("warn", `[${requestId}] request timeout after ${REQUEST_TIMEOUT_MS}ms`);
  }, REQUEST_TIMEOUT_MS);

  try {
    for await (const update of acpClient.prompt(userMsg, { model, requestId })) {
      if (timedOut) break;

      if (update._error) {
        log("error", `[${requestId}] prompt error: ${JSON.stringify(update._error)}`);
        break;
      }
      if (update._done) break;

      const sessionUpdate = update.sessionUpdate;
      if (sessionUpdate === "agent_message_chunk" && update.content?.text) {
        resultText += update.content.text;
      } else if (sessionUpdate === "agent_thinking_chunk" && FORWARD_THINKING && update.content?.text) {
        thinkingText += update.content.text;
      }
    }
  } catch (e) {
    log("error", `[${requestId}] non-stream error: ${e.message}`);
  }

  clearTimeout(timeout);
  const content = resultText || "(no response)";

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    id: requestId,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content,
        ...(thinkingText ? { reasoning_content: thinkingText } : {}),
      },
      finish_reason: "stop",
    }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }));
  log("info", `[${requestId}] completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s, resultLen=${content.length}`);
}

// ── Auth & CORS ─────────────────────────────────────────────────────────────

function checkAuth(req, res) {
  if (!API_KEY) return true;
  const auth = req.headers.authorization || "";
  if (auth === `Bearer ${API_KEY}`) return true;
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { message: "Invalid API key" } }));
  return false;
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ── HTTP server ─────────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 10 * 1024 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    let bytes = 0;
    req.on("data", (c) => {
      bytes += c.length;
      if (bytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error(`Request body exceeds ${MAX_BODY_BYTES} bytes`));
        return;
      }
      data += c;
    });
    req.on("end", () => {
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (!checkAuth(req, res)) return;

  if (req.method === "GET" && req.url === "/v1/health") {
    const acpStatus = acpClient.status();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      status: acpStatus.running ? "ok" : "degraded",
      mode: "acp",
      cursor: !!CURSOR_PATH,
      port: PORT,
      scriptHash: SCRIPT_HASH,
      acp: acpStatus,
    }));
  }

  if (req.method === "GET" && req.url === "/v1/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ data: cachedModels }));
  }

  if (req.method === "POST" && req.url === "/v1/session/rotate") {
    try {
      const newSessionId = await acpClient.rotateSession("api_request");
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, sessionId: newSessionId, status: acpClient.status() }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { message: e.message } }));
    }
  }

  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    if (!CURSOR_PATH) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "cursor-agent not found. Set CURSOR_PATH or install Cursor." } }));
    }
    try {
      const body = await readBody(req);
      const userMsg = extractUserMessage(body.messages);
      if (!userMsg) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "No user message found in messages array" } }));
      }
      if (body.stream) return handleStream(req, res, body);
      return handleNonStream(req, res, body);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { message: e instanceof Error ? e.message : String(e) } }));
    }
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { message: "Not found" } }));
});

// ── Startup ─────────────────────────────────────────────────────────────────

async function main() {
  if (!CURSOR_PATH) {
    log("error", "cursor-agent not found — cannot start ACP mode. Set CURSOR_PATH or install Cursor.");
    process.exit(1);
  }

  try {
    await acpClient.start();
  } catch (e) {
    log("error", `Failed to start ACP client: ${e.message}`);
    log("info", "Will retry automatically...");
  }

  server.listen(PORT, "127.0.0.1", () => {
    log("info", `Cursor ACP proxy on http://127.0.0.1:${PORT}`);
    log("info", `Agent: ${CURSOR_PATH}`);
    log("info", `Mode: ACP (persistent subprocess, zero cold start)`);
    log("info", `Model: ${CURSOR_MODEL || "auto"}, Thinking: ${FORWARD_THINKING ? "forward" : "drop"}`);
    if (API_KEY) log("info", "API key authentication enabled");
    if (WORKSPACE_DIR) log("info", `Workspace: ${WORKSPACE_DIR}`);
  });
}

function gracefulShutdown(signal) {
  log("info", `Received ${signal}, shutting down...`);
  acpClient.stop().catch(() => {});
  server.close(() => {
    log("info", "Shutdown complete.");
    process.exit(0);
  });
  setTimeout(() => {
    log("warn", "Shutdown timed out, forcing exit.");
    process.exit(1);
  }, 10_000).unref();
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

main();
