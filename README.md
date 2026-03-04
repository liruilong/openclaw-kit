# OpenClaw 配置说明文档

本项目记录了 OpenClaw AI 助手在 Mac (192.168.2.2) 上的完整配置过程与说明。

## 环境概览

| 项目 | 值 |
|------|------|
| Mac 主机 | `192.168.2.2`（用户 `drakgon`） |
| Windows 主机 | `192.168.2.63` |
| OpenClaw 版本 | 2026.3.1 |
| Node.js 版本 | v24.13.0 |
| macOS 架构 | Intel x86_64 |
| 配置文件 | `~/.openclaw/openclaw.json` |
| Agent 工作区 | `~/clawd/` |
| Gateway 端口 | 18789 |
| Dashboard | `http://192.168.2.2:18789` |

## 文档目录

- [安装与迁移](docs/01-installation.md)
- [模型配置](docs/02-models.md)
- [Gateway 与 Dashboard](docs/03-gateway.md)
- [iMessage 频道配置](docs/04-imessage.md)
- [TTS 语音合成](docs/05-tts.md)
- [MCP 远程工具集成](docs/06-mcp-integration.md)
- [Agent 人格与规则](docs/07-agent-persona.md)
- [记忆系统](docs/08-memory.md)
- [常见问题与故障排查](docs/09-troubleshooting.md)
- [当前配置快照](docs/99-config-snapshot.md)
