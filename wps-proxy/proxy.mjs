#!/usr/bin/env node
/**
 * WPS AI Gateway Proxy
 * 将 OpenAI 兼容格式请求（含 Tool Calling）转换为 WPS 内网 AI 网关格式
 *
 * 用法: node proxy.mjs [--model <model-id>]
 * 环境变量:
 *   PORT             - 监听端口 (默认: 3010)
 *   WPS_GATEWAY_URL  - 网关地址
 *   WPS_TOKEN        - Bearer Token（必须配置）
 *   WPS_UID          - AI-Gateway-Uid
 *   WPS_PRODUCT      - AI-Gateway-Product-Name
 *   WPS_INTENTION    - AI-Gateway-Intention-Code
 */

import http from "node:http";

// ──────────────────────────────────────────────
// 命令行参数解析
// ──────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--model" && args[i + 1]) {
      result.model = args[++i];
    }
  }
  return result;
}

const cliArgs = parseArgs();

// ──────────────────────────────────────────────
// 配置
// ──────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3010", 10);
const GATEWAY_URL =
  process.env.WPS_GATEWAY_URL ?? "http://ai-gateway.wps.cn/api/v2/llm/chat";

const WPS_TOKEN = process.env.WPS_TOKEN;
if (!WPS_TOKEN) {
  console.error("❌ 缺少 WPS_TOKEN 环境变量，请先配置后再启动");
  console.error("   export WPS_TOKEN=<your-token>");
  process.exit(1);
}

const GATEWAY_HEADERS = {
  Authorization: `Bearer ${WPS_TOKEN}`,
  "AI-Gateway-Uid": process.env.WPS_UID ?? "9010",
  "AI-Gateway-Product-Name": process.env.WPS_PRODUCT ?? "kdocs-as-baseserver",
  "AI-Gateway-Intention-Code":
    process.env.WPS_INTENTION ?? "kdocs_as_assistant_intentrecognize",
  "Content-Type": "application/json",
  ClientType: "wps-pc",
  ClientVer: "0.0.0.0",
  ClientChan: "0.0.0.0",
  ClientLang: "zh-cn",
};

/** 模型映射表：OpenAI model id → WPS 网关参数 */
const MODEL_MAP = {
  "claude-opus-4-6": {
    model: "claude-opus-4-6-v1",
    provider: "aws",
    version: "",
    extArgs: { stop_sequences: [], anthropic_version: "bedrock-2023-05-31" },
  },
  "claude-opus-4-5": {
    model: "claude-opus-4-5",
    provider: "aws",
    version: "20251101-v1:0",
    extArgs: { stop_sequences: [], anthropic_version: "bedrock-2023-05-31" },
  },
  "claude-sonnet-4-5": {
    model: "claude-sonnet-4-5",
    provider: "aws",
    version: "20250929-v1:0",
    extArgs: { stop_sequences: [], anthropic_version: "bedrock-2023-05-31" },
  },
  "claude-sonnet-4": {
    model: "claude-sonnet-4",
    provider: "aws",
    version: "20250514-v1:0",
    extArgs: { stop_sequences: [], anthropic_version: "bedrock-2023-05-31" },
  },
  "claude-3-7-sonnet": {
    model: "claude-3-7-sonnet",
    provider: "aws",
    version: "20250219-v1:0",
    extArgs: { stop_sequences: [], anthropic_version: "bedrock-2023-05-31" },
  },
  "claude-3-5-haiku": {
    model: "claude-3-5-haiku",
    provider: "aws",
    version: "20241022-v1:0",
    extArgs: { stop_sequences: [], anthropic_version: "bedrock-2023-05-31" },
  },
};
const DEFAULT_MODEL_KEY = cliArgs.model && cliArgs.model in MODEL_MAP
  ? cliArgs.model
  : "claude-opus-4-6";

// ──────────────────────────────────────────────
// 内容处理工具函数
// ──────────────────────────────────────────────

