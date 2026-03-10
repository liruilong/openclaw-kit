---
name: doc-cli
description: "Use this skill whenever the user needs to work with online documents (在线文档). Triggers include: creating documents, generating reports as online documents, converting content to online documents, parsing document URLs, reading content from shared document links, or when user mentions '在线文档' or provides a URL like kdocs.cn / 365.kdocs.cn. Also use when user wants to generate a shareable online document URL from markdown content."
---

# 在线文档 CLI - 在线文档操作

## Quick Reference

| Task | Command |
|------|---------|
| Markdown → 在线文档 | `wps-doc import <file.md> --title "Title"` |
| 在线文档 → Markdown | `wps-doc export <url> [-o output.md]` |
| 检查认证状态 | `wps-doc auth --status` |
| 执行认证 | `wps-doc auth` |
| 列出云盘 | `wps-doc drives` |
| 列出文件 | `wps-doc list [driveId] [-p parentId]` |
| 搜索文档 | `wps-doc search <关键词> [-n 数量]` |

---

## Setup (首次使用前必须完成)

### Step 1: 安装和更新

安装或者更新都执行下面的指令

```bash
npm install -g @wps-agent/core@latest --registry=https://registry.npmjs.org/
```

### Step 2: 配置环境变量

检查以下位置是否存在 `.env` 文件（按优先级搜索）：
1. 当前目录 `.env` / `.env.local`
2. `.claude/skills/doc-cli/.env` / `.cursor/skills/doc-cli/.env`
3. `~/.claude/skills/doc-cli/.env` / `~/.cursor/skills/doc-cli/.env`

必需的环境变量（名称以所用在线文档平台文档为准，常见为 CLIENT_ID、CLIENT_SECRET）：
```
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
```

如果缺少配置，则无法使用本 skill，需**提示用户**前往所用在线文档平台的开放平台创建应用并获取凭据。

### Step 3: 认证

```bash
wps-doc auth --status
```

如果未认证，执行 `wps-doc auth` 打开浏览器完成 OAuth 授权。

---

## Workflow: 创建在线文档

当用户需要生成在线文档时：

```
Task Progress:
- [ ] Step 1: 确认 wps-doc 安装以及更新（npm install -g @wps-agent/core@latest --registry=https://registry.npmjs.org/ && which wps-doc）
- [ ] Step 2: 确认 .env 已配置
- [ ] Step 3: 确认已认证（wps-doc auth --status）
- [ ] Step 4: 将内容写入临时 markdown 文件
- [ ] Step 5: 执行 import 命令
- [ ] Step 6: 将文档 URL 返回给用户
- [ ] Step 7: 清理临时文件
```

**Step 4-6 示例：**

```bash
# 将内容写入临时文件
cat > /tmp/wps-doc-temp.md << 'WPSEOF'
# 文档标题

文档内容...
WPSEOF

# 导入到在线文档，使用 --json 方便解析输出
wps-doc import /tmp/wps-doc-temp.md --title "文档标题" --json

# 清理
rm -f /tmp/wps-doc-temp.md
```

JSON 输出格式：
```json
{
  "documentId": "xxx",
  "documentUrl": "https://365.kdocs.cn/l/xxxxx"
}
```

**务必将 `documentUrl` 返回给用户。**

---

## Workflow: 解析在线文档 URL

当用户提供在线文档 URL 需要读取内容时：

```
Task Progress:
- [ ] Step 1: 确认 wps-doc 已安装或更新
- [ ] Step 2: 确认 .env 已配置
- [ ] Step 3: 确认已认证
- [ ] Step 4: 执行 export 命令
- [ ] Step 5: 将 markdown 内容呈现给用户
```

```bash
# 直接输出 markdown 到 stdout
wps-doc export "https://365.kdocs.cn/l/clGzNRMWYfG9"

# 或保存到文件
wps-doc export "https://365.kdocs.cn/l/clGzNRMWYfG9" -o /tmp/wps-output.md
```

支持的输入格式：
- 完整 URL：`https://365.kdocs.cn/l/xxxxx`、`https://kdocs.cn/l/xxxxx`
- 文档 ID：`xxxxx`

---

## Error Handling

| 错误 | 处理方式 |
|------|----------|
| `缺少环境变量`（如 CLIENT_ID） | 提示用户配置 `.env` 文件 |
| `未认证` | 执行 `wps-doc auth` |
| 文档未找到 | 检查 URL/ID 是否正确 |
| 权限被拒绝 | 文档可能未分享给当前用户 |
| `wps-doc: command not found` | 执行 `npm install -g @wps-agent/core` |
