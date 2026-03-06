# 模型配置

## 模型方案总览

| 方案 | 成本 | 特点 | 适用场景 |
|------|------|------|---------|
| **A. Cursor Agent ACP 代理** | 零额外成本 | 复用 Cursor 订阅模型（ACP 常驻进程，2-3秒响应） | 已有 Cursor Pro/Ultra 订阅 |
| **B. 火山引擎（豆包）** | 按量付费 | 国产模型，Tool Use 能力强 | 需独立 API 调用 |
| **C. 其他 OpenAI 兼容** | 按量付费 | Qwen/GLM/DeepSeek 等 | 灵活选择 |
| **D. 企业 AI 网关** | 企业内部 | 统一协议接入多家模型 | 企业内网环境 |

---

## 方案 A: Cursor Agent ACP 代理（推荐，零额外成本）

通过 `openclaw-cursor-brain` 插件或独立的 cursor-proxy，以 **ACP 常驻进程模式**将 Cursor 订阅的模型暴露为 OpenAI 兼容 API。**零额外费用，后续请求 2-3 秒响应。**

### 前提条件

- 已安装 Cursor CLI：`curl https://cursor.com/install -fsS | bash`
- 已登录：`agent login`
- 有 Cursor Pro/Ultra/Teams 订阅

### 架构

```
OpenClaw → cursor-proxy (localhost:18790) → agent acp (常驻进程) → Cursor 模型
```

> 旧方案 llm-proxy 每次请求 spawn 新进程（13-27秒），ACP 模式使用常驻子进程（2-3秒）。

### 方式一：openclaw-cursor-brain 插件（推荐）

插件自动管理 cursor-proxy 生命周期，无需手动启动。

```bash
# 安装插件
export VOLCENGINE_API_KEY=$(security find-generic-password -a "openclaw" -s "VOLCENGINE_API_KEY" -w)
openclaw plugins install openclaw-cursor-brain

# 重启 Gateway
openclaw gateway restart
```

插件会自动：
- 在 `http://127.0.0.1:18790/v1` 启动 ACP proxy
- 注册 `cursor-local` provider 到 `openclaw.json`
- 管理 proxy 生命周期（崩溃自动重启）

### 方式二：独立运行 cursor-proxy

```bash
cd cursor-proxy
CURSOR_WORKSPACE_DIR=~/agent-workspace npm start
```

然后在 `openclaw.json` 的 `models.providers` 下手动配置：

```json
"cursor-local": {
  "baseUrl": "http://127.0.0.1:18790/v1",
  "apiKey": "local",
  "api": "openai-completions",
  "models": [
    { "id": "opus-4.6", "name": "Cursor Agent (Opus 4.6)", "reasoning": false, "input": ["text"], "contextWindow": 128000, "maxTokens": 16384 },
    { "id": "sonnet-4.6", "name": "Cursor Agent (Sonnet 4.6)", "reasoning": false, "input": ["text"], "contextWindow": 128000, "maxTokens": 16384 }
  ]
}
```

在 `agents.defaults.model` 下配置：

```json
{
  "primary": "cursor-local/opus-4.6",
  "fallbacks": ["doubao/doubao-seed-2-0-pro-260215"]
}
```

重启：`openclaw gateway restart`

### 可用模型

通过 `agent --list-models` 查询完整列表，常用模型：

| 模型 ID | 说明 |
|---------|------|
| `opus-4.6` | Claude 4.6 Opus（默认） |
| `gpt-5.2` | GPT-5.2 通用 |
| `sonnet-4.6` | Claude 4.6 Sonnet |
| `gemini-3-flash` | Gemini 3 Flash（快速） |

### 性能对比

| 指标 | llm-proxy（旧，已弃用） | cursor-proxy ACP（新） |
|------|----------------------|----------------------|
| 首次请求 | 13-27秒 | ~20秒（含 session 创建） |
| 后续请求 | 13-27秒（每次冷启动） | **2-3秒** |
| 架构 | 每请求 spawn 新进程 | 一个常驻 `agent acp` 子进程 |

### 验证

```bash
# 检查 ACP proxy 状态
curl -sf http://127.0.0.1:18790/v1/health
# 应返回 "mode": "acp", "acp": { "running": true }
```

详见 [cursor-proxy README](../cursor-proxy/README.md)

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

---

## 方案 D: 企业 AI 网关（WPS）

通过 wps-proxy 将 WPS 内网 AI 网关转换为 OpenAI 兼容接口。**企业内部零成本，适合日常聊天场景。**

### 前提条件

- Node.js >= 18（proxy.mjs 使用原生 fetch）
- 需在公司内网环境，能访问 `ai-gateway.wps.cn`
- 需配置 `WPS_TOKEN` 环境变量
- 需配置 hosts 绑定（测试/线上共用）：

```
120.92.124.158 aigc-gateway-test.ksord.com
120.92.124.158 ai-gateway.wps.cn
120.92.124.158 prompt-server-test.ksord.com
```

### 架构

```
OpenClaw → wps-proxy (localhost:3010) → WPS AI 网关 (ai-gateway.wps.cn)
```

wps-proxy 负责将 OpenAI 格式的请求转换为 WPS 网关 V2 协议（Chat 类接口），并将响应转换回 OpenAI 格式。支持流式/非流式和 Tool Calling 透传。

proxy 内部维护模型 ID 映射，`opus-4.6` 和 `sonnet-4.6` 会分别映射到 WPS 网关的 `claude-opus-4-5` 和 `claude-sonnet-4-5`，使 OpenClaw 两个 provider 之间可以用统一的模型 ID 切换。

