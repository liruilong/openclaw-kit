# Gateway 与 Dashboard

## Gateway 配置

配置路径：`gateway`

```json
{
  "port": 39521,
  "mode": "local",
  "bind": "loopback",
  "controlUi": {
    "allowedOrigins": [
      "http://localhost:39521",
      "http://127.0.0.1:39521"
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
| `port` | Gateway 监听端口，推荐 39521 |
| `bind` | 绑定范围：`loopback`（仅本机）或 `lan`（局域网） |
| `controlUi.allowedOrigins` | Dashboard 允许的来源 URL（CORS） |
| `auth.mode` | 认证模式：`token` 或 `none` |
| `http.endpoints.chatCompletions` | 启用 OpenAI 兼容的 chat completions 端点 |

### bind 模式说明

- `loopback`（推荐）：仅本机访问，最安全
- `lan`：允许同局域网的其他主机访问 Dashboard，需注意安全风险

## Dashboard 访问

```bash
# 获取带 token 的 Dashboard URL
openclaw dashboard --no-open

# 直接在浏览器打开
openclaw dashboard
```

Dashboard URL 格式：
```
http://localhost:39521/?token=<gateway-token>
```

### 从其他主机远程访问

推荐使用 SSH 端口转发（无需将 bind 改为 `lan`）：
```bash
ssh -L 39521:127.0.0.1:39521 <username>@<Mac-IP>
# 然后在远程浏览器访问 http://127.0.0.1:39521
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