/** 从 JSON 工具结果中剥离 base64 截图，节省 token */
function stripBase64(text) {
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object" && "screenshot" in obj) {
      const { screenshot: _, ...rest } = obj;
      return JSON.stringify({
        ...rest,
        _note: "[截图已省略，请用 snapshot 操作获取页面 DOM 文字结构]",
      });
    }
  } catch {
    return text.replace(
      /"data:image\/[^;]+;base64,[^"]{100,}"/g,
      '"[base64图片已省略]"',
    );
  }
  return text;
}

/** 将 OpenAI 消息内容统一转为字符串（WPS 网关只支持文本） */
function normalizeContent(content) {
  if (content === null || content === undefined) return null;
  if (typeof content === "string") return stripBase64(content);
  if (Array.isArray(content)) {
    const parts = content.map((part) => {
      if (typeof part === "string") return stripBase64(part);
      if (part.type === "text") return stripBase64(part.text ?? "");
      if (part.type === "tool_result") {
        const inner = Array.isArray(part.content)
          ? part.content.map((c) => (c.type === "text" ? c.text : "")).join("")
          : String(part.content ?? "");
        return stripBase64(inner);
      }
      if (part.type === "image_url" || part.type === "image") {
        return "[图片已省略，请用 snapshot 获取页面文字结构]";
      }
      return "";
    });
    return parts.filter(Boolean).join("\n") || null;
  }
  return String(content);
}

// ──────────────────────────────────────────────
// 格式转换：OpenAI → WPS
// ──────────────────────────────────────────────

function buildWpsMessage(m) {
  const base = { role: m.role };

  if (m.role === "assistant") {
    // assistant 可能带 tool_calls（工具调用请求）
    const content = normalizeContent(m.content);
    if (content !== null) base.content = content;
    if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      base.tool_calls = m.tool_calls;
    }
  } else if (m.role === "tool") {
    // 工具执行结果
    base.content = normalizeContent(m.content) ?? "";
    if (m.tool_call_id) base.tool_call_id = m.tool_call_id;
    if (m.name) base.name = m.name;
  } else {
    // user / system（已在外层过滤 system）
    base.content = normalizeContent(m.content) ?? "";
  }

  return base;
}

function toWpsRequest(openaiBody, wpsStream) {
  const {
    messages = [],
    model,
    temperature,
    max_tokens,
    tools,
    tool_choice,
  } = openaiBody;

  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  const modelKey = model in MODEL_MAP ? model : DEFAULT_MODEL_KEY;
  const modelCfg = MODEL_MAP[modelKey];

  const req = {
    stream: wpsStream,
    context: normalizeContent(systemMsg?.content) || "你是一个AI助手",
    examples: [],
    messages: chatMessages.map(buildWpsMessage),
    model: modelCfg.model,
    provider: modelCfg.provider,
    version: modelCfg.version,
    base_llm_arguments: {
      temperature: temperature ?? 0.99,
      max_tokens: max_tokens ?? 4096,
    },
    extended_llm_arguments: {
      [`${modelCfg.provider}_${modelCfg.model}`]: modelCfg.extArgs,
    },
    sec_text: { from: "", scene: "" },
    retry_strategy: { retry_count: 1, timeout: 30 },
  };

  // 透传工具定义（WPS 使用 OpenAI 格式，无需转换）
  if (Array.isArray(tools) && tools.length > 0) {
    req.tools = tools;
    req.tool_choice = tool_choice ?? "auto";
  }

  return req;
}

// ──────────────────────────────────────────────
// 格式转换：WPS 响应 → OpenAI
// ──────────────────────────────────────────────

