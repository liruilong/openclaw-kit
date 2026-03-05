# MCP 远程工具集成

## 概述

通过 Model Context Protocol (MCP) 的 HTTP transport，OpenClaw 可以远程调用局域网内其他主机上的 MCP 服务，扩展 Agent 的工具能力（如文件操作、数据库查询、消息通知等）。

## 架构

```
┌─────────────────────┐      HTTP (Streamable HTTP)      ┌──────────────────────┐
│   OpenClaw 主机      │  ─────────────────────────────→  │  远程 MCP 服务主机    │
│   (via mcporter)    │                                   │  (任意 MCP Server)   │
│                     │  ←─────────────────────────────   │                      │
└─────────────────────┘       JSON-RPC Response           └──────────────────────┘
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

## 前提条件

- 远程主机上的 MCP 服务需保持运行
- 防火墙允许对应端口入站
- OpenClaw 主机与远程主机网络可达
