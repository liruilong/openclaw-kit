# 将脱敏版本发布到新仓库

本仓库保留原始内容。脱敏后的版本在分支 **`publish`** 上（单次提交，无历史），可推送到**新仓库**作为全新项目发布。

## 1. 在新平台创建空仓库

在 GitHub / Gitee 等创建**新仓库**（不要 clone 本仓库，不要加 README/ .gitignore）。

## 2. 添加新远程并推送

在本仓库目录执行（将 `<新仓库 URL>` 换成你的新仓库地址）：

```bash
# 添加新远程（名字随意，这里用 public）
git remote add public <新仓库 URL>

# 将 publish 分支推送到新仓库的 main（或 master）
git push public publish:main
```

若新仓库默认分支是 `master`：

```bash
git push public publish:master
```

## 3. 切回原仓库日常开发

推送完成后，切回 `master` 继续在原仓库工作：

```bash
git checkout master
```

之后原仓库照常使用，新仓库即为脱敏后的独立项目。

## 脱敏内容说明

- **命名**：wps-proxy → gateway-proxy，wps/ → enterprise/，WPS 相关文案 → 企业网关/企业协作等泛化表述。
- **域名/地址**：ai-gateway.wps.cn、kdocs.cn、ksord.com 等 → example.com 占位。
- **环境变量**：WPS_TOKEN → GATEWAY_TOKEN，wps_sid → doc_sid 等。
- **目录**：wps-proxy → gateway-proxy，wps-doc-cli → doc-cli，wpsv7-skills → office-skills。
