# iMessage 频道配置

## 概述

OpenClaw 通过内置的 iMessage 插件和 `imsg` CLI 工具与 macOS Messages.app 集成，实现收发 iMessage 消息。

## 配置

### 插件启用

配置路径：`plugins.entries.imessage`

```json
{
  "imessage": { "enabled": true }
}
```

### 频道配置

配置路径：`channels.imessage`

```json
{
  "enabled": true,
  "cliPath": "/usr/local/bin/imsg",
  "dbPath": "~/Library/Messages/chat.db",
  "service": "auto",
  "dmPolicy": "pairing",
  "groupPolicy": "allowlist"
}
```

| 参数 | 说明 |
|------|------|
| `cliPath` | imsg CLI 可执行文件路径 |
| `dbPath` | macOS Messages 数据库路径 |
| `service` | 消息服务：`auto`（自动选择 iMessage/SMS） |
| `dmPolicy` | 私信策略：`pairing`（需要配对授权）或 `open` |
| `groupPolicy` | 群组策略：`allowlist`（白名单）或 `open` |

## imsg CLI 安装

由于 Homebrew 安装的 `imsg` 是 ARM64 版本，在 Intel Mac 上无法运行（"Bad CPU type in executable"），需要手动安装 universal binary：

```bash
# 从 GitHub releases 下载 universal 版本
curl -L -o /tmp/imsg https://github.com/nicepkg/imsg/releases/download/v0.5.0/imsg-macos-universal
chmod +x /tmp/imsg
sudo cp /tmp/imsg /usr/local/bin/imsg

# 需要同时复制资源包
sudo cp /path/to/PhoneNumberKit_PhoneNumberKit.bundle /usr/local/bin/
sudo cp /path/to/SQLite.swift_SQLite.bundle /usr/local/bin/
```

## macOS 权限要求

### 1. Full Disk Access（全盘访问权限）

`/usr/local/bin/node` 需要 Full Disk Access 才能读取 `~/Library/Messages/chat.db`。

设置路径：`系统设置 → 隐私与安全性 → 完全磁盘访问权限 → 添加 /usr/local/bin/node`

### 2. Automation 权限（自动化权限）

`node` 需要 Automation 权限来控制 Messages.app 发送消息。

首次发送时 macOS 会弹出授权提示。如果通过 LaunchAgent 运行不弹窗，可以在终端手动触发一次：

```bash
/usr/local/bin/imsg send "+8618688047774" "test"
```

## 配对（Pairing）

`dmPolicy: "pairing"` 表示只有经过配对的联系人才能与 OpenClaw 对话。

### 配对流程

1. 用户向 Mac 发送 iMessage
2. OpenClaw 收到消息后创建配对请求
3. 在 Dashboard 或 CLI 中批准配对

```bash
# 查看待处理的配对请求
openclaw pairing list

# 批准配对
openclaw pairing approve <request-id>
```

### 配对凭证

存储在 `~/.openclaw/credentials/` 目录：
- `imessage-default-allowFrom.json` — 允许的发送者 ID
- `imessage-pairing.json` — 配对状态

## 重要注意事项

### Apple ID 冲突问题

**问题**：如果 Mac 和 iPhone 使用同一个 Apple ID，OpenClaw 发出的 iMessage 回复会同步到 iPhone，iPhone 又会把这条消息同步回 Mac，导致 OpenClaw 再次处理，形成**无限循环**。

**解决方案**：
- iPhone 的 iMessage 使用**不同的 Apple ID**（如另一个邮箱账号）
- 或者在 iPhone 的 iMessage 设置中取消勾选 Mac 使用的 Apple ID

### 紧急停止

如果发生消息循环，立即：

```bash
# 方法 1：禁用 iMessage 频道
openclaw config set channels.imessage.enabled false
openclaw gateway restart

# 方法 2：强制停止 Gateway
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```
