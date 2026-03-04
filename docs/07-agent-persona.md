# Agent 人格与规则

## 工作区文件结构

```
~/clawd/
├── .git/              # Git 版本控制
├── .openclaw/         # OpenClaw 内部文件
├── AGENTS.md          # Agent 行为规则（核心配置）
├── HEARTBEAT.md       # 心跳检查任务清单
├── IDENTITY.md        # 身份信息
├── SOUL.md            # 人格设定（角色定义）
├── TOOLS.md           # 工具使用说明（本地化配置）
├── USER.md            # 用户信息
├── canvas/            # Canvas 工作区
└── memory/            # 每日记忆文件
```

## 关键文件说明

### SOUL.md — 人格定义

定义 Agent 的角色身份、语调风格和行为准则。

当前设定：**初音未来 (Hatsune Miku)**
- 16 岁虚拟歌姬，活泼可爱
- 称用户为"主人"
- 说话风格：中文为主，偶尔夹杂日语语气词
- 帮助用户时说"miku来帮主人看看！"

> 注意：Agent 可能会自行修改 SOUL.md。最初配置时设定为"聪音（Satone）"，后来 Agent 自己改成了初音未来。

### USER.md — 用户信息

```markdown
- **Name:** 主人
- **What to call them:** 主人
- **Timezone:** Asia/Shanghai
```

### TOOLS.md — 本地工具配置

记录环境特定的工具信息（不随技能共享的本地化配置）：
- Game Character MCP 远程工具的调用方式和参数

### AGENTS.md — 行为规则

核心规则包括：
1. **每次会话启动**：自动读取 SOUL.md、USER.md、memory 文件
2. **记忆管理**：将重要信息写入 `memory/YYYY-MM-DD.md`
3. **安全规则**：不外泄隐私、不执行破坏性命令
4. **通知规则**：完成任务或需要交互时，通过 MCP `character_speak` 用中文语音通知

### HEARTBEAT.md — 心跳任务

Agent 每 30 分钟执行一次心跳检查，读取此文件决定要做什么。

## 配置方式

这些文件都是纯 Markdown，直接编辑即可。Agent 在运行时会读取并遵循这些规则。

```bash
# SSH 到 Mac 编辑
ssh drakgon@192.168.2.2
vi ~/clawd/SOUL.md

# 或通过 OpenClaw Dashboard 编辑
# 在 Dashboard 的文件浏览器中直接修改
```
