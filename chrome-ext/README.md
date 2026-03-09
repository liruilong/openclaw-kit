# openclaw-chrome-ext

Chrome 浏览器扩展，增强 OpenClaw Dashboard 的交互体验——支持拖拽文件到对话框自动插入完整路径。

属于 **Desk Live 桌面助手生态** 的浏览器端增强组件。

## 功能

- **拖拽插入路径** — 从 Finder/资源管理器拖拽文件或文件夹到 OpenClaw 对话框，自动解析并插入完整路径
- **智能路径解析** — 通过 Native Messaging + macOS Spotlight（mdfind）查找文件真实路径
- **多目录搜索** — 搜索 `~/workspace/`、`~/Downloads/`、`~/Documents/`、`~/Desktop/`、`~/agent-workspace/` 等常用目录
- **拖拽视觉反馈** — 全屏半透明覆盖层 + 虚线边框 + 提示文字
- **光标位置插入** — 在文本框当前光标位置插入路径，保持上下文
- **多文件支持** — 同时拖入多个文件，每个路径换行显示

## 工作原理

```
用户拖拽文件到 OpenClaw Dashboard
    │
    ▼
content.js (Content Script)
    │ 捕获 drop 事件，提取文件名
    │ chrome.runtime.sendMessage
    ▼
background.js (Service Worker)
    │ chrome.runtime.connectNative
    │ Native Messaging (stdio)
    ▼
resolve_paths.py (Native Host)
    ├── mdfind (Spotlight) 查找
    └── 遍历常用目录查找
    │
    │ 返回完整路径
    ▼
content.js
    └── 插入到 textarea
```

## 项目结构

```
openclaw-chrome-ext/
├── manifest.json             # Chrome 扩展清单 (Manifest V3)
├── content.js                # Content Script：拖拽处理、路径插入
├── content.css               # 拖拽覆盖层样式
├── background.js             # Service Worker：Native Messaging 桥接
├── native-host/
│   └── resolve_paths.py      # Native Messaging Host：路径解析
├── install-native-host.sh    # Native Host 安装脚本
├── icon48.png                # 扩展图标
└── icon128.png               # 扩展图标
```

## 安装

### 1. 加载 Chrome 扩展

1. 打开 `chrome://extensions/`
2. 开启 "开发者模式"
3. 点击 "加载已解压的扩展程序"
4. 选择本项目目录
5. 记下分配的扩展 ID

### 2. 安装 Native Messaging Host

```bash
chmod +x install-native-host.sh
./install-native-host.sh <你的扩展ID>
```

安装脚本会：
- 将 `resolve_paths.py` 注册为 Chrome Native Messaging Host
- 生成 manifest 到 `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`

### 3. 重启 Chrome

## 使用

1. 打开 OpenClaw Dashboard（`http://localhost:39521` 或配置的地址）
2. 从 Finder 拖拽任意文件或文件夹到对话输入框
3. 文件的完整路径会自动插入到输入框中

## 技术栈

- **Chrome Extension Manifest V3** — Content Script + Service Worker
- **Native Messaging** — Chrome ↔ 本地 Python 通信
- **Python 3** — 路径解析（Spotlight + 目录遍历）
- **JavaScript** — DOM 操作、拖拽事件处理

## 适配页面

扩展默认在以下页面生效（可在 `manifest.json` 中修改）：

- `http://localhost:39521/*`
- `http://127.0.0.1:39521/*`

## 相关项目

| 项目 | 说明 |
|------|------|
| openclaw-setup | OpenClaw 配置说明文档（本项目） |
