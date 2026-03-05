---
name: openclaw-deploy
description: 部署 OpenClaw 数字员工的完整流程。包含安装、模型配置（Cursor Agent 代理/火山引擎/企业AI网关/其他）、Gateway、iMessage、TTS、MCP 工具、记忆系统、Token 成本优化等。当用户说"部署 openclaw"、"安装 openclaw"、"配置 openclaw"、"切换模型方案"、"接入AI网关"、"降低 token 成本"、"优化成本"时使用。
---

# OpenClaw 完整部署指南

## 前置条件

- macOS（推荐，iMessage 等功能依赖 macOS）
- Node.js >= 20、npm
- cmake（`brew install cmake`，node-llama-cpp 编译依赖）

## Phase 1: 安装 OpenClaw

```bash
# 安装
npm install -g openclaw   # nvm 环境无需 sudo
# 或
sudo npm install -g openclaw   # 系统 node 需 sudo

# 初始化
openclaw setup
openclaw onboard   # 交互式向导，需用户在终端中手动操作
```

`onboard` 向导中的关键决策点：

| 提示 | 推荐选择 | 说明 |
|------|---------|------|
| Personal-by-default, continue? | `Yes` | OpenClaw 默认个人使用模式，多用户/共享场景需额外 lock-down |
| Gateway 运行方式 | `Local` | 本地运行，不使用云端 |
| Channels 配置 | 按需选择或跳过 | iMessage / Agentspace 等，可后续再配置 |
| Model 选择 | **直接退出向导（Ctrl+C）** | 不需要在向导中配置模型，Phase 2 会直接写入 openclaw.json |

### 安装 llm-proxy

将本 skill 目录下的 `llm-proxy/` 复制到 `~/.openclaw/llm-proxy/`，与 OpenClaw 配置统一管理：

```bash
# 复制到 OpenClaw 配置目录
cp -r <本skill路径>/llm-proxy ~/.openclaw/llm-proxy

# 修改 server.js 中 CONFIG.agentPath 为本机 agent 路径
AGENT_BIN=$(which agent)
if [ -n "$AGENT_BIN" ]; then
  sed -i '' "s|agentPath:.*|agentPath: process.env.AGENT_PATH \|\| '$AGENT_BIN',|" ~/.openclaw/llm-proxy/server.js
  echo "agentPath 已设为 $AGENT_BIN"
fi
```

> Agent 执行时应自动完成上述步骤：读取 `which agent` 获取路径，修改 `server.js` 中的 `CONFIG.agentPath`，然后复制整个 `llm-proxy/` 到 `~/.openclaw/llm-proxy/`。

环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | llm-proxy 服务端口 |
| `DEFAULT_MODEL` | opus-4.6 | 默认模型 |
| `AGENT_PATH` | `~/.local/bin/agent` | agent CLI 路径（Phase 1 自动检测） |
| `AGENT_CWD` | `$HOME` | Agent 默认工作目录，推荐设为 `~/clawd` 或常用项目目录 |

> llm-proxy 支持请求级动态 cwd：OpenClaw 可在请求体中传入 `cwd` 字段，Agent 会以该目录为工作目录启动。未传时使用 `AGENT_CWD`，未设环境变量时使用 `$HOME`。

安装路径：

| 组件 | 路径 |
|------|------|
| 配置文件 | `~/.openclaw/openclaw.json` |
| llm-proxy | `~/.openclaw/llm-proxy/` |
| Agent 工作区 | `~/clawd/` |
| LaunchAgent | `~/Library/LaunchAgents/ai.openclaw.gateway.plist` |
| 日志 | `~/.openclaw/logs/gateway.log` |

更新：`npm update -g openclaw && openclaw gateway restart`

## Phase 2: 选择模型方案

提供以下方案，向用户说明后让其选择。

### 方案 A: Cursor Agent 代理（推荐，零额外成本）

复用企业 Cursor 账号的模型能力，通过 llm-proxy 转发。**无需 API Key，每月节省 200U+。**

#### A.1 安装并登录 Cursor Agent CLI

```bash
which agent && agent --version   # 检查是否已装
agent login                       # 登录
agent models                      # 验证可用模型
```

#### A.2 启动 llm-proxy

llm-proxy 已在 Phase 1 安装到 `~/.openclaw/llm-proxy/`。

```bash
cd ~/.openclaw/llm-proxy
npm start
# 自定义端口/模型/工作目录：
# PORT=8080 DEFAULT_MODEL=opus-4.6 AGENT_CWD=~/clawd npm start
```

验证：

```bash
curl http://localhost:3000/health
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"opus-4.6","messages":[{"role":"user","content":"hi"}],"stream":false}'
```

建议用 pm2 或 LaunchAgent 守护 llm-proxy 进程。

