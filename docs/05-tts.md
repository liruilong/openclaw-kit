# TTS 语音合成

## 概述

OpenClaw 支持多种 TTS 引擎为消息生成语音回复。当前配置使用 Edge TTS（微软免费方案），但已关闭自动语音回复。

## 当前配置

配置路径：`messages.tts`

```json
{
  "auto": "off",
  "provider": "edge",
  "edge": {
    "enabled": true,
    "voice": "zh-CN-XiaoyiNeural",
    "lang": "zh-CN",
    "outputFormat": "audio-24khz-48bitrate-mono-mp3",
    "rate": "+0%",
    "pitch": "+0%"
  }
}
```

| 参数 | 说明 |
|------|------|
| `auto` | `"always"`（每条消息自动语音）/ `"off"`（关闭） |
| `provider` | TTS 提供商：`edge` / `elevenlabs` / `openai` |
| `edge.voice` | Edge TTS 语音角色 |
| `edge.lang` | 语言代码 |

### 为什么 auto 设为 off

开启 TTS 自动回复（`auto: "always"`）时，与 iMessage 配合会导致消息循环问题（详见 [iMessage 配置](04-imessage.md)）。当前已关闭。

## 支持的 TTS 提供商

### Edge TTS（当前使用）

微软 Edge 的在线神经 TTS 服务，**免费、无需 API Key**。

常用中文语音：
- `zh-CN-XiaoxiaoNeural` — 女声，温暖自然
- `zh-CN-XiaoyiNeural` — 女声，活泼可爱（当前）
- `zh-CN-YunxiNeural` — 男声
- `zh-CN-YunyangNeural` — 男声，新闻播报风格

### ElevenLabs

高质量 TTS，需要 API Key，付费。

### OpenAI TTS

OpenAI 的 TTS API，需要 API Key。

## 配置命令

```bash
# 开启自动 TTS
openclaw config set messages.tts.auto '"always"'

# 关闭自动 TTS
openclaw config set messages.tts.auto '"off"'

# 修改语音角色
openclaw config set messages.tts.edge.voice '"zh-CN-XiaoxiaoNeural"'
```

## 远程语音通知（MCP）

除了 iMessage 内置 TTS，还可以通过远程 MCP 工具进行语音通知。详见 [MCP 远程工具集成](06-mcp-integration.md)。
