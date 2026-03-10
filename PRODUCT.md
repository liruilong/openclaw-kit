# OpenClaw Setup — 企业级 AI 助手部署套件

> 30 分钟，从零到一个能用的 AI 助手。

## 为什么需要它？

部署 OpenClaw 的第一天，你可能会遇到这些问题：

- 大群提供的 LLM Proxy 每次请求要等 20 秒，体验像拨号上网，又慢又废 Token
- 企业内网有 AI 网关，但协议不兼容
- 配置散落在四五个文件里，改一个漏一个
- 文档太零散，不知道从哪开始

**OpenClaw Setup 把这些坑都填好了。**

## 核心组件

| 组件 | 解决什么问题 | 你得到什么 |
|------|-------------|-----------|
| **gateway-proxy** | 企业网关协议不兼容 | 一层转换，内网 AI **直接用** |
| **docs/** | 不知道从哪开始 | 10 篇文档，**让 Cursor 照着做就行** |

## 企业级，不是玩具级

- **LaunchAgent 托管**：开机自启、崩溃秒重启、日志自动归档
- **配置模板齐全**：`openclaw.json`、`auth-profiles.json`、`hosts`，复制粘贴即可
- **脱敏处理**：敏感信息全用占位符，fork 后不担心泄露

## 10 篇文档，覆盖全流程

| 序号 | 文档 | 解决什么 |
|------|------|---------|
| 01 | installation | 装什么、怎么装 |
| 02 | models | 四种模型方案怎么选 |
| 03 | gateway | Dashboard 怎么开 |
| 04 | imessage | 怎么用 iMessage 和 AI 聊天 |
| 05 | tts | 怎么让 AI 开口说话 |
| 06 | mcp-integration | 怎么接外部工具 |
| 07 | agent-persona | 怎么给 AI 设人设 |
| 08 | memory | 怎么让 AI 记住上下文 |
| 09 | troubleshooting | 出问题怎么查 |
| 10 | optimization | 怎么省 token |

## 适合谁用？

- ✅ 公司内网有 AI 网关，想接进 OpenClaw
- ✅ 第一次部署，需要一份靠谱的参考
- ✅ 想同时用多个模型，按需切换

## 快速开始

```bash
# 克隆
git clone <repo-url> openclaw-setup && cd openclaw-setup

# 按顺序看文档部署
# docs/01-installation.md → ... → docs/10-optimization.md

# 启动代理
cd gateway-proxy && npm start      # 企业网关代理（需内网）

# 验证
curl http://127.0.0.1:3010/v1/health    # 应返回 ok
```

---

## 技术实现细节

> 以下内容面向想了解内部机制的开发者，普通用户可跳过。

### gateway-proxy：怎么把企业网关接进来？

**核心思路：协议翻译 + 流式透传**

企业内网 AI 网关若使用自有 V2 协议、与 OpenAI 格式不兼容时，gateway-proxy 做的事情：

```
OpenAI 格式请求 → 翻译成 企业网关 V2 格式 → 发给网关
网关响应 → 翻译回 OpenAI 格式 → 返回给 OpenClaw
```

**请求翻译做了什么？**

- `messages` 里的 `system` 角色提取出来放进 `context` 字段
- 多模态内容（图片 base64）自动剥离，换成占位文案，**省 token**
- `tools`、`tool_choice` 原样透传，不用额外转换

**流式响应怎么处理？**

边收边转，不在内存里攒完再发。网关吐一行 SSE，proxy 立刻翻译成 OpenAI chunk 写回去。

---

### 配置文件怎么组织？

| 文件/字段 | 管什么 |
|----------|--------|
| `models.providers` | 模型来源：gateway-proxy 在哪、各有哪些模型 |
| `agents.defaults.model.primary` | 主对话用哪个模型 |
| `agents.defaults.subagents.model` | 子任务用哪个模型（可以用便宜的） |
| `agents.defaults.heartbeat` | 心跳检测用哪个模型（建议用本地小模型） |
| `bootstrapMaxChars` | 会话启动时注入多少工作区内容（影响首包大小） |

gateway-proxy 通过环境变量配置（端口、超时、token 等），详见其 README。

---

### 出错了会怎样？

| 场景 | 表现 |
|------|------|
| 请求体超 10MB | 直接断开 |
| 单次请求超时（默认 5 分钟） | 停止响应，已输出的内容保留 |
| 企业网关不可达 | 502，提示 Gateway unreachable |
| 网关返回业务错误 | 400，透传网关的错误信息 |

---

### 还能怎么优化？

**gateway-proxy 侧：**
- base64 图片自动剥离，上行 token 能省不少
- 流式透传，内存占用低

**OpenClaw 侧：**
- 主模型用强的，子任务模型用便宜的
- 心跳用本地小模型（如 Ollama + qwen2.5:3b）
- 控制 `bootstrapMaxChars` 避免首包过大

详见 [docs/10-optimization.md](docs/10-optimization.md)。

---

## 技术栈

- Node.js ≥ 18（原生 fetch，无额外依赖）
- OpenClaw 2026.3.x
- macOS LaunchAgent（进程托管）

---

_部署遇到问题？查看 [docs/09-troubleshooting.md](docs/09-troubleshooting.md) 或提 Issue。_
