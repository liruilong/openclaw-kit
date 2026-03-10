#!/usr/bin/env node
// security-allow: hardcoded-url — 企业 AI Gateway 测试环境固定域名，无安全敏感信息
/**
 * 企业 AI Gateway V3 Proxy
 * V3 协议完全兼容 OpenAI API 标准，proxy 只做 header 注入和模型名前缀处理
 *
 * 环境变量:
 *   PORT             - 监听端口 (默认: 3010)
 *   GATEWAY_URL  - 网关 V3 base URL（默认: 测试环境）
 *   GATEWAY_TOKEN        - Bearer Token（必须配置）
 *   GATEWAY_UID          - AI-Gateway-Uid
 *   GATEWAY_PRODUCT      - AI-Gateway-Product-Name
 *   GATEWAY_INTENTION    - AI-Gateway-Intention-Code
 *   GATEWAY_DEV_MODE     - 是否启用开发者模式（默认 true，测试环境用）
 */

import http from "node:http";
import crypto from "node:crypto";

const PORT = parseInt(process.env.PORT ?? "3010", 10);
const GATEWAY_BASE =
  process.env.GATEWAY_URL ??
  "https://enterprise-gateway.example.com/testa/api/v3";

const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN;
if (!GATEWAY_TOKEN) {
  console.error("❌ 缺少 GATEWAY_TOKEN 环境变量，请先配置后再启动");
  console.error("   export GATEWAY_TOKEN=<your-token>");
  process.exit(1);
}

const DEV_MODE = process.env.GATEWAY_DEV_MODE !== "false";

/**
 * 模型映射表：proxy model id → { fullName (V3 命名), displayName }
 * V3 模型名格式：platform/model[/version]
 */
