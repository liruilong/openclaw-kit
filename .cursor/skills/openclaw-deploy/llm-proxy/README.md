# OpenAI Agent Proxy

将本地 `agent` 命令封装为兼容 OpenAI Chat API 的代理服务器。

## 安装

```bash
npm install
```

## 启动

```bash
npm start
```

或指定端口和默认模型：

```bash
PORT=8080 DEFAULT_MODEL=opus-4.6 npm start
```

## API 接口

### POST /v1/chat/completions

兼容 OpenAI Chat Completions API。

**请求示例（非流式）：**

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "opus-4.6",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": false
  }'
```

**响应示例：**

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677858242,
  "model": "opus-4.6",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "你好！我在这儿..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

**请求示例（流式）：**

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "opus-4.6",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": true
  }'
```

**流式响应示例：**

```
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1677858242,"model":"opus-4.6","choices":[{"index":0,"delta":{"role":"assistant","content":"你"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1677858242,"model":"opus-4.6","choices":[{"index":0,"delta":{"content":"好"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1677858242,"model":"opus-4.6","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

### GET /v1/models

列出可用模型。

```bash
curl http://localhost:3000/v1/models
```

### GET /health

健康检查。

```bash
curl http://localhost:3000/health
```

## 与 OpenAI SDK 配合使用

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'not-needed'  // 代理不验证 API Key
});

// 非流式
const response = await client.chat.completions.create({
  model: 'opus-4.6',
  messages: [{ role: 'user', content: '你好' }]
});
console.log(response.choices[0].message.content);

// 流式
const stream = await client.chat.completions.create({
  model: 'opus-4.6',
  messages: [{ role: 'user', content: '你好' }],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

## 配置环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务器端口 |
| `DEFAULT_MODEL` | opus-4.6 | 默认使用的模型 |

