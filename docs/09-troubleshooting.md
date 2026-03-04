# 常见问题与故障排查

## SSH 相关

### 问题：SSH 密码认证繁琐

**解决方案**：使用 SSH Key 认证

```bash
# 在 Windows 上生成密钥
ssh-keygen -t ed25519

# 复制公钥到 Mac
ssh-copy-id drakgon@192.168.2.2

# 或手动添加
ssh drakgon@192.168.2.2 "cat >> ~/.ssh/authorized_keys" < ~/.ssh/id_ed25519.pub
```

## npm / Node.js 相关

### 问题：`npm` 命令找不到

SSH 非交互式 shell 的 PATH 可能不完整。

**解决方案**：在命令前加 `export PATH=/usr/local/bin:/usr/bin:/bin:$PATH`

### 问题：npm 缓存权限错误（EACCES）

```bash
sudo chown -R $(id -u):$(id -g) ~/.npm
```

## iMessage 相关

### 问题：imsg "Bad CPU type in executable"

Homebrew 安装的 ARM64 binary 无法在 Intel Mac 上运行。

**解决方案**：手动下载 universal binary，详见 [iMessage 配置](04-imessage.md)。

### 问题：imsg "permissionDenied" for chat.db

**解决方案**：给 `/usr/local/bin/node` 授予 Full Disk Access 权限。

`系统设置 → 隐私与安全性 → 完全磁盘访问权限 → 添加 node`

### 问题：imsg "PhoneNumberKit resource_bundle not found"

`imsg` 需要的资源包缺失。

**解决方案**：将 bundle 文件复制到 imsg 同目录：

```bash
sudo cp PhoneNumberKit_PhoneNumberKit.bundle /usr/local/bin/
sudo cp SQLite.swift_SQLite.bundle /usr/local/bin/
```

### 问题：imsg send 超时（rpc timeout）

Node 进程缺少 Automation 权限。

**解决方案**：在 Mac 终端手动运行一次 `imsg send` 触发系统权限弹窗，授权后即可。

### 问题：iMessage 消息无限循环

Mac 和 iPhone 使用同一 Apple ID 导致消息回环。

**解决方案**：
1. **紧急停止**：`openclaw config set channels.imessage.enabled false && openclaw gateway restart`
2. **根本解决**：iPhone iMessage 使用不同的 Apple ID

## Gateway 相关

### 问题：Dashboard "origin not allowed"

`allowedOrigins` 未包含访问来源。

**解决方案**：添加来源到配置：

```bash
# 通过 Python 脚本修改 JSON（避免 shell 转义问题）
python3 -c "
import json
with open('$HOME/.openclaw/openclaw.json') as f: d=json.load(f)
d['gateway']['controlUi']['allowedOrigins'].append('http://192.168.2.2:18789')
with open('$HOME/.openclaw/openclaw.json','w') as f: json.dump(d,f,indent=2)
"
openclaw gateway restart
```

### 问题：Dashboard "unauthorized: gateway token missing"

访问 URL 缺少 token 参数。

**解决方案**：

```bash
# 获取带 token 的完整 URL
openclaw dashboard --no-open
```

### 问题：Gateway 端口被占用

```bash
# 强制启动（自动杀掉占用端口的进程）
openclaw gateway --force
```

## 模型相关

### 问题：OpenClaw shell 配置时被限流

国内模型 API 可能有频率限制。

**解决方案**：
- 等待几分钟后重试
- 使用 Dashboard 进行配置操作（减少 API 调用）
- 配置 fallback 模型分散请求

## MCP 相关

### 问题：OpenClaw 不知道 game-character MCP 工具

mcporter 配置好了，但 Agent 在对话中不知道有这个工具。

**解决方案**：在 `~/clawd/TOOLS.md` 中详细写明工具信息和调用方式，在 `~/clawd/AGENTS.md` 中添加使用规则。Agent 通过读取这些文件来了解可用工具。

### 问题：MCP HTTP 端口未开放

Cursor IDE 的 MCP 进程需要重启才能加载新代码。

**解决方案**：在 Cursor 的 MCP 设置面板中手动重启 `game-character` 服务，或重新加载 Cursor 窗口（`Ctrl+Shift+P → Reload Window`）。
