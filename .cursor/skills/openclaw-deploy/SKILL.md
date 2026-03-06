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

安装路径：

| 组件 | 路径 |
|------|------|
| 配置文件 | `~/.openclaw/openclaw.json` |
| Agent 工作区 | `~/agent-workspace/` |
| LaunchAgent | `~/Library/LaunchAgents/ai.openclaw.gateway.plist` |
| 日志 | `~/.openclaw/logs/gateway.log` |

更新：`npm update -g openclaw && openclaw gateway restart`

## Phase 2: 选择模型方案

提供以下方案，向用户说明后让其选择。

### 方案 A: Cursor Agent ACP 代理（推荐，零额外成本）

通过 `openclaw-cursor-brain` 插件，以 **ACP 常驻进程模式**使用 Cursor 订阅的顶级模型。**零额外费用，后续请求 2-3 秒响应，每月节省 200U+。**

#### A.1 安装并登录 Cursor Agent CLI

```bash
# 检查是否已装
which agent && agent --version
# 未安装则安装
curl https://cursor.com/install -fsS | bash
# 登录
agent login
# 验证可用模型
agent --list-models
```

#### A.2 安装 openclaw-cursor-brain 插件

```bash
# 先 export Keychain 密钥（openclaw CLI 不自动加载）
export VOLCENGINE_API_KEY=$(security find-generic-password -a "openclaw" -s "VOLCENGINE_API_KEY" -w)
export OPENCLAW_GATEWAY_TOKEN=$(security find-generic-password -a "openclaw" -s "OPENCLAW_GATEWAY_TOKEN" -w)

# 安装插件
openclaw plugins install openclaw-cursor-brain

# 重启 Gateway
openclaw gateway restart
```

插件自动完成：
- 启动 ACP proxy（`agent acp` 常驻进程，`http://127.0.0.1:18790/v1`）
- 注册 `cursor-local` provider
- 管理 proxy 生命周期（崩溃自动重启）

#### A.3 配置模型

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "cursor-local/opus-4.6",
        "fallbacks": ["doubao/doubao-seed-2-0-pro-260215"]
      },
      "subagents": {
        "model": "cursor-local/opus-4.6"
      }
    }
  },
  "plugins": {
    "entries": {
      "openclaw-cursor-brain": {
        "enabled": true,
        "config": {
          "model": "opus-4.6",
          "fallbackModel": "sonnet-4.6"
        }
      }
    }
  }
}
```

**推荐多角色模型分配**：

| 角色 | 配置路径 | 推荐模型 | 理由 |
|------|---------|---------|------|
| 对话（主模型） | `agents.defaults.model` | `cursor-local/opus-4.6` | 面对用户，质量优先 |
| 开发（子代理） | `agents.defaults.subagents.model` | `cursor-local/opus-4.6` | 代码质量优先（走订阅无额外成本） |
| 心跳（定时检查） | `agents.defaults.heartbeat.model` | `ollama/qwen2.5:3b` | 本地模型，零成本 |

验证：

```bash
# 检查 ACP proxy 状态
curl -sf http://127.0.0.1:18790/v1/health
# 应返回 "mode": "acp", "acp": { "running": true }

# 测试模型响应
openclaw agent --agent main --message "你好" --json
```

常用模型（通过 `agent --list-models` 查询完整列表）：

| 模型 ID | 说明 |
|---------|------|
| `opus-4.6` | Claude 4.6 Opus（默认） |
| `gpt-5.2` | GPT-5.2 通用 |
| `sonnet-4.6` | Claude 4.6 Sonnet |
| `gemini-3-flash` | Gemini 3 Flash（快速） |

> **ACP vs 旧 llm-proxy**：旧方案每次 spawn 新进程（13-27秒），ACP 模式使用常驻子进程（2-3秒）。
> 独立运行 cursor-proxy 详见 [cursor-proxy README](../../cursor-proxy/README.md)。

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

AI 网关的 Chat 接口不是标准 OpenAI 格式，需配置自定义 provider：

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

> ⚠️ AI 网关与 OpenAI 标准协议存在差异（自定义 header、部分字段不同），实际接入时需验证兼容性。如不兼容，可编写适配层。

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

### 安装 Node Host（Agent shell 执行能力）

Node Host 为 Agent 提供本机 shell 执行能力。**不安装此服务，Agent 无法执行任何命令行操作**（包括 `mcporter call`、`curl`、文件操作等）。

```bash
openclaw node install    # 安装并启动
openclaw node status     # 验证运行中
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

