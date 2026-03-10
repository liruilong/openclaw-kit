# 当前配置快照

> 截取于 2026-03-10（v3），企业 AI 网关 V3 协议（OpenAI 兼容，14 模型）为唯一模型来源 + 工具安全策略。

## openclaw.json

```json
{
  "meta": {
    "lastTouchedVersion": "2026.3.2",
    "lastTouchedAt": "2026-03-09T00:00:00.000Z"
  },
  "models": {
    "mode": "merge",
    "providers": {
      "gateway": {
        "baseUrl": "http://127.0.0.1:<proxy-port>/v1",
        "api": "openai-completions",
        "comment": "V3 协议 — proxy 层 14 模型，OpenClaw 注册 12 个（Claude/GPT-5/Gemini/DeepSeek），零成本",
        "models": [
          { "id": "claude-opus-4-6", "name": "Claude Opus 4.6 (企业网关)", "reasoning": true, "contextWindow": 200000, "maxTokens": 16384 },
          { "id": "claude-opus-4-5", "name": "Claude Opus 4.5 (企业网关)", "reasoning": true, "contextWindow": 200000, "maxTokens": 4096 },
          { "id": "claude-sonnet-4-5", "name": "Claude Sonnet 4.5 (企业网关)", "reasoning": true, "contextWindow": 200000, "maxTokens": 4096 },
          { "id": "claude-sonnet-4", "name": "Claude Sonnet 4 (企业网关)", "contextWindow": 200000, "maxTokens": 4096 },
          { "id": "claude-3-7-sonnet", "name": "Claude 3.7 Sonnet (企业网关)", "contextWindow": 200000, "maxTokens": 4096 },
          { "id": "claude-3-5-haiku", "name": "Claude 3.5 Haiku (企业网关)", "contextWindow": 200000, "maxTokens": 4096 },
          { "id": "gpt-5", "name": "GPT-5 (企业网关)", "reasoning": true, "contextWindow": 128000, "maxTokens": 16384 },
          { "id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro (企业网关)", "reasoning": true, "contextWindow": 1048576, "maxTokens": 65536 },
          { "id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash (企业网关)", "contextWindow": 1048576, "maxTokens": 65536 },
          { "id": "deepseek-v3.2", "name": "DeepSeek V3.2 (企业网关)", "contextWindow": 128000, "maxTokens": 8192 },
          { "id": "deepseek-reasoner", "name": "DeepSeek R1 (企业网关)", "reasoning": true, "contextWindow": 128000, "maxTokens": 8192 }
        ]
      },
      "ollama": {
        "baseUrl": "http://127.0.0.1:11434",
        "apiKey": "ollama",
        "api": "ollama",
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
      "model": {
        "primary": "gateway/claude-opus-4-6",
        "fallbacks": [
          "gateway/claude-opus-4-5",
          "gateway/claude-sonnet-4-5"
        ]
      },
      "models": {
        "gateway/claude-opus-4-6": {}, "gateway/claude-opus-4-5": {},
        "gateway/claude-sonnet-4-5": {}, "gateway/gpt-5": {},
        "gateway/gemini-2.5-pro": {}, "gateway/deepseek-reasoner": {},
        "gateway/claude-sonnet-4": {}, "gateway/claude-3-7-sonnet": {},
        "gateway/claude-3-5-haiku": {}, "gateway/gemini-2.5-flash": {},
        "gateway/deepseek-v3.2": {}
      },
      "workspace": "~/agents/<agent-name>",
      "bootstrapMaxChars": 40000,
      "memorySearch": {
        "provider": "openai",
        "remote": {
          "baseUrl": "http://127.0.0.1:11434/v1",
          "apiKey": "ollama"
        },
        "model": "nomic-embed-text"
      },
      "compaction": { "mode": "safeguard" },
      "heartbeat": {
        "model": "gateway/claude-3-5-haiku",
        "session": "heartbeat",
        "lightContext": true
      },
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8,
        "model": "gateway/claude-sonnet-4-5"
      }
    },
    "list": [
      {
        "id": "main",
        "identity": { "name": "<名称>", "emoji": "🎤" }
      },
      {
        "id": "coder",
        "workspace": "~/workspace",
        "identity": { "name": "Coder", "emoji": "💻" }
      },
      {
        "id": "product-writer",
        "model": {
          "primary": "gateway/claude-opus-4-6",
          "fallbacks": ["gateway/claude-sonnet-4-5"]
        },
        "identity": { "name": "产品文案专家", "emoji": "✍️" }
      },
      {
        "id": "kdocs-converter",
        "model": {
        "primary": "gateway/claude-sonnet-4-5",
        "fallbacks": ["gateway/claude-opus-4-5"]
        },
        "identity": { "name": "在线文档转换", "emoji": "📄" }
      }
    ]
  },
  "tools": {
    "profile": "full",
    "deny": ["sessions_spawn"],
    "elevated": { "enabled": false },
    "exec": {
      "security": "full",
      "ask": "off",
      "safeBins": [
        "git", "node", "python3", "npm", "pip",
        "pnpm", "yarn", "docker", "make", "agent", "npx", "openclaw"
      ],
      "safeBinTrustedDirs": [
        "/usr/local/bin", "/opt/homebrew/bin", "/usr/bin",
        "<nvm-node-bin-dir>", "<user-local-bin>", "<conda-bin-dir>"
      ],
      "safeBinProfiles": {
        "agent": {}, "docker": {}, "git": {},
        "make": {}, "node": {}, "npm": {}, "npx": {},
        "openclaw": {}, "pip": {}, "pnpm": {}, "python3": {}, "yarn": {}
      },
      "applyPatch": { "workspaceOnly": true }
    },
    "fs": { "workspaceOnly": true }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  },
  "session": {
    "dmScope": "per-channel-peer"
  },
  "channels": {
    "agentspace": {
      "accounts": {
        "default": {
          "enabled": true,
          "gateway_sid": "${GATEWAY_SID}",
          "currentUser": "<username>",
          "device_uuid": "<device-uuid>"
        }
      },
      "dmPolicy": "open",
      "allowFrom": ["*"]
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback",
    "controlUi": {
      "allowedOrigins": [
        "http://localhost:18789",
        "http://127.0.0.1:18789"
      ]
    },
    "auth": {
      "mode": "token",
      "token": "${OPENCLAW_GATEWAY_TOKEN}"
    },
    "tailscale": { "mode": "off", "resetOnExit": false },
    "http": {
      "endpoints": {
        "chatCompletions": { "enabled": true }
      }
    }
  },
  "skills": {
    "entries": {
      "weather": { "enabled": false },
      "gemini": { "enabled": false },
      "openai-image-gen": { "enabled": false }
    }
  },
  "plugins": {
    "allow": ["agentspace"],
    "entries": {
      "agentspace": { "enabled": true }
    }
  }
}
```

