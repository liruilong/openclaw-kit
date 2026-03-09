# Changelog

## 2026-03-09

### 新增

- `chrome-ext/` — Chrome 浏览器扩展，增强 Dashboard 交互体验（拖拽文件插入路径、状态徽章、队列增强），含 Native Messaging Host（路径解析）
- `docs/11-todo-monitor.md` — 心跳驱动 TODO 监控方案文档，含架构说明、配置步骤、踩坑记录和本地模型评测
- wps-proxy 新增 4 个模型映射：`claude-opus-4-6`（→ 网关 `claude-opus-4-6-v1`）、`claude-sonnet-4`、`claude-3-7-sonnet`、`claude-3-5-haiku`，默认模型从 `claude-opus-4-5` 升级为 `claude-opus-4-6`

### 修改

- cursor-proxy 新增连续 idle timeout 自动轮换 session（默认 2 次后轮换），解决 ACP session 堵死后请求反复超时的问题
- cursor-proxy README 补充新增的环境变量说明（`CURSOR_PROMPT_IDLE_TIMEOUT`、`CURSOR_SESSION_MAX_REQUESTS`、`CURSOR_SESSION_MAX_TOKENS`、`CURSOR_SESSION_IDLE_ROTATE`）
- 配置快照同步运行时实际配置：
  - 默认模型改为 `wps/claude-opus-4-5`，fallback 链 `cursor-local/opus-4.6` → `cursor-local/sonnet-4.6` → `wps/claude-sonnet-4-5`
  - 移除 doubao provider（已不使用）
  - ollama 模型更新为 `qwen2.5:3b`，API 改为 `ollama`
  - Agent 列表更新为 4 个：<名称>(main) / Coder / 产品文案专家 / 金山文档转换
  - channels 从 `imessage` 改为 `agentspace`（含 wps_sid 认证）
  - plugins 从 `imessage` 改为 `agentspace`
  - 补充工具安全策略：`deny`、`elevated`、`exec`（safeBins + safeBinProfiles + safeBinTrustedDirs）、`fs.workspaceOnly`
  - 补充 `skills.entries`（禁用 weather/gemini/openai-image-gen）
  - 心跳改为 `ollama/qwen2.5:3b` + 独立 session + 轻上下文
- 修复 coder agent fallback 拼写错误（`wps/opus-4-5` → `wps/claude-opus-4-5`）
- 配置快照同步心跳驱动 TODO 监控相关变更：
  - heartbeat 模型从 `ollama/qwen2.5:3b` → `wps/claude-sonnet-4-5` → `wps/claude-3-5-haiku`（成本更低，Haiku 足够执行心跳多步工具调用链）
  - `tools.deny` 从 `["group:runtime", "sessions_spawn", "sessions_send"]` 精简为 `["sessions_spawn"]`（开放 exec 供 heartbeat 转发）
  - `safeBins` 新增 `openclaw`（允许 heartbeat 通过 exec 调用 `openclaw agent` 唤醒主 session）
- 配置快照同步模型升级：
  - 默认模型从 `wps/claude-opus-4-5` 升级为 `wps/claude-opus-4-6`（WPS 网关已支持 `claude-opus-4-6-v1`）
  - WPS provider 新增 4 个模型定义（opus-4-6、sonnet-4、3-7-sonnet、3-5-haiku），共 6 个可用模型
  - fallback 链调整为 `wps/claude-opus-4-5` → `cursor-local/opus-4.6` → `wps/claude-sonnet-4-5` → `cursor-local/sonnet-4.6`

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

### 修改（工作区迁移）

- 工作区路径从 `~/clawd` 迁移到 `~/agents/<agent-name>` 目录结构（按 Agent 名组织，支持多 Agent 扩展）
- `docs/07-agent-persona.md` 重写：新增多 Agent 目录结构、TODO 管理规则、专用 Agent 注册示例
- `docs/11-todo-monitor.md` 更新：TODO 完成后改为删除行（而非打勾），减轻 heartbeat 负担；路径全部更新为新目录结构
- `docs/99-config-snapshot.md` 同步 workspace 路径变更