### Agentspace 渠道（数字员工 / 企业协作 IM）

Agentspace 是金山办公的数字员工开发平台，通过 WebSocket 将 OpenClaw Agent 接入企业协作 IM，让同事可以直接在 IM 里与 Agent 对话。

#### 4.1 安装 Agentspace 插件

插件包 `@ecis/agentspace` 托管在**内网云枢 npm**（`registry.npm.wps.cn`），公网 `npmjs.com` 上找不到。

**方式一：通过 openclaw plugins install（推荐）**

```bash
openclaw plugins install @ecis/agentspace@latest
```

OpenClaw 会自动从云枢 registry 下载并安装。安装完成后需要重启 Gateway：

```bash
openclaw gateway restart
```

**方式二：手动下载 tgz 安装（云枢 npm 不可用时）**

1. 从文档附件下载 `ecis-agentspace-1.0.8.tgz`（或在云枢网站搜索 `@ecis/agentspace`）
2. 解压到任意目录（如 `~/Downloads`）：

```bash
cd ~/Downloads && tar xzf ecis-agentspace-1.0.8.tgz
# 解压后会生成 package/ 目录，内含 openclaw.plugin.json
```

3. 使用 OpenClaw 向导安装（需要在解压目录的**父目录**下执行）：

```bash
cd ~/Downloads && openclaw setup --wizard
# 向导中选择 Channels → Agentspace → "Use local plugin path" → 选 Yes
```

#### 4.2 配置 Agentspace 频道

安装插件后，通过交互式向导完成频道配置。**以下步骤均为终端交互操作，无法脚本自动化**：

```bash
# 停止后台 Gateway，以前台模式启动向导
openclaw gateway stop
openclaw gateway
```

向导中的关键选择：

| 步骤 | 操作 |
|------|------|
| 选择 Gateway 模式 | `Local` |
| 选择 Channels | `Configure/link` → `Agentspace` |
| WPS OAuth 登录 | 扫码或账号登录 WPS，完成 OAuth 授权 |
| DM Policy | 选 `Open`（允许所有人私聊） |

完成后向导会自动将 Agentspace 频道配置写入 `~/.openclaw/openclaw.json`。

#### 4.3 启动并验证

```bash
# 重新以后台模式启动
openclaw gateway install    # 安装 LaunchAgent
openclaw node install       # 安装 Node Host（如未安装）
sleep 3
openclaw status             # 应显示 agentspace 频道在线
```

验证成功后，在 Agentspace 协作 IM 中应能看到 OpenClaw 数字员工上线，可以直接发消息对话。

#### 4.4 常见问题

| 问题 | 解决 |
|------|------|
| `npm install -g @ecis/agentspace` 报 E404 | 包在内网云枢，用 `openclaw plugins install` 或手动 tgz 安装 |
| `pairing required` ws 断开 | 重新运行 `openclaw setup --wizard` 完成配对 |
| `openclaw.plugin.json not found` | 确保在 tgz 解压后的 `package/` 目录的父目录下执行向导 |
| 插件安装后配置被覆盖 | 插件安装会备份 `openclaw.json`（`.bak`），检查并恢复自定义配置 |

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

## Phase 6: MCP 工具集成（可选）

为 OpenClaw Agent 接入 MCP 工具，扩展其能力边界。分为两类：

- **远程 MCP**（HTTP transport）：通过 mcporter 连接
- **本地 MCP**（stdio/command）：写入 Agent 工作区的 `.cursor/mcp.json`

### 推荐 MCP 清单

向用户展示以下清单，让用户按需选择要安装的 MCP：

| MCP | 用途 | 接入方式 | 需要的凭证 |
|-----|------|---------|-----------|
| `kad` (企业知识库) | 查询企业 wiki、技术文档、API 规范 | HTTP | `cookie`（wps_sid + kso_sid） |
| `playwright` | 浏览器自动化、网页测试、截图 | stdio (npx) | 无 |
| 自定义远程 MCP | 用户自己的 MCP 服务 | HTTP | 用户提供 URL |

> 以下 MCP 不推荐给 OpenClaw 使用（原因见括号）：
> - `figma-desktop`（需要 Figma 桌面端运行，Agent 无法使用 GUI）
> - `pencil`（Cursor IDE 扩展专用）
> - `interactive-feedback-mcp`（Cursor IDE 专用交互，OpenClaw 有自己的频道机制）
> - `whistle-mcp`（代理调试工具，不适合 Agent 日常使用）

