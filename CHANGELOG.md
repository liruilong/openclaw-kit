# Changelog

## 2026-03-09

### 新增

- `chrome-ext/` — Chrome 浏览器扩展，增强 Dashboard 交互体验（拖拽文件插入路径、状态徽章、队列增强），含 Native Messaging Host（路径解析）

### 修改

- cursor-proxy 新增连续 idle timeout 自动轮换 session（默认 2 次后轮换），解决 ACP session 堵死后请求反复超时的问题
- cursor-proxy README 补充新增的环境变量说明（`CURSOR_PROMPT_IDLE_TIMEOUT`、`CURSOR_SESSION_MAX_REQUESTS`、`CURSOR_SESSION_MAX_TOKENS`、`CURSOR_SESSION_IDLE_ROTATE`）
- 配置快照全面更新：豆包升级到 2.0 系列（Pro/Lite/Mini），API 改为 `openai-completions`
- 心跳架构调整：取消独立 session 隔离方案，改为 `target: "last"` + `activeHours` 模式
- 新增多 Agent 架构：主 Agent（心跳 1h，Cursor Sonnet）+ watchdog Agent（心跳 10m，Ollama）
- 工具安全策略完善：新增 `deny`、`exec` 安全配置、`fs.workspaceOnly` 等
- 新增 TTS、commands、hooks、channels、discovery 等配置段文档
- plugins 从 `openclaw-cursor-brain` 改为 `imessage`
- gateway 新增 `controlUi`、`tailscale` 配置，token 改用环境变量

## 2026-03-06

### 新增

- `wps-proxy/` — WPS 内网 AI 网关代理，将 WPS 网关 V2 协议转为 OpenAI 兼容接口，直接使用网关原始模型 ID（`claude-opus-4-5`、`claude-sonnet-4-5`），企业内部零成本
- `wps-proxy` 增加 LaunchAgent 管理（开机自启 + 崩溃重启），Token 改为环境变量必配
- `docs/02-models.md` 增加方案 D（企业 AI 网关）完整说明，含 hosts 配置、auth-profiles、LaunchAgent 部署、模型切换命令
- `docs/99-config-snapshot.md` 增加 wps provider 配置段和双代理架构图
- `docs/10-optimization-tips.md` — Token 优化最佳实践
- `docs/06-mcp-integration.md` 增加 MCP 分层策略、Home Assistant 集成说明
- `docs/99-config-snapshot.md` 增加 mcporter 配置、禁用 skill 列表说明

### 修改

- MCP 文档重写：统一使用 mcporter，强调正确调用格式（key=value，不传 JSON），补充 kad/game-character 常用工具示例
- 去掉 `~/.openclaw/mcp.json` 作为配置源的方案，配置统一维护在 `~/.mcporter/mcporter.json`

- cursor-proxy ACP session 改为复用模式，达到阈值（50 条请求或 10 万 token）才轮换，替代之前每次请求都重建 session
- cursor-proxy 默认工作目录从空改为 `~/.openclaw`，确保 Agent 能访问 skills/memory 等资源
- cursor-proxy 增加会话自动轮换、死锁保护、idle 超时检测
- 脱敏处理，清理文档中的私人信息

## 2026-03-05

### 新增

- `cursor-proxy/` — 基于 `agent acp` 的常驻进程代理，替代 llm-proxy 的 spawn 模式，后续请求 2-3 秒响应
- `.cursor/skills/knowledge-base-query/` — 企业知识库查询 skill
- `.cursor/skills/requirement-extraction/` — 需求文档提取 skill
- `.cursor/skills/token-optimization/` — Token 优化检查 skill
- `.cursor/skills/openclaw-deploy/` — OpenClaw 部署技能（含数字员工/Agentspace 接入流程）
- `.cursor/skills/brainstorming/` — 头脑风暴 skill
- `.cursor/skills/mermaid-chart/` — Mermaid 图表 skill
- `.cursor/skills/systematic-debugging/` — 系统化调试 skill
- `.cursor/skills/writing-plans/` — 编写计划 skill

### 删除

- `llm-proxy/` — 旧的 spawn 模式代理，已被 cursor-proxy ACP 模式替代

### 修改

- `llm-proxy/server.js` 修复重复文本问题（非 ask 模式下 assistant 消息覆盖而非追加）
- `llm-proxy/server.js` 修复 session 持久化问题（从 cliBackends 切回 llm-proxy 方案）
- `docs/02-models.md` 增加 Cursor Agent ACP proxy 作为推荐方案
- `docs/99-config-snapshot.md` 更新为 ACP 模式架构说明

## 2026-03-04

### 新增

- 项目初始化，完整 OpenClaw 配置文档
- `docs/01-installation.md` — 安装指南
- `docs/02-models.md` — 模型配置
- `docs/03-gateway.md` — Gateway 配置
- `docs/04-imessage.md` — iMessage 集成
- `docs/05-tts.md` — TTS 语音合成
- `docs/06-mcp-integration.md` — MCP 工具集成
- `docs/07-agent-persona.md` — Agent 人设配置
- `docs/08-memory.md` — 记忆系统（含 Ollama embedding 配置）
- `docs/09-troubleshooting.md` — 常见问题排查
- `docs/99-config-snapshot.md` — 配置快照