### 部署与启动

#### 1. 部署脚本

```bash
cp wps-proxy/proxy.mjs ~/.openclaw/wps-proxy.mjs
```

#### 2. 配置 auth-profiles

在 `~/.openclaw/agents/main/agent/auth-profiles.json` 中添加（如文件不存在则新建）：

```json
{
  "profiles": {
    "wps:default": {
      "type": "api_key",
      "provider": "wps",
      "key": "wps-proxy"
    }
  }
}
```

#### 3. 配置 LaunchAgent（开机自启 + 崩溃重启）

创建 `~/Library/LaunchAgents/ai.openclaw.wps-proxy.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>ai.openclaw.wps-proxy</string>
    <key>Comment</key>
    <string>WPS AI Gateway Proxy</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>5</integer>
    <key>ProgramArguments</key>
    <array>
      <string>/path/to/node</string>
      <string>/Users/<username>/.openclaw/wps-proxy.mjs</string>
    </array>
    <key>StandardOutPath</key>
    <string>/Users/<username>/.openclaw/logs/wps-proxy.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/<username>/.openclaw/logs/wps-proxy.err.log</string>
    <key>EnvironmentVariables</key>
    <dict>
      <key>HOME</key>
      <string>/Users/<username></string>
      <key>PORT</key>
      <string>3010</string>
      <key>WPS_TOKEN</key>
      <string><your-token></string>
    </dict>
  </dict>
</plist>
```

加载服务：

```bash
launchctl load ~/Library/LaunchAgents/ai.openclaw.wps-proxy.plist
```

#### 4. 手动启动（不用 LaunchAgent）

```bash
export WPS_TOKEN=<your-token>
node ~/.openclaw/wps-proxy.mjs
```

通过 `--model` 指定默认模型（不指定则默认 `opus-4.6`）：

```bash
node ~/.openclaw/wps-proxy.mjs --model claude-sonnet-4-5
```

### Provider 配置

在 `openclaw.json` 的 `models.providers` 下添加：

```json
"wps": {
  "baseUrl": "http://127.0.0.1:3010/v1",
  "api": "openai-completions",
  "models": [
    {
      "id": "opus-4.6",
      "name": "Opus 4.6 (WPS)",
      "reasoning": true,
      "input": ["text"],
      "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
      "contextWindow": 200000,
      "maxTokens": 4096
    },
    {
      "id": "sonnet-4.6",
      "name": "Sonnet 4.6 (WPS)",
      "reasoning": true,
      "input": ["text"],
      "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
      "contextWindow": 200000,
      "maxTokens": 4096
    }
  ]
}
```

在 `~/.openclaw/agents/main/agent/models.json` 的 `providers` 中也添加同样的 `wps` 配置（额外加 `"apiKey": "wps-proxy"`）。

> 注意：如果修改了 `PORT`，需要同步更新 `baseUrl` 中的端口号。

### 可用模型

| OpenClaw 模型 ID | WPS 网关模型 | 说明 |
|---------|------|------|
| `opus-4.6` | `claude-opus-4-5` | Claude Opus 4.5（默认） |
| `sonnet-4.6` | `claude-sonnet-4-5` | Claude Sonnet 4.5 |

### 与 Cursor 代理配合：模型切换

WPS 代理（日常聊天）和 Cursor 代理（复杂任务）可同时运行，通过 OpenClaw 命令手动切换：

```bash
# 日常聊天 → WPS（企业内部零成本）
openclaw models set wps/opus-4.6

# 复杂任务 → Cursor（强推理 + 深度工具调用）
openclaw models set cursor-local/opus-4.6

# 查看当前使用的模型
openclaw models status
```

也可通过 OpenClaw Dashboard（`http://<Mac-IP>:18789`）在 Web UI 上切换。

### LaunchAgent 管理命令

```bash
# 停止
launchctl unload ~/Library/LaunchAgents/ai.openclaw.wps-proxy.plist

# 启动
launchctl load ~/Library/LaunchAgents/ai.openclaw.wps-proxy.plist

# 查看状态
launchctl list | grep wps-proxy

# 查看日志
tail -f ~/.openclaw/logs/wps-proxy.log
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3010` | 监听端口 |
| `WPS_GATEWAY_URL` | `http://ai-gateway.wps.cn/api/v2/llm/chat` | 网关地址 |
| `WPS_TOKEN` | **必须配置** | Bearer Token |
| `WPS_UID` | `9010` | AI-Gateway-Uid |
| `WPS_PRODUCT` | `kdocs-as-baseserver` | AI-Gateway-Product-Name |
| `WPS_INTENTION` | `kdocs_as_assistant_intentrecognize` | AI-Gateway-Intention-Code |

详见 [wps-proxy README](../wps-proxy/README.md)

---

## 模型提供商对比

| 模型提供商 | Tool Use 能力 | 性价比 | OpenAI 兼容 |
|-----------|-------------|--------|-----------|
| **Cursor Agent ACP 代理** | 极强（GPT-5/Claude 4.6） | **零额外成本** | 是（via cursor-proxy ACP） |
| **WPS AI 网关** | 取决于后端模型（Claude 4.5） | **企业内部零成本** | 是（via wps-proxy） |
| 豆包 Doubao | 强 | 高 | 是 |
| Qwen（通义千问） | 很强 | 高 | 是 |
| GLM-4（智谱） | 不错 | 极高（有免费额度） | 是 |
| DeepSeek | 一般 | 极高 | 是 |
| Moonshot（Kimi） | 好 | 中 | 是 |
