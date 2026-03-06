# WPS AI Gateway Proxy

将 WPS 内网 AI 网关转换为 OpenAI 兼容接口，供 OpenClaw 直接调用。

## 架构

```
OpenClaw Gateway → wps-proxy (localhost:3010) → WPS AI 网关 (ai-gateway.wps.cn)
```

proxy.mjs 负责：

- 将 OpenAI 格式的 `chat/completions` 请求转换为 WPS 网关 V2 协议
- 将 WPS 网关响应转换回 OpenAI 格式（支持流式/非流式）
- 透传 Tool Calling（工具调用）
- 自动剥离 base64 截图等大体积内容，节省 token

## 前置条件

- Node.js >= 18（使用原生 fetch）
- 需在公司内网环境，能访问 `ai-gateway.wps.cn`

## 启动

```bash
# 必须先配置 WPS_TOKEN
export WPS_TOKEN=<your-token>

npm start
# 或
node proxy.mjs
```

看到 `WPS AI Proxy 已启动 → http://127.0.0.1:3010/v1` 表示成功。

### 指定默认模型

通过 `--model` 参数指定默认模型（不指定则默认 `claude-opus-4-5`）：

```bash
# 使用 Opus 4.5（默认）
node proxy.mjs

# 使用 Sonnet 4.5
node proxy.mjs --model claude-sonnet-4-5
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3010` | 监听端口 |
| `WPS_GATEWAY_URL` | `http://ai-gateway.wps.cn/api/v2/llm/chat` | 网关地址 |
| `WPS_TOKEN` | **必须配置** | Bearer Token |
| `WPS_UID` | `9010` | AI-Gateway-Uid |
| `WPS_PRODUCT` | `kdocs-as-baseserver` | AI-Gateway-Product-Name |
| `WPS_INTENTION` | `kdocs_as_assistant_intentrecognize` | AI-Gateway-Intention-Code |

## 可用模型

| 模型 ID | 说明 |
|---------|------|
| `claude-opus-4-5` | Claude Opus 4.5（默认） |
| `claude-sonnet-4-5` | Claude Sonnet 4.5 |

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/v1/chat/completions` | POST | Chat Completions（流式/非流式） |
| `/v1/models` | GET | 可用模型列表 |

## OpenClaw 配置

详见 [模型配置文档](../docs/02-models.md) 中的「方案 D: 企业 AI 网关」。

## 与 cursor-proxy 配合使用

两个代理可同时运行，通过 OpenClaw 命令切换：

```bash
# 日常聊天用 WPS（零成本）
openclaw models set wps/claude-opus-4-5

# 复杂任务用 Cursor（强推理 + 工具调用）
openclaw models set cursor-local/opus-4.6
```
