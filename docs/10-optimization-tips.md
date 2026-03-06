# 优化实践

记录在实际使用 OpenClaw 过程中积累的优化经验。

## 工作区上下文瘦身

Agent 工作区（`~/agent-workspace/`）的文件都会被加载为上下文，过多无关文件会浪费 token。

### 做法

- **只保留 Agent 需要的文件**：`SOUL.md`、`USER.md`、`AGENTS.md`、`TOOLS.md`、`MEMORY.md`、`HEARTBEAT.md`、`memory/`、`skills/`
- **大文件/数据目录移走**：如 AI 新闻归档、日志等，移到 `~/Documents/` 或其他位置
- **`.gitignore` 排除运行时文件**：`node_modules/`、`.mcporter/` 等不需要 Agent 读取的目录

### 示例

```bash
# 将占用上下文的新闻归档移出工作区
mv ~/agent-workspace/<large-dir> ~/Documents/<archive>/
```

## MCP 配置分层

避免同一个 MCP server 同时出现在 Cursor 配置和 mcporter 中，造成重复调用和 token 浪费。

| 配置层 | 放什么 | 文件位置 |
|--------|--------|---------|
| Cursor MCP | 编码工具（openclaw-gateway） | `~/.cursor/mcp.json` |
| mcporter | 通用工具（智能家居、语音角色等） | `~/.mcporter/mcporter.json` |

详见 [MCP 远程工具集成](06-mcp-integration.md)。

## 内置 Skill 精简

OpenClaw 内置了许多 skill，但不是每个都需要。禁用不用的 skill 可以减少上下文加载和 token 消耗。

通过 Dashboard 或配置文件禁用：
- `gemini` — 不使用 Gemini 模型时禁用
- `openai-image-gen` — 不需要图片生成时禁用
- `weather` — 不需要天气查询时禁用

## 心跳 Token 优化

- 心跳使用轻量本地模型（如 `ollama/qwen2:1.5b`），配置 `lightContext: true`
- 心跳运行在独立 session（`"session": "heartbeat"`），不污染主会话
- `HEARTBEAT.md` 保持精简，减少每次心跳的 token 消耗
- 无事可做时直接回复 `HEARTBEAT_OK`，不做多余操作

## Agent 工作区文件规范

| 文件 | 用途 | 更新频率 |
|------|------|---------|
| `SOUL.md` | Agent 人格定义 | 低（稳定后很少改） |
| `USER.md` | 用户信息 | 低 |
| `AGENTS.md` | 工作区规则 | 中 |
| `TOOLS.md` | 工具调用速查 | 中（新增工具时更新） |
| `MEMORY.md` | 长期记忆 | 高（主会话中持续更新） |
| `HEARTBEAT.md` | 心跳任务定义 | 低 |
| `memory/YYYY-MM-DD.md` | 每日记录 | 高（当天频繁写入） |
