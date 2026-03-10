# 多 Agent 会议系统

> 让 AI Agent 团队像真人一样开会讨论，支持多轮观点碰撞和共识收敛。

## 为什么需要 Agent 开会？

当你有多个 Agent（需求分析师、开发、测试、Code Reviewer），面对一个复杂决策时，单独问每个 Agent 只能得到各自视角的片面回答。让他们坐在一起讨论，才能：

- 暴露盲点（每个角色看到不同的风险）
- 收敛分歧（通过反驳和让步达成共识）
- 产出可执行方案（而不是各说各话）

## 快速开始

### 1. 前置条件

```bash
# 确认已有多个 agent
openclaw agents list --json

# 开启 agent 间通信
openclaw config set tools.agentToAgent.enabled true
openclaw config set tools.agentToAgent.allow '["requirement-analyst","coder","reviewer","tester"]'
```

### 2. 创建会议脚本

将 `scripts/meeting.sh` 复制到你的 agent 工作区：

```bash
cp scripts/meeting.sh ~/agents/<your-agent>/scripts/
```

### 3. 写议题，开会

```bash
# 写议题文件
cat > /tmp/topic.md << 'EOF'
## 背景
我们的 API 响应时间从 200ms 劣化到 800ms，需要决定优化方案。

## 讨论问题
1. 根因是什么？缓存失效还是数据库慢查询？
2. 短期止血方案是什么？
3. 长期怎么防止再次发生？
EOF

# 开会：2轮讨论，4个 agent
zsh ~/agents/<your-agent>/scripts/meeting.sh /tmp/topic.md 2 requirement-analyst coder tester reviewer
```

### 4. 查看结果

会议记录自动保存在 `/tmp/meeting-room-<timestamp>.md`，包含每轮每个 agent 的完整发言。

## 会议模式

### 串行模式（默认）

```
第1轮: A → B → C → D（每人能看到前面所有人的发言）
第2轮: A → B → C → D（每人能看到所有历史发言，可以反驳）
```

**优点**：后发言者可以直接回应前面的观点
**缺点**：后发言者容易被先发言者"锚定"

### MAGI 盲发言模式（推荐）

灵感来自 EVA 中的三贤人系统——多视角独立决策后再碰撞：

```
第1轮: A | B | C | D（并行，互相看不到）
第2轮: A → B → C → D（看到所有第1轮发言，交叉讨论）
第3轮: 收敛定论
```

> ⚠️ 盲发言模式需要修改脚本，将第1轮改为并行调用。参考 `scripts/meeting-magi.sh`。

## 会议规范

经过团队实战总结的规则：

| 规则 | 说明 |
|------|------|
| 默认方案 | 开会前必须写"如果不开会，默认怎么做"，讨论只聚焦推翻它的理由 |
| 一票否决 | 任何角色可叫停，但必须附成本估算（"修这个风险要 X 天"） |
| 会议分类 | 决策会 3 轮必须出结论；Brainstorm 不超过 2 轮 |
| 会后记录 | 决议 + owner + deadline，三列表就够 |

### 四门禁模型

用于决策类会议，四个维度独立评估：

```
必要性（该不该做）  → 需求分析师  ← 优先级最高
安全性（会不会炸）  → 测试工程师
正确性（对不对）    → 开发工程师
可维护性（能不能接手）→ Code Reviewer
```

## Token 消耗参考

| 配置 | 调用次数 | 耗时 | 约 Token |
|------|---------|------|---------|
| 2轮 × 4人 | 8次 | ~5分钟 | ~160k input |
| 3轮 × 4人 | 12次 | ~8分钟 | ~300k input |
| 2轮 × 2人 | 4次 | ~2分钟 | ~80k input |

> 💡 Token 不该花在共识上，要花在分歧上。无分歧的事项用异步文档同步。

## 实战案例

### 案例 1：技术方案决策

**议题**：搭建三级 Agent 分发体系，怎么分工？

**结果**：
- 需求分析师第一轮说"反馈抓取最重要"
- Coder 反驳"跑通闭环才是老板要看的"
- 需求分析师第二轮**改判**，接受 Coder 方案
- 最终收敛出周一到周五的详细排期

### 案例 2：方法论讨论

**议题**：EVA 三贤人系统能替代我们的开会模式吗？

**结果**：
- 四人共识不照搬，但采纳"盲发言"消除锚定效应
- 产出三条会议改进规则
- 四人自嘲"在讨论怎么开会而不是解决问题，浪费 token"

## 脚本源码

见 [`scripts/meeting.sh`](scripts/meeting.sh)。

## 搭配使用

- 会议产出的 Action Items 可以直接分发给各 Agent 执行
- 会议记录可以用 `wps-doc` 上传到金山文档共享
- 结合 `todo.md` 跟踪会议决议的执行情况
