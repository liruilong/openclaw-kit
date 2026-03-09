# 当前配置快照

> 截取于 2026-03-09，已集成 wps-proxy（WPS AI 网关）+ cursor-proxy ACP（Cursor 订阅模型）双代理架构

## openclaw.json

```json
{
  "meta": {
    "lastTouchedVersion": "2026.3.1",
    "lastTouchedAt": "2026-03-05T01:51:43.981Z"
  },
  "models": {
    "mode": "merge",
    "providers": {
      "doubao": {
        "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
        "apiKey": "${VOLCENGINE_API_KEY}",
        "api": "openai-completions",
        "models": [
          {
            "id": "doubao-seed-2-0-pro-260215",
            "name": "豆包 2.0 Pro",
            "reasoning": false,
            "input": ["text", "image"],
            "contextWindow": 262144,
            "maxTokens": 8192
          },
          {
            "id": "doubao-seed-2-0-lite-260215",
            "name": "豆包 2.0 Lite",
            "reasoning": false,
            "input": ["text", "image"],
            "contextWindow": 131072,
            "maxTokens": 8192
          },
          {
            "id": "doubao-seed-2-0-mini-260215",
            "name": "豆包 2.0 Mini",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 262144,
            "maxTokens": 8192
          }
        ]
      },
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
        "baseUrl": "http://localhost:11434/v1",
        "apiKey": "ollama",
        "api": "openai-completions",
        "models": [
          {
            "id": "qwen2:1.5b",
            "name": "Qwen2 1.5B (Local)",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 32768,
            "maxTokens": 4096
          },
          {
            "id": "nomic-embed-text",
            "name": "Nomic Embed",
            "reasoning": false,
            "input": ["text"]
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "cursor-local/opus-4.6",
        "fallbacks": ["doubao/doubao-seed-2-0-pro-260215"]
      },
      "workspace": "~/agent-workspace/main",
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
        "every": "30m",
        "target": "last",
        "activeHours": { "start": "08:00", "end": "24:00" }
      },
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8,
        "model": "cursor-local/opus-4.6"
      }
    },
    "list": [
      {
        "id": "main",
        "default": true,
        "heartbeat": {
          "every": "1h",
          "model": "cursor-local/sonnet-4.6",
          "activeHours": { "start": "08:00", "end": "22:00" }
        }
      },
      {
        "id": "watchdog",
        "name": "watchdog",
        "workspace": "~/agent-workspace/watchdog",
        "heartbeat": {
          "every": "10m",
          "model": "ollama/qwen2:1.5b",
          "session": "watchdog",
          "target": "last"
        }
      }
    ]
  },
  "tools": {
    "profile": "full",
    "deny": ["group:runtime", "sessions_spawn", "sessions_send"],
    "web": {
      "search": {
        "provider": "brave",
        "apiKey": "***"
      }
    },
    "elevated": { "enabled": false },
    "exec": {
      "security": "full",
      "ask": "off",
      "safeBins": [
        "git", "node", "python3", "npm", "pip",
        "pnpm", "yarn", "docker", "make", "agent", "npx"
      ],
      "safeBinTrustedDirs": ["/usr/local/bin", "/opt/homebrew/bin", "/usr/bin"],
      "safeBinProfiles": {
        "agent": {}, "docker": {}, "git": {},
        "make": {}, "npm": {}, "npx": {},
        "pip": {}, "pnpm": {}, "yarn": {}
      },
      "applyPatch": { "workspaceOnly": true }
    },
    "fs": { "workspaceOnly": true }
  },
  "messages": {
    "ackReactionScope": "group-mentions",
    "tts": {
      "auto": "off",
      "provider": "edge",
      "edge": {
        "enabled": true,
        "voice": "zh-CN-XiaoyiNeural",
        "lang": "zh-CN",
        "outputFormat": "audio-24khz-48bitrate-mono-mp3",
        "pitch": "+0%",
        "rate": "+0%"
      }
    }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  },
  "hooks": {
    "internal": { "enabled": true, "entries": {} }
  },
  "channels": {
    "imessage": {
      "enabled": true,
      "cliPath": "/usr/local/bin/imsg",
      "dbPath": "<user-messages-db-path>",
      "service": "auto",
      "dmPolicy": "pairing",
      "groupPolicy": "allowlist"
    }
  },
  "discovery": {
    "mdns": { "mode": "off" }
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan",
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
  "plugins": {
    "entries": {
      "imessage": { "enabled": true }
    }
  }
}
```

