# 心跳驱动 TODO 监控

> 通过 cron job 定期检查 TODO 文件，发现待办时唤醒主 session 处理。  
> heartbeat session 保持 `lightContext: true`，只做检查和转发，不自己处理任务。

## 架构

```
cron (每 30 分钟)
  → system event 触发 heartbeat session（Sonnet，lightContext）
    → 读取 HEARTBEAT.md 指令
    → read todo.md 检查是否有 - [ ] 项
    → 有待办？用 exec 调用 openclaw agent 唤醒主 session
      → 主 session（Opus，完整上下文）处理任务并标记 [x]
    → 无待办？回复 HEARTBEAT_OK
```

## 相关文件

| 文件 | 位置 | 用途 |
|------|------|------|
| `todo.md` | `~/clawd/todo.md` | TODO 列表（持久化，跨 session） |
| `HEARTBEAT.md` | `~/clawd/HEARTBEAT.md` | heartbeat session 行为指引 |
| `todo-manager SKILL` | `~/.openclaw/skills/todo-manager/SKILL.md` | 主 session 的 TODO 管理技能 |

## 配置步骤

### 1. 创建 TODO 文件

```bash
cat > ~/clawd/todo.md << 'EOF'
# TODO

<!-- 主 Agent 工作时维护此文件，cron job 定期检查 -->
<!-- 格式：- [ ] 未完成 / - [x] 已完成 -->

EOF
```

### 2. 配置 HEARTBEAT.md

heartbeat session 的行为完全由 `~/clawd/HEARTBEAT.md` 控制（`lightContext: true` 时 skill 不会被注入，所以逻辑必须写在 HEARTBEAT.md 里）。

```bash
cat > ~/clawd/HEARTBEAT.md << 'HEARTBEAT_EOF'
# HEARTBEAT.md - 心跳任务

每次心跳被触发时，按以下顺序执行。

## 第一步：TODO 待办检查（必须执行）

1. 用 `read` 工具读取文件，path 参数为 `/Users/<username>/clawd/todo.md`
2. 检查文件内容中是否有 `- [ ]` 开头的行（未完成项）
3. 如果没有未完成项 → 跳到第二步
4. 如果有未完成项 → 用 `exec` 工具执行命令唤醒主 session：
   - command: `openclaw agent --agent main --message "[TODO 自动处理] 请读取 /Users/<username>/clawd/todo.md，处理所有未完成的待办项（- [ ] 开头），完成后用 edit 工具将 [ ] 改为 [x]。" --timeout 300`
   - 注意：不要自己处理 TODO 内容，只负责唤醒主 session

## 第二步：回复状态

- 如果有待办且已唤醒主 session → 回复 "已唤醒主 session 处理待办"
- 如果无待办 → 回复 "HEARTBEAT_OK"
- 如果读取文件失败 → 回复 "HEARTBEAT_OK - todo.md 不存在"

## 注意事项

- 深夜时段（23:00-08:00）跳过 TODO 检查，直接 HEARTBEAT_OK
- 不要自己处理 TODO 任务，只做检查和转发
- read 工具的 path 参数必须用绝对路径
HEARTBEAT_EOF
```

> 注意：将 `<username>` 替换为实际用户名。

### 3. 创建 cron job

```bash
openclaw cron add \
  --agent main \
  --name "todo-watchdog" \
  --every 30m \
  --session main \
  --wake now \
  --system-event "TODO 定时检查：请按 HEARTBEAT.md 中的步骤执行。" \
  --model wps/claude-sonnet-4-5 \
  --timeout-seconds 120
```

### 4. 配置 heartbeat 模型

heartbeat 默认使用 `wps/claude-sonnet-4-5`（需要工具调用能力，本地小模型 ≤7B 无法可靠执行多步骤流程）：

```bash
openclaw config set agents.defaults.heartbeat.model wps/claude-sonnet-4-5
openclaw gateway restart
```

### 5. 必要的权限配置

heartbeat session 需要以下权限才能正常工作：

```bash
# 移除 group:runtime 限制（否则没有 exec 工具）
# tools.deny 中只保留 sessions_spawn
openclaw config set tools.deny '["sessions_spawn"]'

# 将 openclaw 加入 safeBins（允许 exec 调用 openclaw agent）
# safeBins 中需包含：git, node, python3, npm, pip, pnpm, yarn, docker, make, agent, npx, openclaw
```

### 6. 创建 TODO manager skill（可选）

为主 session 创建 skill，指引它如何在日常工作中维护 TODO 文件：

```bash
mkdir -p ~/.openclaw/skills/todo-manager
cat > ~/.openclaw/skills/todo-manager/SKILL.md << 'SKILL_EOF'
---
name: todo-manager
description: Manage persistent TODO list at ~/clawd/todo.md.
---
# TODO 任务管理
（skill 内容见仓库文件）
SKILL_EOF
```

## 工作原理

### 两层 session 分离

| 层 | Session | lightContext | 模型 | 职责 | Token 消耗 |
|----|---------|-------------|------|------|-----------|
| 检查层 | heartbeat | `true` | Sonnet（便宜） | 读 todo.md → 判断 → exec 转发 | ~20k/次 |
| 执行层 | main | `false` | Opus（强大） | 接收转发 → 处理任务 → 标记完成 | 按需 |

### 为什么不用本地模型

测试结果：

| 模型 | 大小 | 能否完成 heartbeat 流程 | 问题 |
|------|------|----------------------|------|
| `qwen2.5:3b` | 1.8 GB | ❌ | read 工具参数传不对，跳过 TODO 检查 |
| `qwen2.5:7b` | 4.4 GB | ❌ | 能读 HEARTBEAT.md 但不按指令继续执行 |
| `wps/claude-sonnet-4-5` | 云端 | ✅ | 正确执行所有步骤 |

heartbeat 的任务看似简单，但实际是多步骤工具调用链（读文件 A → 理解指令 → 读文件 B → 条件判断 → 执行 exec），对小模型的指令遵循能力要求较高。

### 关键踩坑记录

1. **`lightContext: true` 不注入 skills** — 逻辑必须写在 HEARTBEAT.md 里
2. **system event 的 text 不是用户消息** — Agent 收到的固定模板是 "Read HEARTBEAT.md..."，不是 cron 里设置的 text
3. **`group:runtime` 包含 exec** — deny 了 `group:runtime` 就没有 exec/bash/process 工具
4. **Gateway 缓存 workspace 文件** — 修改 HEARTBEAT.md 后需要重启 Gateway + 清除 heartbeat session
5. **`sessions_send` 只排队不唤醒** — 要立即唤醒主 session 必须用 exec 调用 `openclaw agent`

## 手动操作

```bash
# 查看 cron 状态
openclaw cron list --json

# 手动触发一次
openclaw cron run <job-id>

# 查看 heartbeat session 状态
openclaw sessions --agent main --active 10 --json

# 清除 heartbeat session（修改 HEARTBEAT.md 后必须执行）
# 1. 删除 session 文件
# 2. 从 sessions.json 删除 heartbeat 条目
# 3. 重启 Gateway
openclaw gateway restart
```
