# 当前配置快照

> 截取于 2026-03-04

## openclaw.json

```json
{
  "meta": {
    "lastTouchedVersion": "2026.3.1",
    "lastTouchedAt": "2026-03-03T18:31:52.492Z"
  },
  "wizard": {
    "lastRunAt": "2026-01-26T17:34:03.810Z",
    "lastRunVersion": "2026.1.24-3",
    "lastRunCommand": "onboard",
    "lastRunMode": "local"
  },
  "models": {
    "mode": "merge",
    "providers": {
      "doubao": {
        "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
        "apiKey": "***",
        "api": "openai-completions",
        "models": [
          {
            "id": "doubao-seed-1-8-251228",
            "name": "Doubao Seed 1.8 (推理模型)",
            "reasoning": false,
            "input": ["text", "image"],
            "contextWindow": 65535,
            "maxTokens": 65535
          },
          {
            "id": "doubao-1.5-lite-32k-250115",
            "name": "Doubao 1.5 Lite",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 32768,
            "maxTokens": 4096
          },
          {
            "id": "doubao-1.5-pro-32k-250115",
            "name": "Doubao 1.5 Pro",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 32768,
            "maxTokens": 12288
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "doubao/doubao-1.5-pro-32k-250115",
        "fallbacks": ["doubao/doubao-seed-1-8-251228"]
      },
      "models": {
        "doubao/doubao-1.5-pro-32k-250115": {},
        "doubao/doubao-1.5-lite-32k-250115": {},
        "doubao/doubao-seed-1-8-251228": {}
      },
      "workspace": "/Users/drakgon/clawd",
      "compaction": { "mode": "safeguard" },
      "heartbeat": {
        "every": "30m",
        "model": "doubao/doubao-1.5-lite-32k-250115"
      },
      "maxConcurrent": 4,
      "subagents": { "maxConcurrent": 8 }
    }
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
    "internal": {
      "enabled": true,
      "entries": {
        "message-sync": { "enabled": true }
      }
    }
  },
  "channels": {
    "imessage": {
      "enabled": true,
      "cliPath": "/usr/local/bin/imsg",
      "dbPath": "/Users/drakgon/Library/Messages/chat.db",
      "service": "auto",
      "dmPolicy": "pairing",
      "groupPolicy": "allowlist"
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan",
    "controlUi": {
      "allowedOrigins": [
        "http://localhost:18789",
        "http://127.0.0.1:18789",
        "http://192.168.2.2:18789"
      ]
    },
    "auth": {
      "mode": "token",
      "token": "***"
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

## mcporter.json

路径：`~/.mcporter/mcporter.json`

```json
{
  "mcpServers": {
    "game-character": {
      "baseUrl": "http://192.168.2.63:9884/mcp"
    }
  }
}
```

## LaunchAgent

路径：`~/Library/LaunchAgents/ai.openclaw.gateway.plist`

- Label: `ai.openclaw.gateway`
- 程序：`/usr/local/bin/node /usr/local/lib/node_modules/openclaw/dist/index.js gateway --port 18789`
- RunAtLoad: true
- KeepAlive: true

## 已配对的 iMessage 联系人

存储在 `~/.openclaw/credentials/imessage-default-allowFrom.json`
