---
name: wpsv7-skills
description: 企业协作 V7 API SKILL 工具集，集成通讯录、日历、会议、云文档、IM 等能力。
---

# 企业协作 SKILL 工具集

基于企业协作 V7 API 封装的命令行工具，帮助你快速完成企业协作任务。

## 快速开始

```bash
# 设置认证（只需设置一次）
export GATEWAY_SID="你的GATEWAY_SID值"

# 在 wpsv7-skill 根目录执行
cd wpsv7-skill
```

## SKILL 概览

| SKILL | 功能 | 典型场景 |
|-------|------|----------|
| [contacts](#contacts) | 通讯录搜索 | 查人、获取用户ID |
| [user-current](#user-current) | 当前用户 | 确认当前登录身份 |
| [calendar](#calendar) | 日历与日程 | 创建/查询日程、忙闲查询 |
| [meeting](#meeting) | 会议管理 | 创建会议、管理参会人 |
| [drive](#drive) | 云文档 | 上传文件、获取文件信息 |
| [im](#im) | 聊天消息 | 会话管理、发送消息、搜索 |

---

## contacts

按姓名搜索企业通讯录，获取用户 ID。

```bash
# 搜索用户
python skills/contacts/run.py search "姓名"

# 获取用户 ID 后可用于添加日程/会议参与者
```

**用途**：获取的 `user_id` 可用于日程/会议的参与者邀请。

---

## user-current

查询当前登录用户信息。

```bash
python skills/user-current/run.py
```

返回：用户ID、昵称、企业、部门、邮箱、手机等。

---

## calendar

日历与日程管理。

```bash
# 列出日历
python skills/calendar/run.py list-calendars

# 创建日程
python skills/calendar/run.py create-event --calendar-id <id> --title "会议" --start 2026-03-04T03:00:00Z --end 2026-03-04T04:00:00Z

# 查询忙闲（用户/会议室在指定区间的忙时段，其余为空闲）
python skills/calendar/run.py free-busy --user-ids "user_id1,user_id2" --start 2026-03-04T00:00:00Z --end 2026-03-05T00:00:00Z

# 更多命令：get-event, update-event, delete-event, list-events
```

**时间格式**：须带时区，如 `2026-03-04T03:00:00Z` 或 `2026-03-04T11:00:00+08:00`（禁止无后缀，防东 8 区错 8 小时）。

---

## meeting

在线会议管理。

```bash
# 创建会议
python skills/meeting/run.py create --subject "主题" --start 2026-03-04T03:00:00Z --end 2026-03-04T04:00:00Z --participants "user_id1,user_id2"

# 查询会议
python skills/meeting/run.py get <meeting_id>

# 会议列表
python skills/meeting/run.py list --start 2026-03-01T00:00:00Z --end 2026-03-07T00:00:00Z

# 取消会议
python skills/meeting/run.py cancel <meeting_id>

# 管理参会人
python skills/meeting/run.py add-participants <meeting_id> --ids "user_id"
python skills/meeting/run.py remove-participants <meeting_id> --ids "user_id"
python skills/meeting/run.py list-participants <meeting_id>
```

**返回信息**：meeting_id、join_url（入会链接）、meeting_code（入会码）  
**时间格式**：start/end 须带 `Z` 或 `+08:00`，禁止无后缀（防东 8 区错 8 小时）。

---

## drive

在线文档云文档管理。上传**单个 .md 文件**时自动转为**智能文档**（.otl）。

```bash
# 上传文件（.md 会以智能文档形式上传）
python skills/drive/run.py upload /path/to/file.md
python skills/drive/run.py upload /path/to/file.docx

# 指定云盘与路径
python skills/drive/run.py upload /path/to/file.md --drive private --path "我的文档/子目录"

# 文件列表
python skills/drive/run.py list

# 文件详情
python skills/drive/run.py get <file_id>

# 获取下载链接
python skills/drive/run.py download <file_id>
```

---

## im

聊天会话与消息管理。

### 会话管理

```bash
# 会话列表
python skills/im/run.py list

# 最近会话（带未读数）
python skills/im/run.py recent

# 搜索会话
python skills/im/run.py search "关键字"

# 会话详情
python skills/im/run.py get <chat_id>
```

### 消息管理

```bash
# 历史消息
python skills/im/run.py history <chat_id>

# 全局搜索消息（跨所有会话）
python skills/im/run.py search-messages --keyword "关键字"

# 发送消息
python skills/im/run.py send <chat_id> "文本内容"

# 发送富文本
python skills/im/run.py send <chat_id> --type rich_text --rich-text '<json>'

# 发送云文档
python skills/im/run.py send <chat_id> --type file --file '<json>'

# 撤回消息
python skills/im/run.py recall <chat_id> <message_id>
```

**消息类型**：
- `text` - 文本消息
- `rich_text` - 富文本（支持加粗、斜体等样式）
- `file` - 文件/云文档
- `image` - 图片（需要 storage_key）

---

## 常见场景

### 场景1：创建会议并邀请参会人

```bash
# 1. 查找参会人
python skills/contacts/run.py search "张三"

# 2. 查询忙闲
python skills/calendar/run.py free-busy --user-ids "user_id" --start 2026-03-04T00:00:00Z --end 2026-03-04T23:59:59Z

# 3. 创建会议
python skills/meeting/run.py create --subject "项目评审" --start 2026-03-04T03:00:00Z --end 2026-03-04T04:00:00Z --participants "user_id1,user_id2"
```

### 场景2：发送云文档到群聊

```bash
# 1. 上传文档到云端（.md 会以智能文档上传，返回 link_id / link_url）
python skills/drive/run.py upload /path/to/doc.docx

# 2. 上传输出中会包含「发送云文档消息所需信息」JSON

# 3. 发送到群聊（id 字段填 link_id，不是 file_id）
python skills/im/run.py send <chat_id> --type file --file '{"type":"cloud","cloud":{"id":"<link_id>","link_url":"<link_url>","link_id":"<link_id>"}}'
```

### 场景3：搜索历史消息

```bash
# 全局搜索关键字
python skills/im/run.py search-messages --keyword "需求"

# 按时间范围搜索
python skills/im/run.py search-messages --start-time 2026-01-01T00:00:00Z --end-time 2026-03-01T00:00:00Z

# 按会话搜索
python skills/im/run.py search-messages --chat-ids "chat_id1,chat_id2"
```

---

## 错误处理

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| 缺少 gateway_sid | 未设置环境变量 | `export GATEWAY_SID=xxx` |
| csrfCheckFailed | CSRF 验证失败 | 检查 Cookie 配置 |
| 401/403 | 凭证无效/过期 | 重新获取 gateway_sid |

---

## 时间格式与时区（重要，防 LLM 出错）

所有涉及**开始/结束时间**的参数（日历、会议、忙闲等）必须使用 **带时区的 ISO 8601**，**禁止使用无时区后缀**的写法，否则在东 8 区会导致**约 8 小时偏差**（会议/日程会晚 8 小时或显示错误）。

- **推荐（二选一）**：
  - UTC：`2026-03-04T06:00:00Z`（表示北京时间 14:00）
  - 东 8 区：`2026-03-04T14:00:00+08:00`（北京时间 14:00）
- **错误示例**：`2026-03-04T14:00:00`（无 `Z` 或无 `+08:00`）会被当作 14:00 UTC，对应北京时间 22:00，易导致会议/日程晚 8 小时。

调用日历、会议、忙闲等 SKILL 时，请始终在时间字符串末尾带 `Z`（UTC）或 `+08:00`（东 8 区）。

---

## 获取帮助

```bash
# 查看所有 SKILL
ls skills/*/SKILL.md

# 查看具体 SKILL 帮助
python skills/<skill>/run.py --help
python skills/<skill>/run.py <子命令> --help
```
