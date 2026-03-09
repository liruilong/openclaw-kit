---
title: OpenClaw Setup — 企业级 AI 助手部署套件
theme: tech
pages: 12
pronunciation:
  spell: ['AI', 'API', 'ACP', 'CLI', 'JSON', 'RPC', 'SSE', 'WPS', 'OpenClaw', 'LaunchAgent']
  say:
    'cursor-proxy': 'cursor proxy'
    'wps-proxy': 'WPS proxy'
    'openclaw.json': 'openclaw 点 json'
speed_factor: 1.1
---

## 第1页 · 封面

- 类型: cover
- 标题: OpenClaw Setup
- 副标题: 企业级 AI 助手部署套件
- 标语: 30 分钟，从零到一个能用的 AI 助手
- 动效: fadeIn

演讲稿:
- [Wave] 大家好，今天介绍 OpenClaw Setup。
- [Happy] 这是一套企业级 AI 助手部署方案。
- [Agree] 目标：30 分钟，从零到一个能用的 AI 助手。

## 第2页 · 为什么需要它？

- 类型: content
- 标题: 部署 OpenClaw 的第一天
- 布局: list
- 要点:
  1. 大群 LLM Proxy 每次请求等 20 秒，又慢又废 Token
  2. 企业内网有 AI 网关，但协议不兼容
  3. 配置散落在四五个文件里，改一个漏一个
  4. 文档太零散，不知道从哪开始
- 动效: slideInLeft

演讲稿:
- [Thinking] 部署 OpenClaw 的第一天，你可能会遇到这些问题。
- [focus:1] 大群提供的代理每次请求要等 20 秒，体验像拨号上网。
- [focus:2] 公司内网有 AI 网关，但协议和 OpenAI 不兼容。
- [focus:3] 配置散落在好几个文件里，改了这个忘了那个。
- [focus:4] 文档太零散，不知道从哪开始。
- [Happy] OpenClaw Setup 把这些坑都填好了。

## 第3页 · 核心组件

- 类型: content
- 标题: 三个组件，三个问题
- 布局: cards-3
- 要点:
  1. cursor-proxy | Cursor CLI 冷启动慢 | 常驻进程，2-3 秒响应
  2. wps-proxy | 企业网关协议不兼容 | 一层转换，内网 AI 直接用
  3. docs/ | 不知道从哪开始 | 10 篇文档，照着做就行
- 动效: scaleIn

演讲稿:
- [Agree] 核心就三个组件。
- [focus:1] cursor-proxy 解决冷启动，后续请求 2 到 3 秒。
- [focus:2] wps-proxy 解决协议不兼容，企业网关接进来直接用。
- [focus:3] docs 目录 10 篇文档，覆盖全流程，让 Cursor 照着做就行。

## 第4页 · 两个代理，两种场景

- 类型: content
- 标题: 两个代理，两种场景
- 布局: diagram
- 要点:
  1. 日常聊天 → wps-proxy → 企业 AI 网关（零成本）
  2. 复杂任务 → cursor-proxy → Cursor 订阅模型（强推理）
  3. 一条命令切换：openclaw models set
- 动效: slideInUp

演讲稿:
- [Thinking] 两个代理怎么配合？
- [focus:1] 日常聊天走 wps-proxy，接企业网关，零成本。
- [focus:2] 复杂任务走 cursor-proxy，用 Cursor 订阅模型，强推理。
- [focus:3] 一条命令切换，成本和性能全都要。

## 第5页 · 性能对比

- 类型: data
- 标题: 告别冷启动
- 布局: comparison
- 要点:
  1. 之前：每次请求启动新进程 | 13-27 秒 | 像拨号上网
  2. 现在：ACP 常驻进程 | 2-3 秒 | 像本地应用
- 动效: fadeIn

演讲稿:
- [Agree] 来看性能对比。
- [focus:1] 之前每次请求冷启动，13 到 27 秒，体感像拨号上网。
- [focus:2] 现在 ACP 常驻进程，后续 2 到 3 秒，体感像本地应用。

## 第6页 · 企业级特性

- 类型: content
- 标题: 企业级，不是玩具级
- 布局: list
- 要点:
  1. LaunchAgent 托管：开机自启、崩溃秒重启、日志自动归档
  2. 配置模板齐全：openclaw.json、auth-profiles.json、hosts
  3. 脱敏处理：敏感信息全用占位符，fork 后不泄露
