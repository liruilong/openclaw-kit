---
title: OpenClaw Setup — 企业级 AI 助手部署套件
theme: tech
pages: 8
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
- [Wave] 大家好，今天给大家介绍 OpenClaw Setup。
- [Happy] 这是一套企业级的 AI 助手部署方案。
- [Agree] 目标很简单：30 分钟，从零到一个能用的 AI 助手。

## 第2页 · 痛点

- 类型: content
- 标题: 部署 OpenClaw 的第一天
- 布局: list
- 要点:
  1. Cursor CLI 每次冷启动 20 秒，体验像拨号上网
  2. 企业内网有 AI 网关，但协议不兼容
  3. 配置散落在四五个文件里，改一个漏一个
  4. 文档太零散，不知道从哪开始
- 动效: slideInLeft

演讲稿:
- [Thinking] 部署 OpenClaw 的第一天，你可能会遇到这些问题。
- [focus:1] Cursor CLI 每次请求都要冷启动，等 20 秒才能响应。
- [focus:2] 公司内网有 AI 网关，但协议和 OpenAI 格式不兼容。
- [focus:3] 配置散落在好几个文件里，改了这个忘了那个。
- [focus:4] 官方文档太零散，不知道从哪开始。
- [Happy] OpenClaw Setup 就是来解决这些问题的。

## 第3页 · 核心组件

- 类型: content
- 标题: 三个组件，三个问题
- 布局: cards-3
- 要点:
  1. cursor-proxy | 解决冷启动 | 常驻进程，2-3 秒响应
  2. wps-proxy | 解决协议不兼容 | 一层转换，内网 AI 直接用
  3. docs/ | 解决不知道从哪开始 | 10 篇文档，照着做就行
- 动效: scaleIn

演讲稿:
- [Agree] 核心就三个组件，解决三个问题。
- [focus:1] cursor-proxy 解决冷启动问题，后续请求只要 2 到 3 秒。
- [focus:2] wps-proxy 解决协议不兼容，帮你把企业网关接进来。
- [focus:3] docs 目录有 10 篇文档，覆盖全流程，照着做就行。

## 第4页 · 双代理架构

- 类型: content
- 标题: 两个代理，两种场景
- 布局: diagram
- 要点:
  1. 日常聊天 → wps-proxy → 企业 AI 网关（零成本）
  2. 复杂任务 → cursor-proxy → Cursor 订阅模型（强推理）
  3. 一条命令切换：openclaw models set
- 动效: slideInUp

演讲稿:
- [Thinking] 这两个代理怎么配合使用呢？
- [focus:1] 日常聊天走 wps-proxy，接企业内部网关，零成本。
- [focus:2] 需要深度思考的复杂任务，切到 cursor-proxy，用 Cursor 订阅的模型。
- [focus:3] 切换只需要一条命令。
- [Happy] 成本和性能，你全都要。

## 第5页 · 性能对比

- 类型: data
- 标题: 告别冷启动
- 布局: comparison
- 要点:
  1. 之前：每次请求启动新进程 | 13-27 秒 | 像拨号上网
  2. 现在：ACP 常驻进程 | 2-3 秒 | 像本地应用
- 动效: fadeIn

演讲稿:
- [Agree] 来看一下性能对比。
- [focus:1] 之前每次请求都要启动新进程，等 13 到 27 秒，体感像拨号上网。
- [focus:2] 现在用 ACP 常驻进程，后续请求只要 2 到 3 秒，体感像本地应用。
- [Happy] 这个差距还是很明显的。

## 第6页 · 企业级特性

- 类型: content
- 标题: 企业级，不是玩具级
- 布局: list
- 要点:
  1. LaunchAgent 托管：开机自启、崩溃秒重启、日志自动归档
  2. 配置模板齐全：openclaw.json、auth-profiles.json、hosts
  3. 脱敏处理：敏感信息全用占位符，fork 后不担心泄露
- 动效: slideInRight

演讲稿:
- [Agree] 这套方案是企业级的，不是玩具级的。
- [focus:1] 支持 LaunchAgent 托管，开机自启，崩溃了秒级重启。
- [focus:2] 配置模板都给你准备好了，复制粘贴就能用。
- [focus:3] 所有敏感信息都做了脱敏，fork 到自己仓库也不担心泄露。

## 第7页 · 适用场景

- 类型: content
- 标题: 适合谁用？
- 布局: checklist
- 要点:
  1. ✅ 有 Cursor Pro 订阅，想白嫖模型能力
  2. ✅ 公司内网有 AI 网关，想接进 OpenClaw
  3. ✅ 第一次部署，需要一份靠谱的参考
  4. ✅ 想同时用多个模型，按需切换
- 动效: slideInLeft

演讲稿:
- [Thinking] 这套方案适合谁用呢？
- [focus:1] 如果你有 Cursor Pro 订阅，想复用模型能力，适合你。
- [focus:2] 如果公司内网有 AI 网关，想接进 OpenClaw，适合你。
- [focus:3] 如果你是第一次部署，需要参考方案，适合你。
- [focus:4] 如果你想同时用多个模型按需切换，也适合你。

## 第8页 · 快速开始

- 类型: summary
- 标题: 快速开始
- 布局: code
- 要点:
  1. git clone <repo-url> openclaw-setup
  2. 按 docs/ 顺序部署
  3. npm start 启动代理
  4. curl 验证健康检查
- 动效: fadeIn

演讲稿:
- [Happy] 最后是快速开始。
- [focus:1] 第一步，克隆仓库。
- [focus:2] 第二步，按文档顺序部署。
- [focus:3] 第三步，启动代理服务。
- [focus:4] 第四步，验证健康检查通过就大功告成了。
- [Wave] 感谢大家，有问题随时交流！