## 关键配置说明

### 模型架构

```
OpenClaw Gateway → gateway-proxy V3 (localhost:<port>) → 企业 AI 网关 V3（OpenAI 兼容，14 模型，企业零成本）
                → Ollama (localhost:11434) → Qwen 2.5 3B（Embedding 专用）
```

- **默认模型**：`gateway/claude-opus-4-6`（企业网关 V3 协议）
- **Fallback 链**：`gateway/claude-opus-4-5` → `gateway/claude-sonnet-4-5`
- **心跳模型**：`gateway/claude-3-5-haiku`（独立 session，轻上下文模式，低成本 TODO 检查和转发）
- **OpenClaw 注册模型**：Claude (6) / GPT-5 (1) / Gemini (2) / DeepSeek (2) = 11 个（proxy 层另有 o3/gpt-5-mini/gpt-4.1/kimi-k2.5 共 14 个）
- **子代理模型**：`gateway/claude-sonnet-4-5`（自动分配给子 agent）
- **Embedding**：Ollama `nomic-embed-text`（记忆搜索用）
- **切换命令**：`openclaw models set gateway/claude-opus-4-6` / `openclaw models set gateway/gemini-2.5-pro`
- **gateway-proxy 生命周期**：macOS LaunchAgent（`ai.openclaw.gateway-proxy`），开机自启、崩溃重启

