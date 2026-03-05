# 模型配置

## 模型方案总览

| 方案 | 成本 | 特点 | 适用场景 |
|------|------|------|---------|
| **A. Cursor Agent 代理** | 零额外成本 | 复用企业 Cursor 账号模型 | 已有企业 Cursor 账号 |
| **B. 火山引擎（豆包）** | 按量付费 | 国产模型，Tool Use 能力强 | 需独立 API 调用 |
| **C. 其他 OpenAI 兼容** | 按量付费 | Qwen/GLM/DeepSeek 等 | 灵活选择 |
| **D. 企业 AI 网关** | 企业内部 | 统一协议接入多家模型 | 企业内网环境 |

---

## 方案 A: Cursor Agent 代理（推荐，零额外成本）

通过 llm-proxy 将 OpenClaw 的请求转发给 Cursor Agent CLI，复用企业 Cursor 账号的模型能力。**每月可节省 200U+。**

### 前提条件

- 已安装 Cursor 并登录企业账号
- 已安装 Cursor Agent CLI（`agent login`）

### 架构

```
OpenClaw → llm-proxy (localhost:3000) → Cursor Agent CLI → Cursor 企业模型
```

### 配置步骤

1. 启动 llm-proxy（位于本仓库 `llm-proxy/` 目录）：

```bash
cd llm-proxy
# 确认 server.js 中 CONFIG.agentPath 指向本机 agent 路径
npm start
```

2. 在 `openclaw.json` 的 `models.providers` 下新增：

```json
"local-agent-proxy": {
  "baseUrl": "http://localhost:3000/v1",
  "apiKey": "not-needed",
  "api": "openai-completions",
  "models": [
    {
      "id": "opus-4.6",
      "name": "Claude 4.6 Opus (via Cursor Agent)",
      "reasoning": false,
      "input": ["text"],
      "contextWindow": 128000,
      "maxTokens": 16384
    }
  ]
}
```

3. 在 `agents.defaults.model` 下配置：

```json
{
  "primary": "local-agent-proxy/opus-4.6"
}
```

4. 重启使配置生效：`openclaw gateway restart`

### 可用模型

通过 `agent models` 查询完整列表，常用模型：

| 模型 ID | 说明 |
|---------|------|
| `opus-4.6` | Claude 4.6 Opus（默认） |
| `gpt-5.2` | GPT-5.2 通用 |
| `sonnet-4.6` | Claude 4.6 Sonnet |
| `gemini-3-flash` | Gemini 3 Flash（快速） |

### 注意事项

- llm-proxy 需保持运行，建议用 pm2 或 LaunchAgent 守护
- agent CLI 需已登录（`agent login`）
- 详见 [llm-proxy README](../llm-proxy/README.md)

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

| 模型 ID | 名称 | 用途 | 上下文窗口 | 最大输出 |
|---------|------|------|-----------|---------|
| `doubao-seed-1-8-251228` | Doubao Seed 1.8 | Fallback 模型，支持图片 | 64K | 64K |
| `doubao-1.5-pro-32k-250115` | Doubao 1.5 Pro | **主模型** | 32K | 12K |
| `doubao-1.5-lite-32k-250115` | Doubao 1.5 Lite | Heartbeat 轻量模型 | 32K | 4K |

> 注意：模型 ID 实际上是火山方舟的**推理接入点（Endpoint）ID**，需要先在控制台创建。

### Agent 默认模型

配置路径：`agents.defaults.model`

```json
{
  "primary": "doubao/doubao-1.5-pro-32k-250115",
  "fallbacks": ["doubao/doubao-seed-1-8-251228"]
}
```

### Heartbeat 模型

配置路径：`agents.defaults.heartbeat`

```json
{
  "every": "30m",
  "model": "doubao/doubao-1.5-lite-32k-250115"
}
```

使用 Lite 模型做心跳检查，节省成本。

### 配置命令

```bash
# 查看已配置模型
openclaw models list

# 查看模型状态
openclaw models status

# 设置默认模型
openclaw models set doubao/doubao-1.5-pro-32k-250115

# 添加模型 fallback
openclaw models fallbacks add doubao/doubao-seed-1-8-251228
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

### 模型提供商对比

| 模型提供商 | Tool Use 能力 | 性价比 | OpenAI 兼容 |
|-----------|-------------|--------|-----------|
| **Cursor Agent 代理** | 极强（GPT-5/Claude 4.6） | **零额外成本** | 是（via llm-proxy） |
| **企业 AI 网关** | 取决于后端模型 | 企业内部统一计费 | 部分兼容（需适配） |
| 豆包 Doubao | 强 | 高 | 是 |
| Qwen（通义千问） | 很强 | 高 | 是 |
| GLM-4（智谱） | 不错 | 极高（有免费额度） | 是 |
| DeepSeek | 一般 | 极高 | 是 |
| Moonshot（Kimi） | 好 | 中 | 是 |
