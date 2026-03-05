# 当前配置快照

> 截取于 2026-03-05，已切换至 llm-proxy（Cursor Agent 代理）方案

## openclaw.json

```json
{
  "meta": {
    "lastTouchedVersion": "2026.3.2",
    "lastTouchedAt": "2026-03-05T13:25:06.017Z"
  },
  "wizard": {
    "lastRunAt": "2026-03-05T13:25:06.013Z",
    "lastRunVersion": "2026.3.2",
    "lastRunCommand": "onboard",
    "lastRunMode": "local"
  },
  "models": {
    "mode": "merge",
    "providers": {
      "local-agent-proxy": {
        "baseUrl": "http://127.0.0.1:3000/v1",
        "apiKey": "not-needed",
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
            "id": "gpt-5.2",
            "name": "Cursor Agent (GPT 5.2)",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 128000,
            "maxTokens": 16384
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
        "primary": "local-agent-proxy/opus-4.6"
      },
      "workspace": "~/clawd",
      "bootstrapMaxChars": 50000,
      "memorySearch": {
        "provider": "openai",
        "remote": {
          "baseUrl": "http://127.0.0.1:11434/v1",
          "apiKey": "ollama"
        },
        "model": "nomic-embed-text"
      },
      "compaction": {
        "mode": "safeguard"
      },
      "heartbeat": {
        "model": "ollama/qwen2.5:3b",
        "lightContext": true,
        "session": "heartbeat"
      },
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8,
        "model": "local-agent-proxy/opus-4.6"
      }
    }
  },
  "tools": {
    "profile": "messaging"
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
          "wps_sid": "***",
          "currentUser": "***",
          "device_uuid": "***"
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
      "token": "***"
    },
    "tailscale": {
      "mode": "off",
      "resetOnExit": false
    },
    "http": {
      "endpoints": {
        "chatCompletions": {
          "enabled": true
        }
      }
    }
  },
  "plugins": {
    "entries": {
      "agentspace": {
        "enabled": true
      }
    }
  }
}
```

## 关键配置说明

### 模型架构

```
OpenClaw Gateway → llm-proxy (localhost:3000) → Cursor Agent CLI → 企业 Cursor 模型
                → Ollama (localhost:11434) → Qwen 2.5 3B（心跳专用）
```

- **主模型**：`local-agent-proxy/opus-4.6`（通过 llm-proxy 代理 Cursor Agent CLI）
- **心跳模型**：`ollama/qwen2.5:3b`（本地运行，独立 session，避免干扰主对话）
- **Embedding**：Ollama `nomic-embed-text`（记忆搜索用）

### llm-proxy 配置要点

- `useAskMode: false` — Agent 自主执行工具，llm-proxy 只等待最终结果
- `disableSandbox: true` — 允许 Agent 执行 Shell 命令
- 流式输出时只发送 `result`，不发送中间 `assistant` 消息，避免重复文本
- 详见 [llm-proxy README](../llm-proxy/README.md)

### 心跳隔离

心跳配置了 `"session": "heartbeat"`，运行在独立 session 中，不会覆盖 webchat 主会话的标签。

### CLI Backend（已弃用）

之前尝试过 `cliBackends` 直接集成 Cursor Agent CLI，但存在 transcript 持久化问题（OpenClaw Gateway 无法正确解析 CLI 的 `--output-format json` 输出中的 `init` 事件），导致新消息在刷新后丢失。已切回 llm-proxy 方案。
