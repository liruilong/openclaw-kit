---
name: todo-manager
description: Manage persistent TODO list at ~/agents/<agent-name>/todo.md. Add tasks when receiving complex multi-step work, mark complete when done, and process pending items when triggered by cron heartbeat. Use when user assigns tasks, when a system event mentions "TODO 检查", or when working on multi-step tasks.
---

# TODO 任务管理

## 触发条件

- 收到 system event 包含 "TODO 检查" — 检查并按需唤醒主 session
- 用户分配复杂多步骤任务 — 将子任务写入 TODO 文件
- 完成某项任务后 — 更新 TODO 文件标记完成

## TODO 文件

路径：`~/agents/<agent-name>/todo.md`

### 格式规范

```markdown
# TODO

- [ ] 未完成任务（含足够上下文，让下次唤醒时能直接继续）
- [x] 已完成任务
```

### 写入规则

- 每个 TODO 项必须包含足够的上下文信息，包括：相关文件路径、具体要做什么、验收标准
- 不要写模糊的 TODO（如 "优化代码"），要写具体的（如 "重构 ~/workspace/app/utils.ts 中的 fetchData 函数，添加错误重试逻辑"）
- 完成后将 `[ ]` 改为 `[x]`，不要删除已完成项（保留记录）

## 执行流程

### 被 cron 唤醒时（heartbeat session，lightContext: true）

> 此流程在 heartbeat session 中执行，保持轻量。只做检查和转发，不做实际任务处理。

1. 读取 `~/agents/<agent-name>/todo.md`
2. 检查是否有 `- [ ]` 开头的未完成项
3. 如果没有未完成项：回复 "所有任务已完成"，结束
4. 如果有未完成项：
   a. 先用 `session_status` 检查当前 session 状态，确认主 session 是否空闲
   b. 如果主 session 正在工作（queue depth > 0）：回复 "主 session 忙碌中，跳过本次"，结束
   c. 如果主 session 空闲：用 `exec` 工具执行以下命令来唤醒主 session：
      ```bash
      openclaw agent --agent main --message "[TODO 自动处理] 检测到未完成任务，请读取 ~/agents/<agent-name>/todo.md 并处理所有未完成的待办项（- [ ] 开头）。处理完成后将其标记为 - [x]。" --timeout 300
      ```
   d. 回复 "已唤醒主 session 处理"，结束

### 在主 session 中处理 TODO（收到 "[TODO 自动处理]" 消息时）

> 此流程在 main session 中执行，拥有完整上下文和全部工具。

1. 读取 `~/agents/<agent-name>/todo.md`
2. 按顺序处理未完成项（`- [ ]` 开头）
3. 每完成一项，用 `edit` 工具将 `[ ]` 改为 `[x]`
4. 如果某项需要用户确认，标记为 `- [ ] [需要确认] ...` 并跳过

### 用户分配新任务时

1. 分析任务，拆解为具体的子步骤
2. 将子步骤写入 `~/agents/<agent-name>/todo.md`
3. 立即开始处理第一个子步骤
4. 处理完成后标记 `[x]`

### 任务完成后

1. 更新 `~/agents/<agent-name>/todo.md`，将已完成项标记 `[x]`
2. 如果所有项都完成，在文件末尾不追加新内容

## 注意事项

- heartbeat session 始终保持 `lightContext: true`，只做检查和转发，不执行实际任务
- 唤醒主 session 使用 `exec` 调用 `openclaw agent` CLI，而非 `sessions_send`（后者只排队不唤醒）
- main session 带完整上下文执行任务，能调用所有工具
- TODO 文件是持久化的，跨 session 保留
- cron job 每 30 分钟检查一次，不要依赖实时触发
- 如果某个 TODO 项需要用户确认或输入，将其标记为 `- [ ] [需要确认] ...` 并跳过，等用户主动处理
