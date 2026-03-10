# 企业 AI Gateway Proxy

将企业内网 AI 网关转换为 OpenAI 兼容接口，供 OpenClaw 直接调用。

## 架构

```
OpenClaw Gateway → gateway-proxy (localhost:3010) → 企业 AI 网关 (enterprise-gateway.example.com)
```

proxy.mjs 负责：

- 将 OpenAI 格式的 `chat/completions` 请求转换为 企业网关 V2 协议
- 将 企业网关响应转换回 OpenAI 格式（支持流式/非流式）
- 透传 Tool Calling（工具调用）
- 自动剥离 base64 截图等大体积内容，节省 token

## 前置条件

- Node.js >= 18（使用原生 fetch）
- 需在公司内网环境，能访问 `enterprise-gateway.example.com`

## 启动

```bash
# 必须先配置 GATEWAY_TOKEN
export GATEWAY_TOKEN=<your-token>

npm start
# 或
node proxy.mjs
```

看到 `企业 AI Proxy 已启动 → http://127.0.0.1:3010/v1` 表示成功。

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
| `GATEWAY_URL` | `http://enterprise-gateway.example.com/api/v2/llm/chat` | 网关地址 |
| `GATEWAY_TOKEN` | **必须配置** | Bearer Token |
| `GATEWAY_UID` | `9010` | AI-Gateway-Uid |
| `GATEWAY_PRODUCT` | `kdocs-as-baseserver` | AI-Gateway-Product-Name |
| `GATEWAY_INTENTION` | `kdocs_as_assistant_intentrecognize` | AI-Gateway-Intention-Code |

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

详见 [模型配置文档](../docs/02-models.md) 中的「方案 A: 企业 AI 网关」。