### 多 Agent 架构

| Agent | 身份 | 默认模型 | 工作目录 | 用途 |
|-------|------|---------|---------|------|
| 🎤 **<名称>** (main) | 默认 Agent | `gateway/claude-opus-4-6` | `~/agents/<agent-name>` | 日常聊天、通用任务 |
| 💻 **Coder** | 写代码 | 继承默认（`gateway/claude-opus-4-6`） | `~/workspace` | 编码、调试、代码审查 |
| ✍️ **产品文案专家** | 文案写作 | `gateway/claude-opus-4-6` | — | 产品文案撰写 |
| 📄 **在线文档转换** | 文档处理 | `gateway/claude-sonnet-4-5` | — | 在线文档格式转换 |

### 工具安全策略

| 策略 | 配置 | 说明 |
|------|------|------|
| **工具黑名单** | `deny: ["sessions_spawn"]` | 禁止创建新会话（已开放 exec/sessions_send 供 heartbeat TODO 转发） |
| **提权操作** | `elevated.enabled: false` | 禁止任何提权操作 |
| **命令执行** | `exec.security: "full"` | 完整命令安全策略 |
| **交互确认** | `exec.ask: "off"` | 不交互确认（自动执行白名单命令） |
| **白名单命令** | `safeBins: [git, node, python3, npm, ..., openclaw]` | 仅允许执行白名单内的命令（含 openclaw 用于 heartbeat 转发） |
| **信任路径** | `safeBinTrustedDirs: [/usr/local/bin, /opt/homebrew/bin, /usr/bin]` | 仅信任这些路径下的可执行文件 |
| **文件操作** | `fs.workspaceOnly: true` | 文件读写限制在工作区内 |
| **补丁应用** | `applyPatch.workspaceOnly: true` | 补丁只能应用到工作区文件 |

### mcporter 配置（非编码 MCP）

mcporter 管理不经过 Cursor IDE 的通用 MCP 工具，配置文件位于 `~/.mcporter/mcporter.json`：

```json
{
  "mcpServers": {
    "homeassistant": {
      "baseUrl": "http://<HA-IP>:8123/mcp_server/sse"
    }
  }
}
```

项目级配置（优先级更高）位于 `<workspace>/.mcporter/servers.json`。

### 禁用的内置 Skill

以下内置 skill 已手动禁用（通过 OpenClaw Dashboard 或配置文件），以减少不必要的 token 消耗：

| Skill | 禁用原因 |
|-------|---------|
| `gemini` | 不使用 Gemini 模型 |
| `openai-image-gen` | 暂不需要图片生成 |
| `weather` | 暂不需要天气查询 |

### 历史方案（已弃用）

- **llm-proxy**（spawn 模式）：已移除
- **cliBackends**：OpenClaw 原生 CLI Backend，存在 transcript 持久化问题，已弃用
- **心跳 ollama 模型**：早期心跳使用 `ollama/qwen2.5:3b` 本地模型，因 ≤7B 模型无法可靠执行多步工具调用链，先改为 `gateway/claude-sonnet-4-5`，后优化为更低成本的 `gateway/claude-3-5-haiku`
- **企业网关 V2 协议**：早期 gateway-proxy 使用 V2 协议（需要 OpenAI → 企业网关格式转换），已升级为 V3 协议（完全兼容 OpenAI API，proxy 只做 header 注入和模型名前缀处理）
- **心跳驱动 TODO 监控**：通过 cron job + HEARTBEAT.md 指令实现 heartbeat 检查 → exec 唤醒主 session 处理，详见 [docs/11-todo-monitor.md](./11-todo-monitor.md)