- 动效: slideInRight

演讲稿:
- [Agree] 这套方案是企业级的。
- [focus:1] LaunchAgent 托管，开机自启，崩溃秒重启。
- [focus:2] 配置模板齐全，复制粘贴即可。
- [focus:3] 敏感信息脱敏，fork 不担心泄露。

## 第7页 · 10 篇文档

- 类型: content
- 标题: 10 篇文档，覆盖全流程
- 布局: list
- 要点:
  1. 01 installation — 装什么、怎么装
  2. 02 models — 四种模型方案怎么选
  3. 03 gateway — Dashboard 怎么开
  4. 04–10 imessage / tts / mcp / persona / memory / troubleshooting / optimization
- 动效: slideInLeft

演讲稿:
- [Thinking] 文档怎么用？
- [Agree] 10 篇文档从安装到优化全覆盖，按序号照着做就行。

## 第8页 · 适合谁用？

- 类型: content
- 标题: 适合谁用？
- 布局: checklist
- 要点:
  1. ✅ 有 Cursor Pro 订阅，想白嫖模型能力
  2. ✅ 公司内网有 AI 网关，想接进 OpenClaw
  3. ✅ 第一次部署，需要靠谱参考
  4. ✅ 想同时用多个模型，按需切换
- 动效: slideInLeft

演讲稿:
- [Thinking] 适合谁用？
- [focus:1] 有 Cursor Pro 想复用模型能力，适合。
- [focus:2] 内网有 AI 网关想接 OpenClaw，适合。
- [focus:3] 第一次部署要参考，适合。
- [focus:4] 想多模型按需切换，适合。

## 第9页 · 技术要点 — cursor-proxy

- 类型: content
- 标题: cursor-proxy：怎么做到 2-3 秒？
- 布局: list
- 要点:
  1. 进程常驻：一个 agent acp 子进程，JSON-RPC 2.0 通信
  2. 会话复用：同一 session 反复用，不每次重建
  3. 轮换阈值：50 次请求或约 10 万 token 自动建新会话
  4. 崩溃恢复：子进程挂掉约 2 秒自动重启
- 动效: slideInUp

演讲稿:
- [Agree] 技术上说，cursor-proxy 靠常驻进程和会话复用。
- [focus:1] 一个 agent acp 子进程，用 JSON-RPC 2.0 通信。
- [focus:2] 会话建好后反复复用，不每次冷启动。
- [focus:3] 请求数或 token 到阈值就自动轮换会话。
- [focus:4] 进程崩溃约 2 秒自动重启，不用人管。

## 第10页 · 技术要点 — wps-proxy

- 类型: content
- 标题: wps-proxy：怎么接企业网关？
- 布局: list
- 要点:
  1. 协议翻译：OpenAI 格式 ↔ WPS 网关 V2 格式
  2. 省 token：base64 图片自动剥离，换占位文案
  3. Tool Calling：tools、tool_choice 原样透传
  4. 流式：边收边转，不攒完再发
- 动效: slideInUp

演讲稿:
- [Agree] wps-proxy 做的是协议翻译。
- [focus:1] OpenAI 请求转成 WPS V2，响应再转回 OpenAI。
- [focus:2] base64 图片自动剥离，省 token。
- [focus:3] 工具定义原样透传，流式边收边转。

## 第11页 · 快速开始

- 类型: summary
- 标题: 快速开始
- 布局: code
- 要点:
  1. git clone <repo-url> openclaw-setup
  2. 按 docs/ 顺序部署
  3. cursor-proxy 与 wps-proxy 分别 npm start
  4. curl 验证 /v1/health
- 动效: fadeIn

演讲稿:
- [Happy] 快速开始。
- [focus:1] 克隆仓库。
- [focus:2] 按文档顺序部署。
- [focus:3] 启动两个代理。
- [focus:4] curl 验证健康检查通过就完成了。

## 第12页 · 收尾

- 类型: closing
- 标题: 感谢
- 布局: text
- 要点:
  1. 遇到问题看 docs/09-troubleshooting.md
  2. 欢迎提 Issue 交流
- 动效: fadeIn

演讲稿:
- [Wave] 感谢大家。
- [Happy] 部署遇到问题可以看排错文档，或提 Issue 交流。