const MODEL_MAP = {
  "claude-opus-4-6": { fullName: "aws/claude-opus-4-6-v1", displayName: "Claude Opus 4.6" },
  "claude-opus-4-5": { fullName: "aws/claude-opus-4-5/20251101-v1:0", displayName: "Claude Opus 4.5" },
  "claude-sonnet-4-5": { fullName: "aws/claude-sonnet-4-5/20250929-v1:0", displayName: "Claude Sonnet 4.5" },
  "claude-3-7-sonnet": { fullName: "aws/claude-3-7-sonnet/20250219-v1:0", displayName: "Claude 3.7 Sonnet" },
  "claude-3-5-haiku": { fullName: "aws/claude-3-5-haiku/20241022-v1:0", displayName: "Claude 3.5 Haiku" },
  "gpt-5": { fullName: "azure/gpt-5/2025-08-07", displayName: "GPT-5" },
  "gpt-5-mini": { fullName: "azure/gpt-5-mini/2025-08-07", displayName: "GPT-5 Mini" },
  "gpt-4.1": { fullName: "azure/gpt-4.1/2025-04-14", displayName: "GPT-4.1" },
  "o3": { fullName: "azure/o3/2025-04-16", displayName: "o3" },
  "gemini-2.5-pro": { fullName: "google/gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
  "gemini-2.5-flash": { fullName: "google/gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
  "deepseek-v3.2": { fullName: "deepseek/deepseek-v3.2", displayName: "DeepSeek V3.2" },
  "deepseek-reasoner": { fullName: "deepseek/deepseek-reasoner/0528", displayName: "DeepSeek R1" },
  "kimi-k2.5": { fullName: "moonshot/kimi-k2.5", displayName: "Kimi K2.5" },
};
const DEFAULT_MODEL = "claude-opus-4-6";

function generateActionId() {
  return crypto.randomBytes(16).toString("hex");
}

function buildGatewayHeaders() {
  const headers = {
    Authorization: `Bearer ${GATEWAY_TOKEN}`,
    "AI-Gateway-Uid": process.env.GATEWAY_UID ?? "9010",
    "AI-Gateway-Product-Name": process.env.GATEWAY_PRODUCT ?? "kdocs-as-baseserver",
    "AI-Gateway-Intention-Code":
      process.env.GATEWAY_INTENTION ?? "kdocs_as_assistant_intentrecognize",
    "Content-Type": "application/json",
    "X-Action-Id": generateActionId(),
    "Client-Request-Id": `proxy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  if (DEV_MODE) {
    headers["X-Dev-Mode"] = "true";
  }
  return headers;
}

function resolveModel(requestModel) {
  if (requestModel && requestModel in MODEL_MAP) {
    return { key: requestModel, fullName: MODEL_MAP[requestModel].fullName };
  }
  if (requestModel && requestModel.includes("/")) {
    return { key: requestModel, fullName: requestModel };
  }
  return { key: DEFAULT_MODEL, fullName: MODEL_MAP[DEFAULT_MODEL].fullName };
}

/** 从 JSON 工具结果中剥离 base64 截图，节省 token */
function stripBase64FromBody(bodyStr) {
  return bodyStr.replace(
    /"data:image\/[^;]+;base64,[^"]{200,}"/g,
    '"[base64图片已省略]"',
  );
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
  let rawBody;
  try {
    rawBody = stripBase64FromBody(await readBody(req));
  } catch {
    return sendJson(res, 400, { error: { message: "Invalid request body" } });
  }

  let openaiBody;
  try {
    openaiBody = JSON.parse(rawBody);
  } catch {
    return sendJson(res, 400, { error: { message: "Invalid JSON body" } });
  }

  const { key: modelKey, fullName: v3Model } = resolveModel(openaiBody.model);
  const isStream = Boolean(openaiBody.stream);

  openaiBody.model = v3Model;

  const msgCount = openaiBody.messages?.length ?? 0;
  const lastUserMsg = [...(openaiBody.messages ?? [])].reverse().find(m => m.role === "user");
  const preview = typeof lastUserMsg?.content === "string"
    ? lastUserMsg.content.replace(/\n/g, " ").slice(0, 120)
    : "[多模态]";
  const toolNames = openaiBody.tools?.map(t => t.function?.name).join(",") ?? "无";

  console.log(`\n${"─".repeat(60)}`);
  console.log(`[→ 发送请求] ${new Date().toLocaleTimeString()}`);
  console.log(`   模型: ${modelKey} → ${v3Model}  消息数: ${msgCount}  工具: ${toolNames}`);
  console.log(`   最后用户消息: ${preview}`);

  const gatewayUrl = `${GATEWAY_BASE}/chat/completions`;
  const gatewayHeaders = buildGatewayHeaders();

  let gwRes;
  try {
    gwRes = await fetch(gatewayUrl, {
      method: "POST",
      headers: gatewayHeaders,
      body: JSON.stringify(openaiBody),
    });
  } catch (err) {
    console.error("[proxy] fetch error:", err.message);
    return sendJson(res, 502, {
      error: { message: `Gateway unreachable: ${err.message}` },
    });
  }

  if (!gwRes.ok) {
    const errText = await gwRes.text();
    console.error(`[proxy] gateway error ${gwRes.status}:`, errText);
    return sendJson(res, gwRes.status, { error: { message: errText } });
  }

  if (isStream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.writeHead(200);

    const reader = gwRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let streamContent = "";
    let streamToolCallsMap = {};
    let streamFinishReason = null;
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
            res.write("data: [DONE]\n\n");
            continue;
          }

          if (trimmed.startsWith("data:")) {
            const raw = trimmed.slice(5).trim();
            try {
              const parsed = JSON.parse(raw);
              if (parsed.model) parsed.model = modelKey;
              if (parsed.usage) lastUsage = parsed.usage;

              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) streamContent += delta.content;
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!streamToolCallsMap[idx]) streamToolCallsMap[idx] = { name: "", arguments: "" };
                  if (tc.function?.name) streamToolCallsMap[idx].name += tc.function.name;
                  if (tc.function?.arguments) streamToolCallsMap[idx].arguments += tc.function.arguments;
                }
              }
              if (parsed.choices?.[0]?.finish_reason) {
                streamFinishReason = parsed.choices[0].finish_reason;
              }

              res.write(`data: ${JSON.stringify(parsed)}\n\n`);
            } catch {
              res.write(`${line}\n`);
            }
          }
        }
      }
    } finally {
      res.end();
      const toolEntries = Object.values(streamToolCallsMap);
      const u = lastUsage;
      console.log(`[← 收到响应(stream)] finish_reason=${streamFinishReason}  tokens=${u?.prompt_tokens ?? 0}+${u?.completion_tokens ?? 0}=${u?.total_tokens ?? 0}`);
      if (toolEntries.length > 0) {
        for (const tc of toolEntries) {
          console.log(`   🔧 工具调用: ${tc.name}(${tc.arguments.slice(0, 80)})`);
        }
      } else if (streamContent) {
        console.log(`   💬 回复:\n${streamContent.slice(0, 300)}`);
      }
    }
  } else {
    let gwData;
    try {
      gwData = await gwRes.json();
    } catch (err) {
      return sendJson(res, 502, {
        error: { message: `Invalid gateway response: ${err.message}` },
      });
    }

    if (gwData.error) {
      console.error("[proxy] gateway error:", gwData.error.message);
      return sendJson(res, 400, { error: gwData.error });
    }

    if (gwData.model) gwData.model = modelKey;

    const choice = gwData.choices?.[0];
    const usage = gwData.usage;
    console.log(`[← 收到响应] finish_reason=${choice?.finish_reason}  tokens=${usage?.prompt_tokens ?? 0}+${usage?.completion_tokens ?? 0}=${usage?.total_tokens ?? 0}`);
    if (choice?.message?.tool_calls?.length) {
      for (const tc of choice.message.tool_calls) {
        console.log(`   🔧 工具调用: ${tc.function?.name}(${tc.function?.arguments?.slice(0, 80)})`);
      }
    } else {
      const replyContent = choice?.message?.content ?? "";
      console.log(`   💬 回复:\n${replyContent.slice(0, 300)}`);
    }

    sendJson(res, 200, gwData);
  }
}

function handleModels(res) {
  const models = Object.entries(MODEL_MAP).map(([id, cfg]) => ({
    id,
    object: "model",
    created: 1_700_000_000,
    owned_by: cfg.fullName.split("/")[0],
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
  console.log(`✅ 企业 AI V3 Proxy 已启动 → http://127.0.0.1:${PORT}/v1`);
  console.log(`   网关地址: ${GATEWAY_BASE}`);
  console.log(`   开发者模式: ${DEV_MODE ? "✓" : "✗"}`);
  console.log(`   默认模型: ${DEFAULT_MODEL} → ${MODEL_MAP[DEFAULT_MODEL].fullName}`);
  console.log(`   可用模型: ${Object.keys(MODEL_MAP).join(", ")}`);
});

server.on("error", (err) => {
  console.error("❌ 服务器启动失败:", err.message);
  process.exit(1);
});
