---
name: meeting-facilitator
description: "AI Agent 团队会议主持。当用户说'开会'、'讨论一下'、'让 agents 讨论'、'团队评审'时使用。支持需求评审、代码评审、方案讨论等场景。"
---

# Meeting Facilitator — Agent 团队会议

## 概述

主持一场多 Agent 参与的虚拟会议。Main agent 作为主持人，按轮次调用各 agent 发言，所有发言记录在共享会议纪要中，每个 agent 能看到前面所有人的发言。

## 会议流程

### 1. 准备阶段

根据议题确定参会 agent：

| 议题类型 | 参会 agents |
|---------|------------|
| 需求评审 | requirement-analyst, coder, tester |
| 代码评审 | reviewer, tester, coder |
| 方案讨论 | requirement-analyst, coder, reviewer |
| 全体会议 | 所有 agent |

### 2. 创建会议文件

在 `/tmp/agent-meeting-<timestamp>.md` 创建会议纪要：

```markdown
# Agent 团队会议

**议题**：<议题>
**时间**：<当前时间>
**参会者**：<agent 列表>
**主持人**：<主 Agent 名称> (main)

---

## 会议材料

<用户提供的需求/代码/方案等>

---

## 发言记录

（按轮次追加）
```

### 3. 轮次发言

对每个参会 agent，使用 `sessions_send` 发送消息：

```
你正在参加一个 Agent 团队会议。

会议议题：<议题>
会议材料：<材料摘要或文件路径>

以下是之前其他参会者的发言：
<已有发言记录>

现在轮到你发言。请根据你的角色（<角色名>）给出你的专业意见。
注意：
- 直接给观点，不要客套
- 可以赞同、反对或补充前面人的观点
- 如果发现问题，直接指出
```

收到回复后，追加到会议纪要：

```markdown
### 🔍 Code Reviewer（第1轮）

<agent 的发言内容>

---
```

### 4. 追加轮次（可选）

如果有分歧或需要深入讨论，可进行第 2 轮发言：
- 将第 1 轮所有发言作为上下文
- 要求 agent 针对分歧点给出进一步意见

### 5. 总结

Main agent 汇总所有发言，输出：

```markdown
## 会议结论

### 共识
- ...

### 分歧点
- ...

### Action Items
- [ ] <谁> - <做什么> - <截止时间>
```

## 注意事项

- 每个 agent 的发言使用 `sessions_send` 并指定 `agentId`
- `timeoutSeconds` 设为 120（复杂讨论需要时间）
- 会议纪要同时写入 `~/agents/<agent-name>/reports/meetings/` 归档
- 会议结束后将 action items 写入 `todo.md`
