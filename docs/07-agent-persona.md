# Agent 人格与规则

## 工作区目录结构

推荐按 Agent 名称组织工作区，便于多 Agent 扩展：

```
~/agents/
├── <agent-name>/          # 主 Agent 工作区
│   ├── .git/              # Git 版本控制（建议）
│   ├── .openclaw/         # OpenClaw 内部文件
│   ├── AGENTS.md          # Agent 行为规则（核心）
│   ├── HEARTBEAT.md       # 心跳检查指令
│   ├── IDENTITY.md        # 身份信息
│   ├── SOUL.md            # 人格设定
│   ├── TOOLS.md           # 工具使用说明
│   ├── USER.md            # 用户信息
│   ├── todo.md            # TODO 待办（heartbeat 监控）
│   ├── memory/            # 每日记忆
│   │   ├── 2026-03-09.md
│   │   └── ...
│   └── skills/            # 自定义技能
└── <另一个agent>/         # 可扩展更多 Agent
```

OpenClaw 配置中指定工作区路径：

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/agents/<agent-name>"
    }
  }
}
```

## 关键文件说明

### SOUL.md — 人格定义

定义 Agent 的核心原则和行为风格。

```markdown
# SOUL.md - 你是谁

## 核心原则

**直接给答案，不废话。** 不要说"好的！"——直接做事。
**做完整件事。** 不要停在中间步骤就汇报。
**有自己的判断。** 可以有偏好、有意见、敢于提出不同看法。
**先自己找答案。** 用尽一切手段之后再提问。

## 交流风格

- 语言：默认使用中文，技术术语和代码保持英文
- 风格：专业简洁，直奔主题
```

> Agent 可能会自行修改 SOUL.md，这是正常行为。建议用 Git 管理工作区。

### USER.md — 用户信息

```markdown
- **称呼**：<用户名>
- **语言偏好**：中文为主，技术术语用英文
- **时区**：Asia/Shanghai

## 偏好

- 回复直接、不绕弯
- 提到不明确的名字时，优先去 `~/workspace/` 找一级目录匹配
```

### AGENTS.md — 行为规则

核心规则包括：
1. **每次会话启动**：自动读取 SOUL.md、USER.md、memory 文件
2. **记忆管理**：将重要信息写入 `memory/YYYY-MM-DD.md`
3. **安全规则**：不外泄隐私、不执行破坏性命令、`trash` > `rm`
4. **TODO 管理**：收到任务先记 todo.md，完成后删除该行

### TODO 管理规则

`todo.md` 是 heartbeat 的检查清单，目的是让它知道还有事没做完。

```markdown
## TODO 管理

- 收到任务时，**先在 `todo.md` 写一条 `- [ ]` 再动手**
- 大任务只写一条概括，开始做的时候再拆解成小步骤
- 完成后**删除该行**（不是打勾），保持文件精简，减轻 heartbeat 负担
- todo.md 不是详细计划，详细计划写在别处
```

关键点：完成后是**删除**而非打勾，因为 heartbeat 用轻量模型检查，文件越短负担越小。

### HEARTBEAT.md — 心跳指令

heartbeat session 的行为完全由此文件控制。

```markdown
# HEARTBEAT.md - 心跳任务

## 第一步：TODO 待办检查

1. 用 `read` 工具读取 `todo.md`
2. 检查是否有 `- [ ]` 开头的行
3. 没有 → 回复 HEARTBEAT_OK
4. 有 → 用 `exec` 唤醒主 session 处理

## 第二步：回复状态

- 有待办且已唤醒 → "已唤醒主 session 处理待办"
- 无待办 → "HEARTBEAT_OK"

## 注意

- 不要自己处理 TODO，只做检查和转发
- path 参数必须用绝对路径
```

### TOOLS.md — 本地工具配置

记录环境特定的信息：设备型号、本地服务地址、MCP 工具调用方式等。

## 多 Agent 配置

在 `~/.openclaw/agents/` 下为每个专用 Agent 创建目录和 SOUL.md：

```
~/.openclaw/agents/
├── product-writer/     # 产品文案专家
│   └── SOUL.md
├── kdocs-converter/    # 在线文档转换
│   └── SOUL.md
└── coder/              # 开发 Agent
    └── agent/
```

在 `openclaw.json` 的 `agents.list` 中注册：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "identity": { "name": "<名称>", "emoji": "🎤" }
      },
      {
        "id": "product-writer",
        "agentDir": "/Users/<username>/.openclaw/agents/product-writer",
        "model": { "primary": "gateway/claude-opus-4-5" },
        "identity": { "name": "产品文案专家", "emoji": "✍️" }
      },
      {
        "id": "kdocs-converter",
        "agentDir": "/Users/<username>/.openclaw/agents/kdocs-converter",
        "model": { "primary": "gateway/claude-sonnet-4-5" },
        "identity": { "name": "在线文档转换", "emoji": "📄" }
      }
    ]
  }
}
```

## 配置方式

这些文件都是纯 Markdown，直接编辑即可：

```bash
# 直接编辑
vi ~/agents/<agent-name>/SOUL.md

# 或通过 Dashboard 的文件浏览器修改
# http://127.0.0.1:<port>/
```
