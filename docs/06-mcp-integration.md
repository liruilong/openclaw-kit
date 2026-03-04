# MCP 远程工具集成

## 概述

通过 Model Context Protocol (MCP) 的 HTTP transport，OpenClaw 可以远程调用 Windows 桌面上的 Game Character MCP 服务，实现语音通知、角色动画等功能。

## 架构

```
┌─────────────────────┐        HTTP (port 9884)        ┌──────────────────────┐
│   Mac (192.168.2.2) │  ─────────────────────────────→ │ Windows (192.168.2.63)│
│   OpenClaw Agent    │                                 │ Game Character MCP   │
│   (via mcporter)    │  ←───────────────────────────── │ + TTS + WebSocket    │
└─────────────────────┘        JSON-RPC Response        └──────────────────────┘
```

## Windows 端配置

### MCP 服务器

项目路径：`F:\Document\WorkSpace\game-character-mcp`

`index.ts` 同时提供两种 transport：
1. **Stdio** — 供 Cursor IDE 直接使用
2. **Streamable HTTP** — 监听 `0.0.0.0:9884/mcp`，供远程客户端使用

Cursor MCP 配置（`.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "game-character": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "MCP_HTTP_PORT": "9884",
        "TTS_BACKEND": "volcano",
        ...
      }
    }
  }
}
```

### 提供的工具

| 工具 | 说明 |
|------|------|
| `character_speak` | 让桌面角色用语音说话（支持情绪动画） |
| `character_animate` | 触发角色动画（无语音） |
| `tts_synthesize` | 合成语音音频文件 |
| `get_status` | 检查 TTS 和连接状态 |

### 支持的情绪

Happy, Confused, Sad, Fun, Agree, Drink, Wave, Think

### 支持的语言

ja（日语）, zh（中文）, en（英语）, ko（韩语）, yue（粤语）

## Mac 端配置（OpenClaw）

### mcporter 配置

配置文件：`~/.mcporter/mcporter.json`

```json
{
  "mcpServers": {
    "game-character": {
      "baseUrl": "http://192.168.2.63:9884/mcp"
    }
  }
}
```

添加命令：

```bash
npx mcporter config add game-character --url http://192.168.2.63:9884/mcp --scope home
```

### 验证连接

```bash
# 列出远程工具
npx mcporter list game-character --schema

# 调用工具
npx mcporter call game-character.get_status
npx mcporter call game-character.character_speak text="你好" lang=zh emotion=Happy
```

## Agent 工作区规则

在 `~/clawd/TOOLS.md` 中记录了工具信息，在 `~/clawd/AGENTS.md` 中添加了通知规则：

**通知规则**：当 OpenClaw 需要通知用户（任务完成、需要决策、遇到错误等）时，除了发 iMessage，还通过 `character_speak` 在 Windows 桌面上语音通知。

调用方式：

```bash
npx mcporter call game-character.character_speak text="通知内容" lang=zh emotion=Happy
```

情绪选择指南：
- **Happy** — 任务完成、好消息
- **Think** — 需要决策
- **Confused** — 遇到问题
- **Wave** — 打招呼
- **Sad** — 出错失败
- **Agree** — 确认

## 前提条件

- Windows 防火墙允许 9884 端口入站（测试中自动通过）
- Cursor IDE 的 MCP 进程需要运行中（它会同时启动 HTTP 端点）
- Mac 和 Windows 在同一局域网
