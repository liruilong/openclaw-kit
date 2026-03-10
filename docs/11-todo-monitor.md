# 心跳驱动 TODO 监控

> 通过 heartbeat 定期检查 TODO 文件，发现待办时唤醒主 session 处理。
> heartbeat session 保持 `lightContext: true`，只做检查和转发，不自己处理任务。

## 架构

```
heartbeat (定时触发)
  → 读取 HEARTBEAT.md 指令
  → read todo.md 检查是否有 - [ ] 项
  → 有待办？用 exec 调用 openclaw agent 唤醒主 session
    → 主 session 处理任务 → 完成后删除该行
  → 无待办？回复 HEARTBEAT_OK
```

## 两层 Session 分离

| 层 | Session | lightContext | 模型 | 职责 | Token 消耗 |
|----|---------|-------------|------|------|-----------|
| 检查层 | heartbeat | `true` | Haiku（最便宜） | 读 todo.md → 判断 → exec 转发 | ~5k/次 |
| 执行层 | main | `false` | Opus（强大） | 接收转发 → 处理任务 → 删除完成项 | 按需 |

**为什么分两层？** 不用让 Opus 模型 24 小时空转做心跳检查，用便宜的小模型当哨兵，有事才叫大模型起来干活。

## TODO 管理规则

`todo.md` 是 heartbeat 的检查清单，不是详细计划。

- 主 Agent 收到任务时，先在 `todo.md` 写一条 `- [ ]` 再动手
- 大任务只写一条概括，开始做的时候再拆解
- **完成后删除该行**（不是打勾），保持文件精简，减轻 heartbeat 负担

```markdown
# TODO
<!-- heartbeat 定期检查 -->
<!-- 格式：- [ ] 未完成 / 完成后删除该行 -->

- [ ] 调研 XX 方案并写入 reports/
```

## 相关文件

| 文件 | 位置 | 用途 |
|------|------|------|
| `todo.md` | `~/agents/<agent-name>/todo.md` | TODO 列表 |
| `HEARTBEAT.md` | `~/agents/<agent-name>/HEARTBEAT.md` | heartbeat 行为指引 |

## 配置步骤

### 1. 创建 TODO 文件

```bash
cat > ~/agents/<agent-name>/todo.md << 'EOF'
# TODO

<!-- heartbeat 定期检查 -->
<!-- 格式：- [ ] 未完成 / 完成后删除该行 -->
EOF
```

### 2. 配置 HEARTBEAT.md

heartbeat session 的行为完全由 HEARTBEAT.md 控制（`lightContext: true` 时 skill 不会被注入）。

```bash
cat > ~/agents/<agent-name>/HEARTBEAT.md << 'EOF'
# HEARTBEAT.md - 心跳任务

每次心跳被触发时，按以下顺序执行。

## 第一步：TODO 待办检查（必须执行）

1. 用 `read` 工具读取文件，path 参数为 `/Users/<username>/agents/<agent-name>/todo.md`
2. 检查文件内容中是否有 `- [ ]` 开头的行（未完成项）
3. 如果没有未完成项 → 跳到第二步
4. 如果有未完成项 → 用 `exec` 工具执行命令唤醒主 session：
   - command: `openclaw agent --agent main --message "[TODO 自动处理] 请读取 /Users/<username>/agents/<agent-name>/todo.md，处理所有未完成的待办项（- [ ] 开头），完成后用 edit 工具删除该行（不是打勾，是删除整行，保持文件精简）。" --timeout 300`
   - 注意：不要自己处理 TODO 内容，只负责唤醒主 session

## 第二步：回复状态

- 如果有待办且已唤醒主 session → 回复 "已唤醒主 session 处理待办"
- 如果无待办 → 回复 "HEARTBEAT_OK"
- 如果读取文件失败 → 回复 "HEARTBEAT_OK - todo.md 不存在"

## 注意事项

- 不要自己处理 TODO 任务，只做检查和转发
- read 工具的 path 参数必须用绝对路径
EOF
```

> 将 `<username>` 和 `<agent-name>` 替换为实际值。

### 3. 在 AGENTS.md 中添加 TODO 规则

```markdown
## TODO 管理

`todo.md` 是 heartbeat 的检查清单，目的是让它知道还有事没做完。

- 收到任务时，**先在 `todo.md` 写一条 `- [ ]` 再动手**
- 大任务只写一条概括，开始做的时候再拆解成小步骤
- 完成后**删除该行**（不是打勾），保持文件精简，减轻 heartbeat 负担
- todo.md 不是详细计划，详细计划写在别处
```

### 4. 配置 heartbeat 模型

推荐使用低成本的云端模型（本地小模型无法可靠执行多步工具调用链）：

```bash
openclaw config set agents.defaults.heartbeat.model gateway/claude-3-5-haiku
openclaw gateway restart
```

### 5. 必要的权限配置

heartbeat 需要 exec 工具来唤醒主 session：

```bash
# tools.deny 中只保留 sessions_spawn
openclaw config set tools.deny '["sessions_spawn"]'

# safeBins 中需包含 openclaw
```

## 为什么不用本地模型

| 模型 | 能否完成 heartbeat 流程 | 问题 |
|------|----------------------|------|
| `qwen2.5:3b` | ❌ | read 工具参数传不对 |
| `qwen2.5:7b` | ❌ | 能读文件但不按指令继续执行 |
| `claude-3-5-haiku` | ✅ | 正确执行，成本最低（推荐） |

heartbeat 看似简单，实际是多步工具调用链（读文件 A → 理解指令 → 读文件 B → 条件判断 → exec），对小模型要求较高。

## 踩坑记录

1. **`lightContext: true` 不注入 skills** — 逻辑必须写在 HEARTBEAT.md 里
2. **`sessions_send` 只排队不唤醒** — 要立即唤醒主 session 必须用 exec 调用 `openclaw agent`
3. **Gateway 缓存 workspace 文件** — 修改 HEARTBEAT.md 后需重启 Gateway
4. **`group:runtime` 包含 exec** — deny 了 `group:runtime` 就没有 exec 工具

## 手动操作

```bash
# 重启（修改 HEARTBEAT.md 后必须）
openclaw gateway restart
```

> 注意：不需要额外配置 cron job。OpenClaw 内置的 heartbeat 轮询机制会自动定时触发 heartbeat session，读取 HEARTBEAT.md 执行检查。
