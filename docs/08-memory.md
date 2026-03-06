# 记忆系统

## 概述

OpenClaw 提供两种记忆机制：

1. **memory-core**（已启用）— 基于文件的记忆搜索，使用 SQLite + 向量索引
2. **memory-lancedb**（未启用）— 基于 LanceDB 的长期记忆，支持自动捕获和回忆

## memory-core（当前使用）

### 状态

```bash
openclaw memory status
```

输出示例：
```
Memory Search (main)
Provider: openai (requested: auto)
Model: text-embedding-3-small
Sources: memory
Indexed: 0/3 files · 0 chunks
Store: ~/.openclaw/memory/main.sqlite
```

### 问题：Embedding 未配置

memory-core 默认使用 OpenAI 的 `text-embedding-3-small` 模型，但未配置 API Key，导致无法建立向量索引。

### 解决方案：本地 Ollama Embedding

在 Mac 上安装 Ollama，运行本地 embedding 模型，免费且离线可用。

#### 1. 安装 Ollama

```bash
brew install ollama
```

#### 2. 启动 Ollama 服务

```bash
ollama serve
```

或配置为 LaunchAgent 自动启动。

#### 3. 拉取 embedding 模型

```bash
# 推荐：nomic-embed-text（~274MB，效果好）
ollama pull nomic-embed-text

# 替代方案
ollama pull bge-m3          # 多语言，更大但效果更好
ollama pull all-minilm       # 最小，~45MB
```

#### 4. 配置 OpenClaw 使用本地 embedding

配置路径：`agents.defaults.memorySearch`

```json
{
  "provider": "openai",
  "model": "nomic-embed-text",
  "remote": {
    "baseUrl": "http://127.0.0.1:11434/v1",
    "apiKey": "ollama"
  }
}
```

> provider 设为 `openai` 是因为 Ollama 兼容 OpenAI API 格式。apiKey 随便填（Ollama 不验证）。

通过 Python 脚本修改配置：

```python
import json, os
p = os.path.expanduser("~/.openclaw/openclaw.json")
with open(p, "r") as f:
    c = json.load(f)
c["agents"]["defaults"]["memorySearch"] = {
    "provider": "openai",
    "model": "nomic-embed-text",
    "remote": {
        "baseUrl": "http://127.0.0.1:11434/v1",
        "apiKey": "ollama"
    }
}
with open(p, "w") as f:
    json.dump(c, f, indent=2, ensure_ascii=False)
```

#### 5. 重启 Gateway 并重建索引

```bash
openclaw gateway restart
openclaw memory index --force
```

#### 6. 验证

```bash
openclaw memory status
# 应显示：
# Provider: openai (requested: openai)
# Model: nomic-embed-text
# Indexed: 3/3 files · 2 chunks
# Vector dims: 768
# Dirty: no

openclaw memory search --query "搜索关键词"
```

## memory-lancedb（可选，未启用）

更强大的向量记忆系统，支持自动捕获和回忆。

### 启用

```bash
openclaw plugins enable memory-lancedb
```

### 配置

需要在 `plugins.entries.memory-lancedb` 中配置：

```json
{
  "enabled": true,
  "embedding": {
    "apiKey": "<api-key>",
    "model": "text-embedding-3-small",
    "baseUrl": "http://127.0.0.1:11434/v1",
    "dimensions": 768
  },
  "autoCapture": true,
  "autoRecall": true
}
```

使用 Ollama 本地 embedding 时：
- `baseUrl`: `http://127.0.0.1:11434/v1`
- `model`: `nomic-embed-text`
- `dimensions`: 768（nomic-embed-text 的维度）
- `apiKey`: 随便填一个（Ollama 不验证，但字段必须有值）

### 其他 Embedding 方案

| 方案 | baseUrl | 模型 | 维度 | 成本 |
|------|---------|------|------|------|
| Ollama 本地 | `http://127.0.0.1:11434/v1` | `nomic-embed-text` | 768 | 免费 |
| 火山引擎 | `https://ark.cn-beijing.volces.com/api/v3` | `<endpoint-id>` | 2560 | 极低 |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `BAAI/bge-m3` | 1024 | 免费额度 |
| OpenAI | 默认 | `text-embedding-3-small` | 1536 | 付费 |

## 记忆文件

Agent 的记忆存储在 `~/agent-workspace/memory/` 目录下：

```
~/agent-workspace/memory/
├── 2026-03-02.md    # 每日记忆
├── 2026-03-03.md
└── ...
```

Agent 会自动在每日文件中记录重要的对话内容和事件。
