# 当前配置快照

> 截取于 2026-03-06，已升级至 cursor-proxy ACP 模式（常驻进程，2-3秒响应）

## openclaw.json

```json
{
  "meta": {
    "lastTouchedVersion": "2026.3.2",
    "lastTouchedAt": "2026-03-06T00:15:00.000Z"
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
      "doubao": {
        "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
        "apiKey": "***",
        "api": "openai-responses",
        "models": [
          { "id": "doubao-seed-2-0-pro-260215", "name": "豆包 2.0 Pro" },
          { "id": "doubao-seed-2-0-lite-260215", "name": "豆包 2.0 Lite" }
        ]
      },
      "ollama": {
        "baseUrl": "http://127.0.0.1:11434/v1",
        "apiKey": "ollama",
        "api": "openai-responses",
        "models": [
          { "id": "qwen2:1.5b", "name": "Qwen2 1.5B" },
          { "id": "nomic-embed-text", "name": "Nomic Embed" }
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
      "workspace": "~/agent-workspace",
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
        "model": "ollama/qwen2:1.5b",
        "lightContext": true,
        "session": "heartbeat"
      },
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8,
        "model": "cursor-local/opus-4.6"
      }
    }
  },
  "tools": {
    "profile": "full"
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
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan",
    "auth": { "mode": "token", "token": "***" },
    "http": { "endpoints": { "chatCompletions": { "enabled": true } } }
  }
}
```

## 关键配置说明

### 模型架构

```
OpenClaw Gateway → cursor-proxy ACP (localhost:18790) → agent acp (常驻进程) → Cursor 订阅模型
                → Ollama (localhost:11434) → Qwen2 1.5B（心跳专用）
                → 豆包 Pro（fallback）
```

- **主模型**：`cursor-local/opus-4.6`（通过 ACP 常驻进程代理 Cursor Agent CLI）
- **Fallback**：`doubao/doubao-seed-2-0-pro-260215`（ACP proxy 不可用时兜底）
- **心跳模型**：`ollama/qwen2:1.5b`（本地运行，独立 session）
- **Embedding**：Ollama `nomic-embed-text`（记忆搜索用）

### cursor-proxy ACP 模式要点

- `agent acp` 作为常驻子进程运行，通过 JSON-RPC 2.0 通信
- 后续请求 2-3 秒响应（旧 llm-proxy spawn 模式需 13-27 秒）
- `session/request_permission` 自动 approve-always
- 崩溃自动重启（2秒延迟）
- **Session 复用**：同一 ACP session 处理多个请求，直到达到阈值（50 条或 10 万 token）才轮换，避免每次请求都重建 session 导致的性能问题和卡死
- **默认工作目录**：`CURSOR_WORKSPACE_DIR` 默认为 `~/.openclaw`，确保 Agent 能访问 skills、memory 等资源
- 详见 [cursor-proxy README](../cursor-proxy/README.md)

### 心跳隔离

心跳配置了 `"session": "heartbeat"`，运行在独立 session 中，不会覆盖 webchat 主会话的标签。

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
