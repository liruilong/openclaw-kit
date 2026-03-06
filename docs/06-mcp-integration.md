# MCP 工具集成

## 概述

OpenClaw 通过内置的 **mcporter** skill 调用 MCP 工具。Agent 使用 `npx mcporter call` 命令与 MCP 服务交互。

## 🔴 调用格式（必读）

mcporter 使用 **点号连接** 服务名和工具名，参数用 **key=value** 格式，**不要传 JSON**。

```bash
# ✅ 正确：key=value 格式
npx mcporter call kad.search_wiki_list keyword="openclaw" page_size=3 drive_ids='[]'
npx mcporter call kad.get_drive_info_by_link_id link_id="cp7iZTCWNFeB"
npx mcporter call homeassistant.HassTurnOff area=书房 'domain=["light"]'
npx mcporter call game-character.character_speak text="你好" emotion="Happy" lang="zh"

# ❌ 错误：不要传 JSON 对象
npx mcporter call kad.search_wiki_list '{"keyword":"openclaw","page_size":3}'
npx mcporter call kad.search_wiki_list --params '{"keyword":"openclaw"}'
```

**数组参数**用引号包裹：`'domain=["light"]'` 或 `drive_ids='[]'`

## MCP 管理策略

| 层级 | 配置位置 | 放什么 | 原因 |
|------|---------|--------|------|
| **Cursor MCP** | `~/.cursor/mcp.json` | 编码相关 MCP（如 `openclaw-gateway`） | Cursor IDE 直接调用 |
| **mcporter** | `~/.mcporter/mcporter.json` | 通用工具（知识库、智能家居、语音角色等） | 任何渠道（iMessage、webchat 等）均可调用 |

**原则**：编码专用 MCP 放 Cursor 配置；Agent 通用 MCP 放 mcporter。不要重复配置。

## 架构

```
                          ┌─ Cursor MCP ──→ openclaw-gateway（编码工具）
                          │
OpenClaw Agent ───────────┤
                          │                 ┌─ kad（金山文档知识库）
                          └─ mcporter ──────┤─ game-character（桌面角色互动）
                                            ├─ playwright（浏览器自动化）
                                            ├─ homeassistant（智能家居）
                                            └─ ...（更多服务）
```

## mcporter 配置

配置文件：`~/.mcporter/mcporter.json`

### HTTP 类服务（如 kad 知识库）

```json
{
  "mcpServers": {
    "kad": {
      "baseUrl": "http://kmcp.wps.cn/kad/wiki/mcp",
      "headers": {
        "cookie": "wps_sid=xxx;kso_sid=yyy"
      }
    }
  }
}
```

cookie 获取：浏览器登录 [金山文档](https://www.kdocs.cn) → 开发者工具 → Application → Cookies → 复制 `wps_sid` 和 `kso_sid`

### STDIO 类服务（本地进程）

```json
{
  "mcpServers": {
    "game-character": {
      "command": "node",
      "args": ["/path/to/game-character-mcp/dist/index.js"],
      "env": { "AUTO_LAUNCH": "false" }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### 添加远程服务

```bash
npx mcporter config add <service-name> --url http://<host>:<port>/mcp --scope home
```

### 验证

```bash
# 列出所有服务和工具
npx mcporter list

# 列出指定服务的工具详情
npx mcporter list <service-name> --schema

# 调用工具
npx mcporter call <service-name>.<tool-name> param1="value1" param2="value2"
```

## 当前服务清单

| 服务 | 类型 | 工具数 | 说明 |
|------|------|--------|------|
| kad | HTTP | 6 | 金山文档知识库（搜索、召回文档内容） |
| game-character | STDIO | 4 | 桌面角色互动（语音、动画、TTS） |
| playwright | STDIO | 22 | 浏览器自动化（导航、截图、交互） |

### kad 常用工具

```bash
# 搜索文档列表
npx mcporter call kad.search_wiki_list keyword="关键词" page_size=5 drive_ids='[]'

# 根据链接获取文档信息
npx mcporter call kad.get_drive_info_by_link_id link_id="cp7iZTCWNFeB"

# 搜索文档内容片段
npx mcporter call kad.search_wiki_detail query="关键词" scene="full_folder_recall" drives='[]'
```

### game-character 常用工具

```bash
# 角色说话（带表情和 TTS）
npx mcporter call game-character.character_speak text="你好" emotion="Happy" lang="zh"

# 触发角色动画
npx mcporter call game-character.character_animate emotion="Wave"

# 检查连接状态
npx mcporter call game-character.get_status
```

## 实例：Home Assistant 智能家居

```bash
# 添加配置
npx mcporter config add homeassistant --url http://<HA-IP>:8123/mcp_server/sse --scope home

# 关闭书房的灯
npx mcporter call homeassistant.HassTurnOff area=书房 'domain=["light"]'

# 设置空调温度
npx mcporter call homeassistant.HassClimateSetTemperature area=主卧 temperature=26

# 查看所有设备状态
npx mcporter call homeassistant.GetLiveContext
```

## 远程 MCP 服务端要求

如果需要远程调用其他主机上的 MCP 服务，服务端需支持 HTTP transport：

```javascript
const server = new McpServer({ name: "my-service", version: "1.0.0" });

// Stdio（供本地使用）
await server.connect(new StdioServerTransport());

// HTTP（供远程 mcporter 调用）
const httpTransport = new StreamableHTTPServerTransport({ endpoint: "/mcp" });
app.use("/mcp", httpTransport.requestHandler);
app.listen(Number(process.env.MCP_HTTP_PORT) || 9884);
```

确保防火墙允许对应端口入站，且主机间网络可达。
