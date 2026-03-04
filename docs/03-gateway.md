# Gateway 与 Dashboard

## Gateway 配置

配置路径：`gateway`

```json
{
  "port": 18789,
  "mode": "local",
  "bind": "lan",
  "controlUi": {
    "allowedOrigins": [
      "http://localhost:18789",
      "http://127.0.0.1:18789",
      "http://192.168.2.2:18789"
    ]
  },
  "auth": {
    "mode": "token",
    "token": "<gateway-token>"
  },
  "tailscale": {
    "mode": "off",
    "resetOnExit": false
  },
  "http": {
    "endpoints": {
      "chatCompletions": { "enabled": true }
    }
  }
}
```

### 关键参数

| 参数 | 说明 |
|------|------|
| `port` | Gateway 监听端口，默认 18789 |
| `bind` | 绑定范围：`loopback`（仅本机）或 `lan`（局域网） |
| `controlUi.allowedOrigins` | Dashboard 允许的来源 URL（CORS） |
| `auth.mode` | 认证模式：`token` 或 `none` |
| `http.endpoints.chatCompletions` | 启用 OpenAI 兼容的 chat completions 端点 |

### 为什么设置 `bind: "lan"`

默认 `bind` 为 `loopback`，只允许本机访问。设为 `lan` 后允许同局域网的 Windows 主机（192.168.2.63）通过浏览器访问 Dashboard。

## Dashboard 访问

```bash
# 获取带 token 的 Dashboard URL
openclaw dashboard --no-open

# 直接在浏览器打开
openclaw dashboard
```

Dashboard URL 格式：
```
http://192.168.2.2:18789/?token=<gateway-token>
```

### 从 Windows 远程访问

方式一：直接访问（需要 `bind: "lan"` + `allowedOrigins` 包含 Mac IP）
```
http://192.168.2.2:18789/?token=<token>
```

方式二：SSH 端口转发
```bash
ssh -L 18789:127.0.0.1:18789 drakgon@192.168.2.2
# 然后在 Windows 浏览器访问 http://127.0.0.1:18789
```

### 常用 Gateway 命令

```bash
# 启动
openclaw gateway

# 强制启动（杀占用端口的进程）
openclaw gateway --force

# 重启服务
openclaw gateway restart

# 查看健康状态
openclaw health

# 查看频道与会话状态
openclaw status
```
