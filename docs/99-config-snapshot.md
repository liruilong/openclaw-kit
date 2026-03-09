# 当前配置快照

> 截取于 2026-03-09，已集成 wps-proxy（WPS AI 网关）+ cursor-proxy ACP（Cursor 订阅模型）双代理架构 + 工具安全策略

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
      "cursor-local": {
        "baseUrl": "http://127.0.0.1:18790/v1",
        "apiKey": "local",
        "api": "openai-completions",
        "models": [
          {
            "id": "opus-4.6",
            "name": "Cursor Agent (Opus 4.6)",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 128000,
            "maxTokens": 16384
          },
          {
            "id": "sonnet-4.6",
            "name": "Cursor Agent (Sonnet 4.6)",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 128000,
            "maxTokens": 16384
          }
        ]
      },
      "wps": {
        "baseUrl": "http://127.0.0.1:3010/v1",
        "api": "openai-completions",
        "models": [
          {
            "id": "claude-opus-4-5",
            "name": "Claude Opus 4.5 (WPS)",
            "reasoning": true,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 4096
          },
          {
            "id": "claude-sonnet-4-5",
            "name": "Claude Sonnet 4.5 (WPS)",
            "reasoning": true,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 4096
          }
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
        "primary": "wps/claude-opus-4-5",
        "fallbacks": [
          "cursor-local/opus-4.6",
          "cursor-local/sonnet-4.6",
          "wps/claude-sonnet-4-5"
        ]
      },
      "workspace": "~/clawd",
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
        "model": "wps/claude-sonnet-4-5",
        "session": "heartbeat",
        "lightContext": true
      },
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8,
        "model": "cursor-local/sonnet-4.6"
      }
    },
    "list": [
      {
        "id": "main",
        "identity": { "name": "Miku", "emoji": "🎤" }
      },
      {
        "id": "coder",
        "workspace": "~/workspace",
        "model": {
          "primary": "cursor-local/opus-4.6",
          "fallbacks": ["wps/claude-opus-4-5", "cursor-local/sonnet-4.6", "wps/claude-sonnet-4-5"]
        },
        "identity": { "name": "Coder", "emoji": "💻" }
      },
      {
        "id": "product-writer",
        "model": {
          "primary": "wps/claude-opus-4-5",
          "fallbacks": ["wps/claude-sonnet-4-5"]
        },
        "identity": { "name": "产品文案专家", "emoji": "✍️" }
      },
      {
        "id": "kdocs-converter",
        "model": {
          "primary": "wps/claude-sonnet-4-5",
          "fallbacks": ["wps/claude-opus-4-5"]
        },
        "identity": { "name": "金山文档转换", "emoji": "📄" }
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
          "wps_sid": "${WPS_SID}",
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
OpenClaw Gateway → wps-proxy (localhost:3010) → WPS AI 网关（日常聊天，企业零成本）
                → cursor-proxy ACP (localhost:18790) → agent acp → Cursor 订阅模型（复杂任务）
                → Ollama (localhost:11434) → Qwen 2.5 3B（心跳专用）
```

- **日常聊天**：`wps/claude-opus-4-5`（默认模型，通过 wps-proxy 代理 WPS AI 网关）
- **复杂任务**：`cursor-local/opus-4.6`（fallback #1，通过 ACP 常驻进程代理 Cursor Agent CLI）
- **Fallback 链**：`cursor-local/opus-4.6` → `cursor-local/sonnet-4.6` → `wps/claude-sonnet-4-5`
- **心跳模型**：`wps/claude-sonnet-4-5`（独立 session，轻上下文模式，负责 TODO 检查和转发）
- **子代理模型**：`cursor-local/sonnet-4.6`（自动分配给子 agent）
- **Embedding**：Ollama `nomic-embed-text`（记忆搜索用）
- **切换命令**：`openclaw models set wps/claude-opus-4-5`（日常）/ `openclaw models set cursor-local/opus-4.6`（复杂）
- **wps-proxy 生命周期**：macOS LaunchAgent（`ai.openclaw.wps-proxy`），开机自启、崩溃重启

### 多 Agent 架构

| Agent | 身份 | 默认模型 | 工作目录 | 用途 |
|-------|------|---------|---------|------|
| 🎤 **Miku** (main) | 默认 Agent | `wps/claude-opus-4-5` | `~/clawd` | 日常聊天、通用任务 |
| 💻 **Coder** | 写代码 | `cursor-local/opus-4.6` | `~/workspace` | 编码、调试、代码审查 |
| ✍️ **产品文案专家** | 文案写作 | `wps/claude-opus-4-5` | — | 产品文案撰写 |
| 📄 **金山文档转换** | 文档处理 | `wps/claude-sonnet-4-5` | — | 金山文档格式转换 |

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

### cursor-proxy ACP 模式要点

- `agent acp` 作为常驻子进程运行，通过 JSON-RPC 2.0 通信
- 后续请求 2-3 秒响应（旧 llm-proxy spawn 模式需 13-27 秒）
- `session/request_permission` 自动 approve-always
- 崩溃自动重启（2秒延迟）
- **Session 复用**：同一 ACP session 处理多个请求，直到达到阈值（50 条或 10 万 token）才轮换
- **连续 idle timeout 自动轮换**：ACP session 堵死后，连续 2 次 idle timeout 自动轮换到新 session（`CURSOR_SESSION_IDLE_ROTATE` 可调）
- **默认工作目录**：`CURSOR_WORKSPACE_DIR` 默认为 `~/.openclaw`，确保 Agent 能访问 skills、memory 等资源
- 详见 [cursor-proxy README](../cursor-proxy/README.md)

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

- **llm-proxy**（spawn 模式）：每次请求 spawn 新 `agent -p` 进程，13-27 秒延迟，已被 ACP 模式替代
- **cliBackends**：OpenClaw 原生 CLI Backend，存在 transcript 持久化问题，已弃用
- **openclaw-cursor-brain 插件**：早期通过插件管理 cursor-proxy 生命周期，已改为 LaunchAgent 管理
- **心跳 ollama 模型**：早期心跳使用 `ollama/qwen2.5:3b` 本地模型，因 ≤7B 模型无法可靠执行多步工具调用链，已改为 `wps/claude-sonnet-4-5`
- **心跳驱动 TODO 监控**：通过 cron job + HEARTBEAT.md 指令实现 heartbeat 检查 → exec 唤醒主 session 处理，详见 [docs/11-todo-monitor.md](./11-todo-monitor.md)