function toOpenaiCompletion(wpsData, modelId) {
  const choice = wpsData.choices?.[0] ?? {};
  const text = choice.text ?? "";
  const toolCalls = choice.tool_calls;
  const finishReason = choice.finish_reason ?? "stop";
  const usage = wpsData.usage ?? {};

  const message = { role: "assistant", content: text || null };
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    message.tool_calls = toolCalls;
  }

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: modelId,
    choices: [{ index: 0, message, finish_reason: finishReason }],
    usage: {
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
    },
  };
}

function toOpenaiChunk(wpsChunk, modelId) {
  const choice = wpsChunk.choices?.[0] ?? {};
  const text = choice.text ?? choice.delta?.text ?? "";
  const toolCalls = choice.tool_calls ?? choice.delta?.tool_calls;
  const finishReason = choice.finish_reason ?? null;

  const delta = {};
  if (text) delta.content = text;
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    delta.tool_calls = toolCalls;
  }
  if (!text && !toolCalls && !finishReason) delta.role = "assistant";

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: modelId,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
}

/** 构造 OpenAI 标准 usage chunk（stream_options: { include_usage: true } 规范） */
function toUsageChunk(usage, modelId) {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: modelId,
    choices: [],
    usage: {
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
    },
  };
}

// ──────────────────────────────────────────────
// HTTP Server
// ──────────────────────────────────────────────

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, status, body) {
  res.setHeader("Content-Type", "application/json");
  res.writeHead(status);
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function handleChatCompletions(req, res) {
  let openaiBody;
  try {
    openaiBody = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, { error: { message: "Invalid JSON body" } });
  }

  const isStream = Boolean(openaiBody.stream);
  const wpsBody = toWpsRequest(openaiBody, isStream);

  // ── 请求日志 ──
  const msgCount = wpsBody.messages.length;
  const lastUserMsg = [...wpsBody.messages].reverse().find(m => m.role === "user");
  const preview = String(lastUserMsg?.content ?? "").replace(/\n/g, " ");
  const toolNames = wpsBody.tools?.map((t) => t.function?.name).join(",") ?? "无";
  console.log(`\n${"─".repeat(60)}`);
  console.log(`[→ 发送请求] ${new Date().toLocaleTimeString()}`);
  console.log(`   模型: ${wpsBody.model}  消息数: ${msgCount}  工具: ${toolNames}`);
  console.log(`   最后用户消息: ${preview}`);

  let wpsRes;
  try {
    wpsRes = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: GATEWAY_HEADERS,
      body: JSON.stringify(wpsBody),
    });
  } catch (err) {
    console.error("[proxy] fetch error:", err.message);
    return sendJson(res, 502, {
      error: { message: `Gateway unreachable: ${err.message}` },
    });
  }

  if (!wpsRes.ok) {
    const errText = await wpsRes.text();
    console.error(`[proxy] gateway error ${wpsRes.status}:`, errText);
    return sendJson(res, wpsRes.status, { error: { message: errText } });
  }

  if (isStream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.writeHead(200);

    const reader = wpsRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    // 收集流式内容用于日志输出（全部结束后统一打印）
    let streamContent = "";
    let streamToolCallsMap = {};  // index → {name, arguments}
    let streamFinishReason = null;
    // 收集最新的 usage（WPS 每个 chunk 都带 usage，取最后一个最完整）
    let lastUsage = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === "data: [DONE]") {
            // 不立即转发 [DONE]，先在下方发送 usage chunk
            continue;
          }
          if (trimmed.startsWith("data:")) {
            const raw = trimmed.slice(5).trim();
            try {
              const parsed = JSON.parse(raw);
              // 收集 usage（取最后一个 chunk 的值，通常是最终完整值）
              if (parsed.usage) {
                lastUsage = parsed.usage;
              }
              const chunk = toOpenaiChunk(parsed, openaiBody.model);
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              // 收集内容用于日志（流式 tool_calls 按 index 拼接 arguments）
              const delta = chunk.choices?.[0]?.delta;
              if (delta?.content) streamContent += delta.content;
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!streamToolCallsMap[idx]) {
                    streamToolCallsMap[idx] = { name: "", arguments: "" };
                  }
                  if (tc.function?.name) streamToolCallsMap[idx].name += tc.function.name;
                  if (tc.function?.arguments) streamToolCallsMap[idx].arguments += tc.function.arguments;
                }
              }
              if (chunk.choices?.[0]?.finish_reason) streamFinishReason = chunk.choices[0].finish_reason;
            } catch {
              res.write(`${line}\n`);
            }
          }
        }
      }
    } finally {
      // 在 [DONE] 之前发送 usage chunk（OpenAI stream_options.include_usage 规范）
      if (lastUsage) {
        const usageChunk = toUsageChunk(lastUsage, openaiBody.model);
        res.write(`data: ${JSON.stringify(usageChunk)}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
      // 流结束后统一打印完整日志
      const toolEntries = Object.values(streamToolCallsMap);
      const u = lastUsage;
      console.log(`[← 收到响应(stream)] finish_reason=${streamFinishReason}  tokens=${u?.prompt_tokens ?? 0}+${u?.completion_tokens ?? 0}=${u?.total_tokens ?? 0}`);
      if (toolEntries.length > 0) {
        for (const tc of toolEntries) {
          console.log(`   🔧 工具调用: ${tc.name}(${tc.arguments})`);
        }
      } else if (streamContent) {
        console.log(`   💬 回复:\n${streamContent}`);
      }
    }
  } else {
    let wpsData;
    try {
      wpsData = await wpsRes.json();
    } catch (err) {
      return sendJson(res, 502, {
        error: { message: `Invalid gateway response: ${err.message}` },
      });
    }

    if (wpsData.code && wpsData.code !== "Success") {
      console.error("[proxy] gateway error:", wpsData.message);
      return sendJson(res, 400, {
        error: { message: wpsData.message ?? "Gateway error" },
      });
    }

    const openaiResp = toOpenaiCompletion(wpsData, openaiBody.model);

    // 记录工具调用情况
    // ── 响应日志 ──
    const choice = openaiResp.choices[0];
    const fc = choice?.message?.tool_calls;
    const usage = openaiResp.usage;
    console.log(`[← 收到响应] finish_reason=${choice?.finish_reason}  tokens=${usage.prompt_tokens}+${usage.completion_tokens}=${usage.total_tokens}`);
    if (fc?.length) {
      for (const tc of fc) {
        console.log(`   🔧 工具调用: ${tc.function?.name}(${tc.function?.arguments?.slice(0,80)})`);
      }
    } else {
      const replyContent = choice?.message?.content ?? "";
      console.log(`   💬 回复:\n${replyContent}`);
    }

    sendJson(res, 200, openaiResp);
  }
}

function handleModels(res) {
  const models = Object.keys(MODEL_MAP).map((id) => ({
    id,
    object: "model",
    created: 1_700_000_000,
    owned_by: MODEL_MAP[id].provider,
  }));
  sendJson(res, 200, { object: "list", data: models });
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (url.pathname === "/v1/chat/completions" && req.method === "POST") {
      await handleChatCompletions(req, res);
    } else if (url.pathname === "/v1/models" && req.method === "GET") {
      handleModels(res);
    } else {
      sendJson(res, 404, { error: { message: "Not found" } });
    }
  } catch (err) {
    console.error("[proxy] unhandled error:", err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: { message: String(err) } });
    }
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ WPS AI Proxy 已启动 → http://127.0.0.1:${PORT}/v1`);
  console.log(`   网关地址: ${GATEWAY_URL}`);
  console.log(`   默认模型: ${DEFAULT_MODEL_KEY}`);
  console.log(`   可用模型: ${Object.keys(MODEL_MAP).join(", ")}`);
  console.log(`   支持工具调用: ✓`);
});

server.on("error", (err) => {
  console.error("❌ 服务器启动失败:", err.message);
  process.exit(1);
});
