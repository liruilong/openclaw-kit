# openclaw-setup

OpenClaw AI 助手的完整配置说明文档与代理工具集合。记录了从安装、模型配置、iMessage 集成到 TTS 语音合成的全流程，并包含两个实用的代理服务工具。

属于 **Desk Live 桌面助手生态** 的配置与文档中心。

## 功能

- **全流程配置文档** — 涵盖安装迁移、模型配置、Gateway、iMessage、TTS、MCP 集成、Agent 人设、记忆系统等
- **wps-proxy** — 将 WPS 内网 AI 网关 V3 转换为 OpenAI 兼容接口，企业内部零成本，14+ 模型（推荐首选）
- ~~**cursor-proxy**~~ — ⚠️ 已因公司禁令弃用，仅保留代码供参考
- **chrome-ext** — Chrome 浏览器扩展，增强 Dashboard 体验（拖拽文件插入路径、状态徽章等）
- **多模型方案** — 支持 WPS 企业网关（推荐）、火山引擎（豆包）、Qwen/GLM/DeepSeek 等多种 LLM 接入方案
- **Cursor Skills** — 内含多个 Cursor 技能定义（知识库查询、需求提取、Token 优化等）

## 技术栈

- **JavaScript / Node.js** — 代理服务
- **macOS launchd** — 服务管理
- **OpenAI API 兼容** — 统一 LLM 接入协议

## 项目结构

```
openclaw-setup/
├── README.md                  # 项目总览（本文件）
├── CHANGELOG.md               # 变更日志
├── docs/                      # 配置文档
│   ├── 01-installation.md     # 安装与迁移
│   ├── 02-models.md           # 模型配置（多方案）
│   ├── 03-gateway.md          # Gateway 与 Dashboard
│   ├── 04-imessage.md         # iMessage 频道配置
│   ├── 05-tts.md              # TTS 语音合成
│   ├── 06-mcp-integration.md  # MCP 远程工具集成
│   ├── 07-agent-persona.md    # Agent 人格与规则
│   ├── 08-memory.md           # 记忆系统
│   ├── 09-troubleshooting.md  # 常见问题排查
│   ├── 10-optimization-tips.md # 优化实践
│   └── 99-config-snapshot.md  # 配置快照
├── cursor-proxy/              # ⚠️ Cursor Agent ACP 代理（已弃用，公司禁止）
│   ├── streaming-proxy.mjs    # 主程序
│   ├── package.json
│   └── README.md
├── wps-proxy/                 # WPS AI 网关代理（推荐首选）
│   ├── proxy.mjs              # 主程序
│   ├── package.json
│   └── README.md
├── chrome-ext/                # Chrome 浏览器扩展
│   ├── manifest.json          # Manifest V3
│   ├── content.js             # 拖拽处理、路径插入
│   ├── background.js          # Native Messaging 桥接
│   ├── status-badge.js        # 状态徽章
│   ├── queue-enhance.js       # 队列增强
│   └── native-host/           # Native Host 路径解析
└── .cursor/skills/            # Cursor 技能定义（14 个）
    ├── openclaw-deploy/       # OpenClaw 部署流程
    ├── knowledge-base-query/  # 企业知识库查询
    ├── requirement-extraction/ # 需求提取
    ├── token-optimization/    # Token 优化
    ├── brainstorming/         # 头脑风暴
    ├── mermaid-chart/         # Mermaid 图表
    ├── systematic-debugging/  # 系统化调试
    ├── writing-plans/         # 实施计划
    ├── todo-manager/          # TODO 任务管理（配合心跳监控）
    ├── wps-doc-cli/           # 金山文档 CLI 操作
    ├── wpsv7-skills/          # WPS 365 V7 API 工具集
    ├── meeting-facilitator/   # 多 Agent 团队会议
    ├── code-validation/       # 代码安全红线校验
    └── meeting-assistant/     # WPS365 会议助手
```

## 环境概览

| 项目 | 值 |
|------|------|
| Mac 主机 | `<Mac-IP>`（用户 `<username>`） |
| Windows 主机 | `<Windows-IP>` |
| OpenClaw 版本 | 2026.3.1 |
| Node.js 版本 | v24.13.0 |
| macOS 架构 | Intel x86_64 |
| 配置文件 | `~/.openclaw/openclaw.json` |
| Agent 工作区 | `~/agent-workspace/`（自定义） |
| Gateway 端口 | 自定义非默认端口 |
| Dashboard | `http://localhost:<port>` |

## 使用说明

文档中的路径和配置已做脱敏处理，部署时按需替换：

| 占位符 | 说明 |
|--------|------|
| `~/agent-workspace/` | Agent 工作区路径，实际部署时自定义 |
| `<Mac-IP>` / `<Windows-IP>` | 按实际 IP 替换 |
| `<username>` | 按实际用户名替换 |
| `***` | 配置快照中的 API Key 脱敏 |

## 工具

- **[wps-proxy](wps-proxy/)** — 将 WPS 内网 AI 网关 V3 转换为 OpenAI 兼容接口，企业内部零成本，14+ 模型（推荐首选）
- ~~**[cursor-proxy](cursor-proxy/)**~~ — Cursor Agent ACP 代理（⚠️ 已因公司禁令弃用，仅保留代码供参考）
- **[chrome-ext](chrome-ext/)** — Chrome 浏览器扩展，增强 Dashboard 交互（拖拽文件插入路径、Native Messaging 路径解析）

## 文档目录

- [安装与迁移](docs/01-installation.md)
- [模型配置](docs/02-models.md)（WPS AI 网关为推荐首选，另含火山引擎豆包等方案）
- [Gateway 与 Dashboard](docs/03-gateway.md)
- [iMessage 频道配置](docs/04-imessage.md)
- [TTS 语音合成](docs/05-tts.md)
- [MCP 远程工具集成](docs/06-mcp-integration.md)
- [Agent 人格与规则](docs/07-agent-persona.md)
- [记忆系统](docs/08-memory.md)
- [常见问题与故障排查](docs/09-troubleshooting.md)
- [优化实践](docs/10-optimization-tips.md)
- [当前配置快照](docs/99-config-snapshot.md)

## 相关项目

| 项目 | 说明 |
|------|------|
| [clawd-workspace](https://github.com/pumpkinpieman/clawd-workspace) | OpenClaw agent workspace |
| [live-mcp](https://github.com/pumpkinpieman/live-mcp) | MCP Server，AI 控制角色 TTS 和动画 |
| [live-sync](https://github.com/pumpkinpieman/live-sync) | OpenClaw 对话同步服务 |
| [live-subtitle](https://github.com/pumpkinpieman/live-subtitle) | 桌面字幕叠加层 |
| [cwy-bridge](https://github.com/pumpkinpieman/cwy-bridge) | 游戏端角色动画桥接 |
| [desk-live](https://github.com/pumpkinpieman/desk-live) | Desk Live 桌面助手 monorepo |
