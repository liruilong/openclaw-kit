# 模型配置

## 模型方案总览

| 方案 | 成本 | 特点 | 适用场景 |
|------|------|------|---------|
| **A. 企业 AI 网关（推荐）** | 企业内部零成本 | 企业网关 V3 协议，14+ 模型（Claude/GPT-5/Gemini/DeepSeek） | 企业内网环境，日常首选 |
| **B. 火山引擎（豆包）** | 按量付费 | 国产模型，Tool Use 能力强 | 需独立 API 调用 |
| **C. 其他 OpenAI 兼容** | 按量付费 | Qwen/GLM/DeepSeek 等 | 灵活选择 |
---

## 方案 A: 企业 AI 网关 — 推荐首选

通过 gateway-proxy 将企业内网 AI 网关转换为 OpenAI 兼容接口。**企业内部零成本，支持 14+ 模型（Claude/GPT-5/Gemini/DeepSeek），适合日常所有场景。**

### 前提条件

- Node.js >= 18（proxy.mjs 使用原生 fetch）
- 需在公司内网环境，能访问 `enterprise-gateway.example.com`
- 需配置 `GATEWAY_TOKEN` 环境变量
- 需配置 hosts 绑定（测试/线上共用）：

```
120.92.124.158 aigc-gateway-test.ksord.com
120.92.124.158 enterprise-gateway.example.com
120.92.124.158 prompt-server-test.ksord.com
```

### 架构

```
OpenClaw → gateway-proxy (localhost:<port>) → 企业 AI 网关 V3 (enterprise-gateway.example.com)
```

gateway-proxy 使用 V3 协议（完全兼容 OpenAI API），proxy 只做 header 注入和模型名前缀处理。

### 部署与启动

#### 1. 部署脚本

```bash
cp gateway-proxy/proxy.mjs ~/.openclaw/gateway-proxy.mjs
```

#### 2. 配置 LaunchAgent（开机自启 + 崩溃重启）

创建 `~/Library/LaunchAgents/ai.openclaw.gateway-proxy.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>ai.openclaw.gateway-proxy</string>
    <key>Comment</key>
    <string>企业 AI Gateway Proxy</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>5</integer>
    <key>ProgramArguments</key>
    <array>
      <string>/path/to/node</string>
      <string>/Users/<username>/.openclaw/gateway-proxy.mjs</string>
    </array>
    <key>StandardOutPath</key>
    <string>/Users/<username>/.openclaw/logs/gateway-proxy.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/<username>/.openclaw/logs/gateway-proxy.err.log</string>
    <key>EnvironmentVariables</key>
    <dict>
      <key>HOME</key>
      <string>/Users/<username></string>
      <key>PORT</key>
      <string>3010</string>
      <key>GATEWAY_TOKEN</key>
      <string><your-token></string>
    </dict>
  </dict>
</plist>
```

加载服务：

```bash
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway-proxy.plist
```

#### 3. 手动启动（不用 LaunchAgent）

```bash
export GATEWAY_TOKEN=<your-token>
node ~/.openclaw/gateway-proxy.mjs
```

### Provider 配置

在 `openclaw.json` 的 `models.providers` 下配置：

```json
"gateway": {
  "baseUrl": "http://127.0.0.1:<port>/v1",
  "api": "openai-completions",
  "models": [
    { "id": "claude-opus-4-6", "name": "Claude Opus 4.6 (企业网关)", "reasoning": true, "contextWindow": 200000, "maxTokens": 16384 },
    { "id": "claude-opus-4-5", "name": "Claude Opus 4.5 (企业网关)", "reasoning": true, "contextWindow": 200000, "maxTokens": 4096 },
    { "id": "claude-sonnet-4-5", "name": "Claude Sonnet 4.5 (企业网关)", "reasoning": true, "contextWindow": 200000, "maxTokens": 4096 },
    { "id": "claude-sonnet-4", "name": "Claude Sonnet 4 (企业网关)", "contextWindow": 200000, "maxTokens": 4096 },
    { "id": "claude-3-7-sonnet", "name": "Claude 3.7 Sonnet (企业网关)", "contextWindow": 200000, "maxTokens": 4096 },
    { "id": "claude-3-5-haiku", "name": "Claude 3.5 Haiku (企业网关)", "contextWindow": 200000, "maxTokens": 4096 },
    { "id": "gpt-5", "name": "GPT-5 (企业网关)", "reasoning": true, "contextWindow": 128000, "maxTokens": 16384 },
    { "id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro (企业网关)", "reasoning": true, "contextWindow": 1048576, "maxTokens": 16384 },
    { "id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash (企业网关)", "contextWindow": 1048576, "maxTokens": 16384 },
    { "id": "deepseek-v3.2", "name": "DeepSeek V3.2 (企业网关)", "contextWindow": 128000, "maxTokens": 8192 },
    { "id": "deepseek-reasoner", "name": "DeepSeek R1 (企业网关)", "reasoning": true, "contextWindow": 128000, "maxTokens": 8192 }
  ]
}
```

在 `agents.defaults.model` 下配置：

```json
{
  "primary": "gateway/claude-opus-4-6",
  "fallbacks": ["gateway/claude-opus-4-5", "gateway/claude-sonnet-4-5"]
}
```

重启：`openclaw gateway restart`

### 可用模型