#### A.3 配置 openclaw.json

在 `~/.openclaw/openclaw.json` 中添加 provider 和默认模型。

**推荐多角色模型分配**（不同场景使用不同模型以平衡质量与成本）：

| 角色 | 配置路径 | 推荐模型 | 理由 |
|------|---------|---------|------|
| 对话（主模型） | `agents.defaults.model` | `opus-4.6` | 面对用户，质量优先 |
| 开发（子代理） | `agents.defaults.subagents.model` | `opus-4.6` | 代码质量优先（走订阅无额外成本） |
| 心跳（定时检查） | `agents.defaults.heartbeat.model` | 本地模型 / `gemini-3-flash` | 轻量任务，避免消耗云端配额 |

```json
{
  "models": {
    "providers": {
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
          },
          {
            "id": "gemini-3-flash",
            "name": "Gemini 3 Flash (via Cursor Agent)",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 128000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "local-agent-proxy/opus-4.6"
      },
      "heartbeat": {
        "model": "local-agent-proxy/gemini-3-flash"
      },
      "subagents": {
        "model": "local-agent-proxy/opus-4.6"
      }
    }
  }
}
```

> 心跳模型建议优先用本地模型（见 Phase 9 成本优化），无本地模型时可用 `gemini-3-flash` 过渡。

常用模型（通过 `agent models` 查询完整列表）：

| 模型 ID | 说明 |
|---------|------|
| `opus-4.6` | Claude 4.6 Opus（默认） |
| `gpt-5.2` | GPT-5.2 通用 |
| `sonnet-4.6` | Claude 4.6 Sonnet |
| `gemini-3-flash` | Gemini 3 Flash（快速） |

### 方案 B: 火山引擎（豆包 Doubao）

按量付费，API Key 通过环境变量注入，禁止硬编码。

```json
{
  "models": {
    "providers": {
      "doubao": {
        "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
        "apiKey": "<从环境变量获取>",
        "api": "openai-completions",
        "models": [
          { "id": "<endpoint-id>", "name": "Doubao 1.5 Pro", "reasoning": false, "input": ["text"], "contextWindow": 32768, "maxTokens": 12288 },
          { "id": "<endpoint-id>", "name": "Doubao 1.5 Lite", "reasoning": false, "input": ["text"], "contextWindow": 32768, "maxTokens": 4096 }
        ]
      }
    }
  }
}
```

### 方案 C: 其他 OpenAI 兼容提供商

| 提供商 | baseUrl | 特点 |
|--------|---------|------|
| Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` | Tool Use 很强 |
| GLM-4 | `https://open.bigmodel.cn/api/paas/v4` | 有免费额度 |
| DeepSeek | `https://api.deepseek.com/v1` | 极高性价比 |
| SiliconFlow | `https://api.siliconflow.cn/v1` | 免费额度 |

配置格式与方案 B 相同，替换 `baseUrl` 和 `apiKey`。

### 方案 D: 企业 AI 网关（内网统一入口）

使用公司内部 AI 网关（ai-gateway.wps.cn），统一协议接入多家模型，无需各自申请 API Key。适合企业内部使用。

**前提**：需申请网关接入参数（appid + apikey），参见内部文档《网关参数申请指引》。

#### 环境地址

| 环境 | 地址 |
|------|------|
| 测试/线上 | `ai-gateway.wps.cn` |
| 海外新加坡 | `aigc-gateway-sg.ksord.com` |
| 海外美国 | `aigc-gateway-us.ksord.com` |
| 海外欧洲 | `aigc-gateway-eu.ksord.com` |

#### 接口类型

网关 V2 提供统一协议，按类型归类：

| 类型 | API | 说明 |
|------|-----|------|
| Chat | `/api/v2/llm/chat` | 对话（OpenClaw 主要使用） |
| Multimodal | `/api/v2/llm/multimodal` | 多模态 |
| Completions | `/api/v2/llm/completions` | 补全 |
| Embedding | `/api/v2/llm/embedding` | 向量嵌入（记忆系统可用） |
| TTS | `/api/v2/tts/base` | 语音合成 |
| ASR | `/api/v2/asr/audio2text` | 语音识别 |

#### 请求头

| Header | 说明 |
|--------|------|
| `Content-Type` | `application/json` |
| `AI-Gateway-Appid` | 网关分配的 appid |
| `AI-Gateway-Apikey` | 网关分配的 apikey（从环境变量获取，禁止硬编码） |

#### 配置 openclaw.json

AI 网关的 Chat 接口不是标准 OpenAI 格式，需通过 llm-proxy 适配或直接配置自定义 provider：