### 安装流程

通过 `mcporter config add --scope home` 注册到系统级配置（`~/.mcporter/mcporter.json`），OpenClaw 会自动发现。

> **注意**：不要用 `~/agent-workspace/.cursor/mcp.json`，那是 Cursor IDE 格式，OpenClaw 不读取。OpenClaw 通过 mcporter 管理 MCP 服务。

#### 6.1 kad（企业知识库）

**向用户索取凭证**：需要 `wps_sid` 和 `kso_sid`。告知用户获取方式：

> 打开浏览器 → 登录 WPS 网页版 → F12 开发者工具 → Application → Cookies → 复制 `wps_sid` 和 `kso_sid` 的值。

获取到 cookie 后注册（**禁止将 cookie 值硬编码到任何代码或文档中**）：

```bash
npx mcporter config add kad \
  --url "http://kmcp.wps.cn/kad/wiki/mcp" \
  --header "cookie=wps_sid=<用户的wps_sid值>;kso_sid=<用户的kso_sid值>" \
  --scope home
```

验证：

```bash
npx mcporter list kad --schema
```

#### 6.2 playwright（浏览器自动化）

无需凭证：

```bash
npx mcporter config add playwright \
  --command npx --arg "@playwright/mcp@latest" \
  --scope home
```

#### 6.3 自定义远程 MCP

向用户询问服务名称、URL、认证方式：

```bash
npx mcporter config add <service-name> --url <url> --scope home
# 如需认证 header：
npx mcporter config add <service-name> --url <url> --header "Authorization=Bearer <token>" --scope home
```

#### 6.4 授权 Agent 执行 mcporter

OpenClaw Agent 的 shell 默认禁止执行未授权的命令。必须将 `mcporter` 加入 exec allowlist：

```bash
openclaw approvals allowlist add "$(which mcporter)"
# 可选：授权其他常用命令
openclaw approvals allowlist add "/usr/bin/curl"
openclaw approvals allowlist add "$(which gh)"
openclaw approvals allowlist add "$(which node)"
```

#### 6.5 验证所有 MCP

```bash
mcporter list                        # 查看所有已注册 MCP
openclaw gateway restart             # 重启让 OpenClaw 加载
```

### 安装后

必须在 Agent 工作区文件中注册已安装的 MCP，否则 Agent 不知道工具的存在：

#### 更新 `~/agent-workspace/TOOLS.md`

在「MCP 工具」章节中，为每个已安装的 MCP 添加：
- 工具名称和用途
- **调用链路**（按顺序应该怎么调用）
- 参数说明

以 kad 为例，关键是写清楚调用链路：

```
1. 从 URL 提取 link_id（https://365.kdocs.cn/l/<link_id>）
2. get_drive_info_by_link_id(link_id) → 获取 drive_id, file_id
3. get_file_info_by_id(drive_id, file_id, include_elements: ["content"]) → 获取全文
4.（可选）search_wiki_detail_with_brief(query, drives) → 搜索特定内容
```

#### 更新 `~/agent-workspace/AGENTS.md`

添加触发规则，告诉 Agent 什么时候用什么工具。例如：

```
当用户发来金山文档链接（365.kdocs.cn / kdocs.cn）时：
1. 提取 link_id
2. 调用 kad MCP 获取文档内容
3. 根据意图处理
```

> **重要**：仅在 mcp.json 中配置 MCP 是不够的。Agent 需要通过 TOOLS.md 了解工具能力，通过 AGENTS.md 知道触发条件。缺少任一项，Agent 都不会主动使用该 MCP。

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

本 skill 的方案 A（Cursor Agent ACP 代理）就是这一策略的实践——通过 ACP 常驻进程复用 Cursor 订阅的模型能力，对话和开发任务都不额外计费。

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

## Phase 9: 安装 Agent Skills

将本项目中的通用 Skills 安装到 Agent 工作区，让 OpenClaw Agent 具备需求分析、计划制定、调试、知识库查询、代码校验、成本优化等能力。

> **重要**：OpenClaw 的 skill 放在工作区的 `skills/` 目录下（**不是** `.cursor/skills/`）。格式与 Cursor skill 兼容（都是 SKILL.md），但目录位置不同。