| 模型 ID | 说明 | 后端 |
|---------|------|------|
| `claude-opus-4-6` | Claude Opus 4.6（默认） | AWS Bedrock |
| `claude-opus-4-5` | Claude Opus 4.5 | AWS Bedrock |
| `claude-sonnet-4-5` | Claude Sonnet 4.5 | AWS Bedrock |
| `claude-sonnet-4` | Claude Sonnet 4 | AWS Bedrock |
| `claude-3-7-sonnet` | Claude 3.7 Sonnet | AWS Bedrock |
| `claude-3-5-haiku` | Claude 3.5 Haiku（心跳） | AWS Bedrock |
| `gpt-5` | GPT-5 | Azure |
| `gemini-2.5-pro` | Gemini 2.5 Pro | Google |
| `gemini-2.5-flash` | Gemini 2.5 Flash | Google |
| `deepseek-v3.2` | DeepSeek V3.2 | DeepSeek |
| `deepseek-reasoner` | DeepSeek R1 | DeepSeek |

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3010` | 监听端口 |
| `GATEWAY_TOKEN` | **必须配置** | Bearer Token |
| `GATEWAY_UID` | `9010` | AI-Gateway-Uid |
| `GATEWAY_PRODUCT` | `kdocs-as-baseserver` | AI-Gateway-Product-Name |
| `GATEWAY_INTENTION` | `kdocs_as_assistant_intentrecognize` | AI-Gateway-Intention-Code |

详见 [gateway-proxy README](../gateway-proxy/README.md)

---

## 方案 B: 火山引擎（Volcengine / 豆包）

### Provider 配置

配置路径：`models.providers.doubao`

```json
{
  "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
  "apiKey": "<火山方舟 API Key>",
  "api": "openai-completions"
}
```

- `baseUrl`: 火山方舟的 OpenAI 兼容 API 端点
- `api`: 使用 `openai-completions` 兼容模式
- API Key 在 [火山方舟控制台](https://console.volcengine.com/ark/) 获取

### 已配置的模型

| 模型 ID | 名称 | 用途 | 上下文窗口 | 最大输出 | 多模态 |
|---------|------|------|-----------|---------|--------|
| `doubao-seed-2-0-pro-260215` | 豆包 2.0 Pro | Fallback 模型 | 256K | 8K | 文本+图片 |
| `doubao-seed-2-0-lite-260215` | 豆包 2.0 Lite | 轻量任务 | 128K | 8K | 文本+图片 |
| `doubao-seed-2-0-mini-260215` | 豆包 2.0 Mini | 极轻量任务 | 256K | 8K | 文本 |

> 注意：模型 ID 实际上是火山方舟的**推理接入点（Endpoint）ID**，需要先在控制台创建。

### Agent 默认模型

配置路径：`agents.defaults.model`

当前主模型使用 企业网关，豆包作为 fallback：

```json
{
  "primary": "gateway/claude-opus-4-6",
  "fallbacks": ["doubao/doubao-seed-2-0-pro-260215"]
}
```

### Heartbeat 模型

配置路径：`agents.defaults.heartbeat` 和 `agents.list[].heartbeat`

```json
{
  "every": "30m",
  "target": "last",
  "activeHours": { "start": "08:00", "end": "24:00" }
}
```

- `target: "last"` — 心跳投递到最近活跃的会话
- `activeHours` — 限制心跳仅在活跃时段运行
- 各 Agent 可覆盖 heartbeat 配置（如主 Agent 使用 `gateway/claude-3-5-haiku` 进行心跳）

### 配置命令

```bash
# 查看已配置模型
openclaw models list

# 查看模型状态
openclaw models status

# 设置默认模型
openclaw models set gateway/claude-opus-4-6

# 添加模型 fallback
openclaw models fallbacks add gateway/claude-opus-4-5
```

### 添加新模型

在 `openclaw.json` 的 `models.providers.doubao.models` 数组中添加：

```json
{
  "id": "<endpoint-id>",
  "name": "模型显示名",
  "reasoning": false,
  "input": ["text", "image"],
  "contextWindow": 65535,
  "maxTokens": 65535
}
```

### Embedding 模型（待配置）

记忆搜索需要 embedding 模型。方案有：

1. **本地 Ollama**（推荐免费方案）：在 Mac 上运行 Ollama + `nomic-embed-text`
2. **火山引擎 embedding**：需在控制台创建 `doubao-embedding` endpoint
3. **硅基流动（SiliconFlow）**：免费额度，`https://api.siliconflow.cn/v1`

详见 [记忆系统](08-memory.md)。

---

## 模型提供商对比

| 模型提供商 | Tool Use 能力 | 性价比 | OpenAI 兼容 | 状态 |
|-----------|-------------|--------|-----------|------|
| **企业 AI 网关** | 极强（Claude 4.6/GPT-5/Gemini） | **企业内部零成本** | 是（via gateway-proxy V3） | ✅ 推荐 |
| 豆包 Doubao | 强 | 高 | 是 | ✅ 可用 |
| Qwen（通义千问） | 很强 | 高 | 是 | ✅ 可用 |
| GLM-4（智谱） | 不错 | 极高（有免费额度） | 是 | ✅ 可用 |
| DeepSeek | 一般 | 极高 | 是 | ✅ 可用 |
| Moonshot（Kimi） | 好 | 中 | 是 | ✅ 可用 |