```json
{
  "models": {
    "providers": {
      "ai-gateway": {
        "baseUrl": "https://ai-gateway.wps.cn/api/v2/llm",
        "apiKey": "<从环境变量获取 AI-Gateway-Apikey>",
        "api": "openai-completions",
        "headers": {
          "AI-Gateway-Appid": "<从环境变量获取>"
        },
        "models": [
          {
            "id": "doubao-1.5-pro",
            "name": "Doubao 1.5 Pro (via AI Gateway)",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 32768,
            "maxTokens": 12288
          }
        ]
      }
    }
  }
}
```

> ⚠️ AI 网关与 OpenAI 标准协议存在差异（自定义 header、部分字段不同），实际接入时需验证兼容性。如不兼容，可编写适配层或扩展 llm-proxy 支持网关协议。

#### 参考文档

- 《网关V2版本接入说明书》：https://365.kdocs.cn/l/cfLgpiiUj8Sq
- 《AI应用接入AI网关说明文档》（内部）

## Phase 3: 启动 Gateway

```bash
openclaw gateway            # 首次启动
openclaw gateway restart    # 重启
openclaw gateway --force    # 强制启动（杀占用端口的进程）
```

Gateway 配置（`~/.openclaw/openclaw.json` 的 `gateway` 字段）：

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| `port` | 监听端口 | 18789 |
| `bind` | 绑定范围 | `loopback`（仅本机）或 `lan`（局域网） |
| `auth.mode` | 认证 | `token` |

LaunchAgent 管理（开机自启）：

```bash
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist    # 启动
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist  # 停止
```

Dashboard：`openclaw dashboard`

## Phase 4: 频道配置（可选）

### iMessage

在 `openclaw onboard` 向导中配置，或手动编辑 `channels.imessage`：

| 参数 | 说明 |
|------|------|
| `cliPath` | imsg CLI 路径 |
| `dbPath` | `~/Library/Messages/chat.db` |
| `dmPolicy` | `pairing`（配对授权）或 `open` |

macOS 权限需求：
- `/usr/local/bin/node` 需 Full Disk Access（读取 chat.db）
- Automation 权限（控制 Messages.app 发送消息）

⚠️ **Apple ID 冲突**：Mac 与 iPhone 同一 Apple ID 会导致消息循环，需分开。

### Agentspace 渠道（企业协作 IM）

安装 Agentspace 插件（内网云枢 npm）：

```bash
npm install -g @ecis/agentspace
```

配置流程：`openclaw onboard` → Channels → Agentspace → WPS OAuth 登录 → DM Policy 选 Open。

## Phase 5: TTS 语音（可选）

```json
{
  "messages": {
    "tts": {
      "auto": "off",
      "provider": "edge",
      "edge": {
        "voice": "zh-CN-XiaoyiNeural",
        "lang": "zh-CN"
      }
    }
  }
}
```

provider 选项：`edge`（免费）、`elevenlabs`（付费高质量）、`openai`

## Phase 6: MCP 远程工具（可选）

通过 mcporter 连接远程 MCP 服务：

```bash
npx mcporter config add <service-name> --url http://<remote-host>:<port>/mcp --scope home
npx mcporter list <service-name> --schema   # 验证
```

在 `~/clawd/TOOLS.md` 中记录工具信息，`~/clawd/AGENTS.md` 中添加使用规则。

## Phase 7: 记忆系统（可选）

### Embedding 配置（记忆搜索依赖）

推荐本地 Ollama（免费）：

```bash
brew install ollama
ollama serve
ollama pull nomic-embed-text
```

在 `openclaw.json` 中配置：

```json
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "provider": "openai",
        "model": "nomic-embed-text",
        "remote": {
          "baseUrl": "http://127.0.0.1:11434/v1",
          "apiKey": "ollama"
        }
      }
    }
  }
}
```

重建索引：`openclaw gateway restart && openclaw memory index --force`

验证：`openclaw memory status`

## Phase 8: Token 成本优化

OpenClaw 每轮对话的 Token 消耗来自：系统提示词 + 工作区文件 + 对话历史 + 工具输出 + 本轮问题。以下四种方法可在不牺牲性能的前提下将成本降至十倍以下。

### 优化一：QMD 本地知识库（减少上下文注入）

QMD（Quick Markdown Documents）在本地建立 Markdown 知识库索引，仅向云端注入与当前问题相关的片段，而非全量注入工作区文件。索引构建和向量更新完全在本地执行，不消耗云端 Token。

```bash
openclaw qmd init           # 初始化知识库
openclaw qmd index           # 构建索引
openclaw qmd search "关键词"  # 测试搜索
```

通过三个参数精准控制成本预算：

| 参数 | 说明 |
|------|------|
| `maxChunks` | 每次注入的最大片段数 |
| `maxChars` | 每次注入的最大字符数 |
| `threshold` | 相关性阈值，低于此值的片段不注入 |