## 关键配置说明

### 模型架构

```
OpenClaw Gateway → wps-proxy (localhost:3010) → WPS AI 网关（日常聊天，企业零成本）
                → cursor-proxy ACP (localhost:18790) → agent acp → Cursor 订阅模型（复杂任务）
                → Ollama (localhost:11434) → Qwen2 1.5B（心跳/watchdog 用）
                → 豆包 Pro（fallback）
```

- **日常聊天**：`wps/claude-opus-4-5`（通过 wps-proxy 代理 WPS AI 网关）
- **复杂任务**：`cursor-local/opus-4.6`（通过 ACP 常驻进程代理 Cursor Agent CLI）
- **Fallback**：`doubao/doubao-seed-2-0-pro-260215`（代理不可用时兜底）
- **心跳模型**：主 Agent 使用 `cursor-local/sonnet-4.6`（每小时），watchdog 使用 `ollama/qwen2:1.5b`（每 10 分钟）
- **Embedding**：Ollama `nomic-embed-text`（记忆搜索用）
- **切换命令**：`openclaw models set wps/claude-opus-4-5`（日常）/ `openclaw models set cursor-local/opus-4.6`（复杂）
- **wps-proxy 生命周期**：macOS LaunchAgent（`ai.openclaw.wps-proxy`），开机自启、崩溃重启

### 多 Agent 架构

| Agent | 用途 | 心跳 | 活跃时段 |
|-------|------|------|---------|
| `main` | 主 Agent（默认） | 每 1h，`cursor-local/sonnet-4.6` | 08:00-22:00 |
| `watchdog` | 看门狗监控 | 每 10m，`ollama/qwen2:1.5b`，独立 session | 全天 |

### cursor-proxy ACP 模式要点

- `agent acp` 作为常驻子进程运行，通过 JSON-RPC 2.0 通信
- 后续请求 2-3 秒响应（旧 llm-proxy spawn 模式需 13-27 秒）
- `session/request_permission` 自动 approve-always
- 崩溃自动重启（2秒延迟）
- **Session 复用**：同一 ACP session 处理多个请求，直到达到阈值（50 条或 10 万 token）才轮换
- **连续 idle timeout 自动轮换**：ACP session 堵死后，连续 2 次 idle timeout 自动轮换到新 session（`CURSOR_SESSION_IDLE_ROTATE` 可调）
- **默认工作目录**：`CURSOR_WORKSPACE_DIR` 默认为 `~/.openclaw`，确保 Agent 能访问 skills、memory 等资源
- 详见 [cursor-proxy README](../cursor-proxy/README.md)

### 工具安全策略

- `deny: ["group:runtime", "sessions_spawn", "sessions_send"]` — 禁止运行时类和多会话操作
- `exec.security: "full"` — 完整命令执行安全策略
- `exec.ask: "off"` — 不交互确认（自动执行）
- `fs.workspaceOnly: true` — 文件操作限制在工作区内
- `elevated.enabled: false` — 禁止提权操作

### TTS 语音合成

- 使用 Edge TTS（`zh-CN-XiaoyiNeural`），免费无需 API Key
- `auto: "off"` — 不自动朗读，需手动触发

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
- **心跳独立 session**：早期心跳使用 `"session": "heartbeat"` 隔离，现改为 `"target": "last"` 模式（心跳投递到最近活跃会话）
