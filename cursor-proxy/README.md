# Cursor ACP Proxy

将 Cursor Agent CLI（`agent acp`）封装为 OpenAI 兼容 API 的代理服务器。

## 与旧版 llm-proxy 的区别

| 特性 | llm-proxy（旧） | cursor-proxy（新） |
|------|-----------------|-------------------|
| 架构 | 每次请求 `spawn("agent", ["-p", ...])` | 启动时创建一个常驻 `agent acp` 子进程 |
| 后续请求延迟 | 13-27秒（每次冷启动） | **2-3秒**（零冷启动） |
| 进程管理 | 每请求一个进程 | 一个常驻进程 |
| 通信协议 | stdin/stdout 文本 | JSON-RPC 2.0（ACP 协议） |
| 崩溃恢复 | 无 | 自动重启（2秒后） |

## 前置条件

1. 安装 Cursor CLI：`curl https://cursor.com/install -fsS | bash`
2. 登录：`agent login`
3. 有 Cursor Pro/Ultra/Teams 订阅

## 启动

```bash
npm start
```

或指定配置：

```bash
CURSOR_PROXY_PORT=18790 CURSOR_WORKSPACE_DIR=~/clawd npm start
```

## API 接口

### POST /v1/chat/completions

兼容 OpenAI Chat Completions API，支持流式和非流式。

```bash
curl http://localhost:18790/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "opus-4.6",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": false
  }'
```

### GET /v1/models

列出可用模型（自动从 `agent --list-models` 获取）。

### GET /v1/health

健康检查，返回 ACP 进程状态。

```bash
curl http://localhost:18790/v1/health
# 返回：{ "mode": "acp", "acp": { "running": true, "uptime": 3600, ... } }
```

## 配置环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CURSOR_PROXY_PORT` | 18790 | 服务器端口 |
| `CURSOR_WORKSPACE_DIR` | 空 | Agent 默认工作目录 |
| `CURSOR_PATH` | 自动检测 | agent CLI 路径 |
| `CURSOR_MODEL` | 空（auto） | 强制指定模型 |
| `CURSOR_PROXY_API_KEY` | 空 | API 密钥认证（空则不验证） |
| `CURSOR_PROXY_FORWARD_THINKING` | false | 是否转发 thinking 内容 |
| `CURSOR_PROXY_REQUEST_TIMEOUT` | 300000 | 请求超时（毫秒） |

## 与 openclaw-cursor-brain 插件的关系

`openclaw-cursor-brain` 插件会自动管理本 proxy 的生命周期（随 Gateway 启动/停止）。
如果使用该插件，**不需要手动启动本 proxy**。

手动使用场景：
- 不使用 openclaw-cursor-brain 插件
- 调试或开发时需要独立运行
- 需要在其他项目中复用

## ACP 协议参考

- [Cursor ACP 文档](https://cursor.com/docs/cli/acp)
- [Agent Client Protocol](https://agentclientprotocol.com/)
