# OpenClaw 配置说明文档

本项目记录了 OpenClaw AI 助手的完整配置过程与说明。可使用 Cursor 辅助你进行轻松配置。

## 环境概览

| 项目 | 值 |
|------|------|
| Mac 主机 | `<Mac-IP>`（用户 `<username>`） |
| Windows 主机 | `<Windows-IP>` |
| OpenClaw 版本 | 2026.3.1 |
| Node.js 版本 | v24.13.0 |
| macOS 架构 | Intel x86_64 |
| 配置文件 | `~/.openclaw/openclaw.json` |
| Agent 工作区 | `~/clawd/` |
| Gateway 端口 | 18789 |
| Dashboard | `http://<Mac-IP>:18789` |

## 工具

- **[cursor-proxy](cursor-proxy/)** — 将 Cursor Agent CLI 封装为 OpenAI 兼容 API 的 ACP 代理服务（常驻进程，2-3秒响应），复用 Cursor 订阅模型，零额外成本

## 文档目录

- [安装与迁移](docs/01-installation.md)
- [模型配置](docs/02-models.md)（含 Cursor Agent 代理、火山引擎豆包等多种方案）
- [Gateway 与 Dashboard](docs/03-gateway.md)
- [iMessage 频道配置](docs/04-imessage.md)
- [TTS 语音合成](docs/05-tts.md)
- [MCP 远程工具集成](docs/06-mcp-integration.md)
- [Agent 人格与规则](docs/07-agent-persona.md)
- [记忆系统](docs/08-memory.md)
- [常见问题与故障排查](docs/09-troubleshooting.md)
- [当前配置快照](docs/99-config-snapshot.md)