### 优化二：本地模型跑心跳（避免高频消耗云端配额）

心跳是 OpenClaw 定时触发的完整 Agent 回合（默认每 30 分钟一次），用于检查 `HEARTBEAT.md` 中的待办任务。高频心跳会产生大量 Token 消耗。

**推荐用本地小模型跑心跳**，完全零成本：

```bash
# 安装 Ollama
brew install --cask ollama
# 启动 Ollama（或打开 Ollama.app）
ollama serve
# 拉取轻量模型（约 2GB）
ollama pull qwen2.5:3b
```

在 `openclaw.json` 中添加 Ollama provider 并配置心跳模型：

```json
{
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "http://127.0.0.1:11434/v1",
        "apiKey": "ollama",
        "api": "openai-completions",
        "models": [
          {
            "id": "qwen2.5:3b",
            "name": "Qwen 2.5 3B (本地)",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 32768,
            "maxTokens": 4096
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "heartbeat": {
        "model": "ollama/qwen2.5:3b",
        "lightContext": true
      }
    }
  }
}
```

> `lightContext: true` 使心跳回合仅加载 `HEARTBEAT.md`，不加载完整工作区上下文，进一步减少 Token 消耗。

### 优化三：优先使用订阅而非 API 用量

如果同时拥有模型提供商的订阅和 API 配额（如 OpenAI Plus/Pro 订阅、Cursor 企业订阅），优先通过订阅通道使用，避免 API 按量计费导致账单暴涨。

本 skill 的方案 A（Cursor Agent 代理）就是这一策略的实践——通过 llm-proxy 复用 Cursor 企业订阅的模型能力，对话和开发任务都不额外计费。

### 优化四：生成成本体检报告

让 OpenClaw 自身分析 Token 消耗，找出不合理的配置和流程浪费：

```bash
# 查看 Token 消耗概况
openclaw status --deep
# 查看会话级消耗
openclaw sessions list --verbose
```

从两个维度优化：

| 维度 | 优化方向 | 示例 |
|------|---------|------|
| **流程** | 改轮询为事件触发 | 心跳任务如果只是检查"有无新消息"，改用 webhook 触发而非定时轮询 |
| **模型** | 轻任务用便宜/小模型 | 简单格式化、翻译等任务不需要 Opus，用 Flash 或本地模型 |

### 成本优化总结

| 方法 | 原理 | 节省幅度 |
|------|------|---------|
| QMD 本地知识库 | 减少每轮上下文注入量 | 显著减少输入 Token |
| 本地模型跑心跳 | 高频定时任务零云端消耗 | 心跳成本降至 0 |
| 优先订阅通道 | 走固定费用而非按量 API | 对话/开发成本降至 0（方案 A） |
| 成本体检报告 | 找出浪费点，针对性优化 | 因人而异 |

## Phase 9: 验证

```bash
openclaw health        # 健康检查
openclaw status        # 频道与会话状态
openclaw models list   # 已配置模型
openclaw dashboard     # 打开 Dashboard
```

## Agent 工作区

`~/clawd/` 目录下的核心文件：

| 文件 | 作用 |
|------|------|
| `SOUL.md` | 人格定义（角色、语调） |
| `USER.md` | 用户信息 |
| `AGENTS.md` | 行为规则 |
| `TOOLS.md` | 工具使用说明 |
| `HEARTBEAT.md` | 心跳任务清单 |
| `memory/` | 每日记忆文件 |

## 故障排查

| 问题 | 解决 |
|------|------|
| cmake 找不到 | `brew install cmake` |
| agent Workspace Trust | server.js 中已添加 `--trust`，或手动传 `--trust` / `-f` |
| Gateway 端口被占 | `openclaw gateway --force` |
| Dashboard "gateway token missing" | 用 `openclaw dashboard` 打开（自动带 token），不要直接访问裸 URL |
| Dashboard origin 不允许 | 添加 IP 到 `gateway.controlUi.allowedOrigins` |
| iMessage 消息循环 | `openclaw config set channels.imessage.enabled false && openclaw gateway restart` |
| Embedding 未工作 | 确认 Ollama 运行中 `curl http://127.0.0.1:11434/api/tags` |

## 详细文档

- [安装与迁移](../../docs/01-installation.md)
- [模型配置](../../docs/02-models.md)
- [Gateway 与 Dashboard](../../docs/03-gateway.md)
- [iMessage](../../docs/04-imessage.md)
- [TTS](../../docs/05-tts.md)
- [MCP 工具](../../docs/06-mcp-integration.md)
- [Agent 人格](../../docs/07-agent-persona.md)
- [记忆系统](../../docs/08-memory.md)
- [故障排查](../../docs/09-troubleshooting.md)
