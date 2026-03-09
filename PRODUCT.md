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
| **cursor-proxy** | Cursor CLI 冷启动慢 | 常驻进程，后续请求 **2-3 秒**响应 |
| **wps-proxy** | 企业网关协议不兼容 | 一层转换，内网 AI **直接用** |
| **docs/** | 不知道从哪开始 | 10 篇文档，**让 Cursor 照着做就行** |

## 两个代理，两种场景

```
┌─────────────────────────────────────────────────────────┐
│                      OpenClaw                           │
└──────────────┬────────────────────────┬─────────────────┘
               │                        │
               ▼                        ▼
        ┌─────────────┐          ┌─────────────┐
        │ wps-proxy   │          │cursor-proxy │
        │ 日常聊天    │          │ 复杂任务    │
        │ 零成本      │          │ 强推理      │
        └──────┬──────┘          └──────┬──────┘
               │                        │
               ▼                        ▼
        企业 AI 网关              Cursor 订阅模型
```

**一条命令切换：**
```bash
openclaw models set wps/claude-opus-4-5      # 日常聊天
openclaw models set cursor-local/opus-4.6    # 需要深度思考时
```

## 性能对比

| 指标 | 之前（每次启动新进程） | 现在（ACP 常驻进程） |
|------|----------------------|---------------------|
| 后续请求延迟 | 13-27 秒 | **2-3 秒** |
| 体感 | 像在等拨号上网 | 像在用本地应用 |

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

- ✅ 有 Cursor Pro 订阅，想白嫖模型能力
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
cd cursor-proxy && npm start   # Cursor 代理
cd wps-proxy && npm start      # WPS 代理（需内网）

# 验证
curl http://127.0.0.1:18790/v1/health   # 应返回 running: true
curl http://127.0.0.1:3010/v1/health    # 应返回 ok
```

---

## 技术实现细节

> 以下内容面向想了解内部机制的开发者，普通用户可跳过。

### cursor-proxy：怎么做到 2-3 秒响应？

**核心思路：进程常驻 + 会话复用**

旧方案每次请求都 `spawn("agent", [...])` 启动新进程，等 CLI 初始化、鉴权、建会话，13-27 秒就没了。

cursor-proxy 换了个思路：
1. 启动时创建一个 `agent acp` 子进程，**一直活着**
2. 通过 JSON-RPC 2.0 协议与它通信（stdin/stdout 逐行收发）
3. 会话建好后**反复复用**，不用每次重建

**会话什么时候轮换？**

不能无限复用，上下文会爆。cursor-proxy 用两个阈值控制：
- 同一会话内请求数 ≥ 50 次
- 估算 token 数 ≥ 10 万（按 3.3 字符/token 粗算）

触发任一条件，自动新建会话，旧的废弃。

**崩溃了怎么办？**

ACP 子进程挂掉后，约 2 秒自动重启，重新走 initialize → authenticate → session/new，无需人工介入。

**并发请求怎么处理？**

同一时刻只允许一个 prompt 在执行（互斥锁）。新请求排队等，最多等 30 秒，超时则强制释放锁重试。

---

### wps-proxy：怎么把企业网关接进来？

**核心思路：协议翻译 + 流式透传**

WPS 内网 AI 网关用的是自己的 V2 协议，和 OpenAI 格式不兼容。wps-proxy 做的事情：

```
OpenAI 格式请求 → 翻译成 WPS V2 格式 → 发给网关
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
| `models.providers` | 模型来源：cursor-proxy 在哪、wps-proxy 在哪、各有哪些模型 |
| `agents.defaults.model.primary` | 主对话用哪个模型 |
| `agents.defaults.subagents.model` | 子任务用哪个模型（可以用便宜的） |
| `agents.defaults.heartbeat` | 心跳检测用哪个模型（建议用本地小模型） |
| `bootstrapMaxChars` | 会话启动时注入多少工作区内容（影响首包大小） |

cursor-proxy 和 wps-proxy 自身通过环境变量配置（端口、超时、token 等），详见各自 README。

---

### 出错了会怎样？

| 场景 | 表现 |
|------|------|
| ACP 还没准备好 | 503，提示 retry |
| 请求体超 10MB | 直接断开 |
| 单次请求超时（默认 5 分钟） | 停止响应，已输出的内容保留 |
| WPS 网关不可达 | 502，提示 Gateway unreachable |
| 网关返回业务错误 | 400，透传网关的错误信息 |
| ACP 进程崩溃 | 2 秒后自动重启 |

---

### 还能怎么优化？

**cursor-proxy 侧：**
- 常驻进程 + 会话复用已经是最大优化
- 可关闭 thinking 转发（`CURSOR_PROXY_FORWARD_THINKING=false`）减少流量

**wps-proxy 侧：**
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
- Cursor Agent CLI（ACP 协议）
- OpenClaw 2026.3.x
- macOS LaunchAgent（进程托管）

---

_部署遇到问题？查看 [docs/09-troubleshooting.md](docs/09-troubleshooting.md) 或提 Issue。_
