# MCP 远程工具集成

## 概述

通过 Model Context Protocol (MCP) 的 HTTP transport，OpenClaw 可以远程调用局域网内其他主机上的 MCP 服务，扩展 Agent 的工具能力（如智能家居控制、桌面角色互动、消息通知等）。

## MCP 管理策略：分层架构

不同类型的 MCP server 应放在不同的配置位置，避免重复和混乱：

| 层级 | 配置位置 | 放什么 | 原因 |
|------|---------|--------|------|
| **Cursor MCP** | `~/.cursor/mcp.json` | 编码相关 MCP（如 `openclaw-gateway`） | Cursor IDE 直接调用，换模型不影响 |
| **mcporter** | `~/.mcporter/mcporter.json` | 非编码通用工具（智能家居、语音角色等） | 任何渠道（iMessage、webchat 等）均可调用 |

**原则：** 如果一个 MCP 只在 Cursor 编码时用，放 Cursor 配置；如果 Agent 在任何渠道都需要用，放 mcporter。两者不要重复配置同一个 MCP server。

## 架构

```
                          ┌─ Cursor MCP ──→ openclaw-gateway（编码工具）
                          │
OpenClaw Agent ───────────┤
                          │                 ┌─ game-character（桌面角色/语音）
                          └─ mcporter ──────┤
                                            ├─ homeassistant（智能家居）
                                            └─ ...（更多通用工具）
```

## 远程 MCP 服务端要求

MCP 服务需同时支持 Streamable HTTP transport，监听一个 HTTP 端口供远程调用：

```javascript
// 示例：同时提供 Stdio + HTTP 两种 transport
const server = new McpServer({ name: "my-service", version: "1.0.0" });

// Stdio（供本地 Cursor IDE 使用）
const stdioTransport = new StdioServerTransport();
await server.connect(stdioTransport);

// HTTP（供远程 OpenClaw 使用）
const httpTransport = new StreamableHTTPServerTransport({ endpoint: "/mcp" });
app.use("/mcp", httpTransport.requestHandler);
app.listen(Number(process.env.MCP_HTTP_PORT) || 9884);
```

确保：
- 防火墙允许对应端口入站
- 两台主机在同一局域网（或通过 VPN/SSH 隧道连通）

## OpenClaw 端配置（mcporter）

### 添加远程服务

```bash
npx mcporter config add <service-name> --url http://<remote-host>:<port>/mcp --scope home
```

配置文件位于 `~/.mcporter/mcporter.json`：

```json
{
  "mcpServers": {
    "<service-name>": {
      "baseUrl": "http://<remote-host>:<port>/mcp"
    }
  }
}
```

### 验证连接

```bash
# 列出远程工具
npx mcporter list <service-name> --schema

# 调用工具
npx mcporter call <service-name>.<tool-name> param1="value1" param2="value2"
```

## Agent 工作区配置

在 `~/clawd/` 下的文件中告知 Agent 可用的远程工具：

### TOOLS.md

记录工具调用方式和参数：

```markdown
## 远程 MCP 工具

### <service-name>

调用方式：
\`\`\`bash
npx mcporter call <service-name>.<tool-name> param1="value1"
\`\`\`

可用工具：
- `tool_a` — 功能描述
- `tool_b` — 功能描述
```

### AGENTS.md

添加使用规则，例如何时调用、参数选择指南等：

```markdown
## 工具使用规则

- 需要通知用户时，通过 `<service-name>.<notify-tool>` 发送通知
- 查询数据时，优先使用 `<service-name>.<query-tool>`
```

## 实例：Home Assistant 智能家居

Home Assistant 内置了 MCP Server 集成（SSE transport），可直接通过 mcporter 接入。

### 添加配置

```bash
npx mcporter config add homeassistant \
  --url http://<HA-IP>:8123/mcp_server/sse \
  --scope home
```

### 可用工具（14个）

| 工具 | 功能 |
|------|------|
| `HassTurnOn` / `HassTurnOff` | 开关设备（支持 name/area/floor/domain 参数） |
| `HassLightSet` | 设置灯光亮度/颜色 |
| `HassClimateSetTemperature` | 设置空调温度 |
| `HassFanSetSpeed` | 设置风扇速度 |
| `HassMediaPause` / `HassMediaUnpause` | 媒体暂停/继续 |
| `HassMediaNext` / `HassMediaPrevious` | 上一首/下一首 |
| `HassSetVolume` / `HassSetVolumeRelative` | 音量控制 |
| `HassMediaSearchAndPlay` | 搜索并播放媒体 |
| `HassCancelAllTimers` | 取消所有定时器 |
| `GetLiveContext` | 获取所有设备状态概览 |

### 使用示例

```bash
# 关闭书房的灯
npx mcporter call homeassistant.HassTurnOff area=书房 'domain=["light"]'

# 设置空调温度
npx mcporter call homeassistant.HassClimateSetTemperature area=主卧 temperature=26

# 查看所有设备状态
npx mcporter call homeassistant.GetLiveContext
```

### 注意事项

- 使用 `area` 参数按房间控制最方便
- 用 `domain` 过滤设备类型：`light`, `switch`, `fan`, `climate`, `media_player`
- 部分灯通过智能开关控制（如展柜灯），domain 需用 `switch` 而非 `light`

## 实例：Game Character 桌面角色

Windows 桌面端运行的虚拟角色 MCP 服务，支持语音合成和表情动画。

```bash
npx mcporter config add game-character \
  --url http://<Windows-IP>:9884/mcp \
  --scope home
```

### 可用工具

| 工具 | 功能 |
|------|------|
| `character_speak` | 角色语音说话（支持表情动画） |
| `character_animate` | 触发角色动画（无语音） |
| `tts_synthesize` | 合成语音文件 |
| `get_status` | 查询 TTS 和连接状态 |

### 使用示例

```bash
npx mcporter call game-character.character_speak \
  text="你好主人！" lang=zh emotion=Happy
```

支持表情：Happy, Confused, Sad, Fun, Agree, Drink, Wave, Think
支持语言：ja, zh, en, ko, yue

## 前提条件

- 远程主机上的 MCP 服务需保持运行
- 防火墙允许对应端口入站
- OpenClaw 主机与远程主机网络可达
