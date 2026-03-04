# 安装与迁移

## 从 Clawdbot 迁移到 OpenClaw

OpenClaw 的前身叫 Clawdbot，迁移过程如下：

### 1. 卸载 Clawdbot

```bash
# 停止并移除 LaunchAgent 服务
launchctl unload ~/Library/LaunchAgents/com.clawdbot.gateway.plist
rm ~/Library/LaunchAgents/com.clawdbot.gateway.plist

# 卸载全局包
sudo npm uninstall -g clawdbot

# 清理可执行文件
sudo rm /usr/local/bin/clawdbot
```

### 2. 安装 OpenClaw

```bash
sudo npm install -g openclaw
```

安装后 OpenClaw 会自动迁移 `~/.clawdbot/clawdbot.json` 到 `~/.openclaw/openclaw.json`。

### 3. 初始化

```bash
openclaw setup        # 基础设置
openclaw onboard      # 交互式向导
```

### 4. 配置 Gateway 服务（LaunchAgent）

OpenClaw 自动创建 LaunchAgent，路径为：

```
~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

管理命令：

```bash
# 启动
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist

# 停止
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist

# 重启（通过 openclaw 命令）
openclaw gateway restart

# 强制启动（杀掉占用端口的进程后启动）
openclaw gateway --force
```

## 当前安装路径

| 组件 | 路径 |
|------|------|
| OpenClaw 主程序 | `/usr/local/lib/node_modules/openclaw/` |
| 配置文件 | `~/.openclaw/openclaw.json` |
| Agent 工作区 | `~/clawd/` |
| LaunchAgent | `~/Library/LaunchAgents/ai.openclaw.gateway.plist` |
| 日志 | `~/.openclaw/logs/gateway.log` |
| 错误日志 | `~/.openclaw/logs/gateway.err.log` |
| Node.js | `/usr/local/bin/node` (v24.13.0) |

## 更新 OpenClaw

```bash
sudo npm update -g openclaw
openclaw gateway restart
```
