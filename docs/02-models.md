# 模型配置

## 当前使用的模型提供商：火山引擎（Volcengine / 豆包）

### Provider 配置

配置路径：`models.providers.doubao`

```json
{
  "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
  "apiKey": "<火山方舟 API Key>",
  "api": "openai-completions"
}
```

- `baseUrl`: 火山方舟的 OpenAI 兼容 API 端点
- `api`: 使用 `openai-completions` 兼容模式
- API Key 在 [火山方舟控制台](https://console.volcengine.com/ark/) 获取

### 已配置的模型

| 模型 ID | 名称 | 用途 | 上下文窗口 | 最大输出 |
|---------|------|------|-----------|---------|
| `doubao-seed-1-8-251228` | Doubao Seed 1.8 | Fallback 模型，支持图片 | 64K | 64K |
| `doubao-1.5-pro-32k-250115` | Doubao 1.5 Pro | **主模型** | 32K | 12K |
| `doubao-1.5-lite-32k-250115` | Doubao 1.5 Lite | Heartbeat 轻量模型 | 32K | 4K |

> 注意：模型 ID 实际上是火山方舟的**推理接入点（Endpoint）ID**，需要先在控制台创建。

### Agent 默认模型

配置路径：`agents.defaults.model`

```json
{
  "primary": "doubao/doubao-1.5-pro-32k-250115",
  "fallbacks": ["doubao/doubao-seed-1-8-251228"]
}
```

### Heartbeat 模型

配置路径：`agents.defaults.heartbeat`

```json
{
  "every": "30m",
  "model": "doubao/doubao-1.5-lite-32k-250115"
}
```

使用 Lite 模型做心跳检查，节省成本。

### 配置命令

```bash
# 查看已配置模型
openclaw models list

# 查看模型状态
openclaw models status

# 设置默认模型
openclaw models set doubao/doubao-1.5-pro-32k-250115

# 添加模型 fallback
openclaw models fallbacks add doubao/doubao-seed-1-8-251228
```

### 添加新模型

在 `openclaw.json` 的 `models.providers.doubao.models` 数组中添加：

```json
{
  "id": "<endpoint-id>",
  "name": "模型显示名",
  "reasoning": false,
  "input": ["text", "image"],
  "contextWindow": 65535,
  "maxTokens": 65535
}
```

### Embedding 模型（待配置）

记忆搜索需要 embedding 模型。方案有：

1. **本地 Ollama**（推荐免费方案）：在 Mac 上运行 Ollama + `nomic-embed-text`
2. **火山引擎 embedding**：需在控制台创建 `doubao-embedding` endpoint
3. **硅基流动（SiliconFlow）**：免费额度，`https://api.siliconflow.cn/v1`

详见 [记忆系统](08-memory.md)。

### 国内模型推荐

| 模型提供商 | Tool Use 能力 | 性价比 | OpenAI 兼容 |
|-----------|-------------|--------|-----------|
| 豆包 Doubao（当前） | 强 | 高 | 是 |
| Qwen（通义千问） | 很强 | 高 | 是 |
| GLM-4（智谱） | 不错 | 极高（有免费额度） | 是 |
| DeepSeek | 一般 | 极高 | 是 |
| Moonshot（Kimi） | 好 | 中 | 是 |