```bash
# 创建 skills 目录（OpenClaw 原生路径）
mkdir -p ~/agent-workspace/skills

# 从本项目复制通用 skills（排除 openclaw-deploy 和 mermaid-chart）
SKILL_SRC="<本项目路径>/.cursor/skills"
for skill in brainstorming writing-plans systematic-debugging requirement-extraction knowledge-base-query code-validation token-optimization; do
  cp -r "$SKILL_SRC/$skill" ~/agent-workspace/skills/
done
```

> Agent 执行时应自动完成：读取本项目 `.cursor/skills/` 目录，将下表中的 skills 复制到 `~/agent-workspace/skills/`。

安装的 Skills 清单：

| Skill | 用途 | 触发场景 |
|-------|------|---------|
| `brainstorming` | 需求澄清、方案探索 | "帮我设计一下…"、"我有个想法" |
| `writing-plans` | 拆解实施计划 | "帮我制定计划"、"拆解任务" |
| `systematic-debugging` | 系统化调试 | 遇到 bug、测试失败 |
| `requirement-extraction` | 需求提炼为结构化文档 | 收到文档链接、口头描述 |
| `knowledge-base-query` | 查询企业知识库 | 不确定的技术问题、API 用法 |
| `code-validation` | 代码安全校验 | 提交代码前自查安全红线 |
| `token-optimization` | Token 成本分析与优化 | "查看 token 消耗"、"优化成本" |

不安装的 Skills（仅供部署使用或特定用途）：

| Skill | 原因 |
|-------|------|
| `openclaw-deploy` | 部署指南，给人看的，Agent 自己不需要 |
| `mermaid-chart` | 仅控制图表样式，日常对话用不上，避免增加上下文 |

### 注册 Skills 到 AGENTS.md

**必须执行此步骤**，否则 Agent 不知道有哪些 skill 可用。

在 `~/agent-workspace/AGENTS.md` 中添加「技能库」章节，包含一张索引表：

```markdown
## 技能库

`skills/` 目录下有可复用的技能指南（OpenClaw 原生 skill 格式）。遇到对应场景时，先读取 SKILL.md 再按流程执行。

可用 `openclaw skills list` 查看所有已安装技能。自定义技能列表：

| 技能 | 路径 | 何时使用 |
|------|------|---------|
| 需求头脑风暴 | `skills/brainstorming/SKILL.md` | 用户提出新需求、功能讨论 |
| 实施计划拆解 | `skills/writing-plans/SKILL.md` | 多步骤实现、拆解任务 |
| 系统化调试 | `skills/systematic-debugging/SKILL.md` | bug、测试失败、异常行为 |
| 需求提炼 | `skills/requirement-extraction/SKILL.md` | 文档链接、整理需求 |
| 知识库查询 | `skills/knowledge-base-query/SKILL.md` | 不确定的技术问题 |
| 代码安全校验 | `skills/code-validation/SKILL.md` | 提交前检查、安全审计 |
| Token 成本优化 | `skills/token-optimization/SKILL.md` | 查看消耗、优化成本 |

使用规则：
- 每次都要重新读取 SKILL.md（内容可能已更新）
- 一次只执行一个技能
```

验证安装：

```bash
openclaw skills list | grep "openclaw-workspace"
# 应显示 7 个 ready 的 workspace skill
```

> **关键区别**：
> - OpenClaw 的 skill 放在 `~/agent-workspace/skills/`（**不是** `.cursor/skills/`）
> - OpenClaw 会自动扫描 `skills/` 目录并根据 SKILL.md 的 description 匹配触发条件
> - 但仍建议在 `AGENTS.md` 中建立索引表，帮助 Agent 更准确地选择技能

## Phase 10: 验证

```bash
openclaw health        # 健康检查
openclaw status        # 频道与会话状态
openclaw models list   # 已配置模型
openclaw dashboard     # 打开 Dashboard
```

## Agent 工作区

`~/agent-workspace/` 目录下的核心文件：

| 文件/目录 | 作用 |
|----------|------|
| `SOUL.md` | 人格定义（角色、语调） |
| `USER.md` | 用户信息 |
| `AGENTS.md` | 行为规则 |
| `TOOLS.md` | 工具使用说明 |
| `HEARTBEAT.md` | 心跳任务清单 |
| `memory/` | 每日记忆文件 |
| `skills/` | Agent 技能库（Phase 9 安装，7 个通用 skill，OpenClaw 原生格式） |

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
