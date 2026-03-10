# 用 Surge 远程访问 OpenClaw Dashboard（HTTPS）

Dashboard 默认是 `http://localhost:<port>`，浏览器在「非安全上下文」下部分能力受限。若希望用 HTTPS 或从其他设备访问，可用以下方式。

## 方式一：SSH 隧道（推荐，无需 Surge）

在**访问端**执行端口转发，再在本地浏览器访问 `http://127.0.0.1:<port>`：

```bash
ssh -L <port>:127.0.0.1:<port> <用户名>@<Mac-IP>
```

详见 [Gateway 与 Dashboard](03-gateway.md#从其他主机远程访问)。

## 方式二：Surge + 本地反向代理（HTTPS 安全上下文）

若希望浏览器里是 **HTTPS**（Secure Context），需要：

1. 在 **运行 Gateway 的 Mac** 上起一个本地 HTTPS 服务，把请求转发到 Gateway 端口。
2. 在 **Surge** 里对该域名做 MitM，并（可选）用模块统一管理。

### 步骤 1：本地反向代理（示例：Caddy）

在 Mac 上安装 [Caddy](https://caddyserver.com/docs/install)，用 `.test` 域名（无需公网）：

```bash
# 安装 Caddy（macOS）
brew install caddy

# 创建 Caddyfile（端口请改成你的 Gateway port，如 3010）
echo 'openclaw-dashboard.test {
  reverse_proxy 127.0.0.1:3010
  tls internal
}' > /tmp/Caddyfile

# 前台运行（或配置为服务）
caddy run --config /tmp/Caddyfile
```

本机访问：`https://openclaw-dashboard.test`（浏览器会提示自签名证书，可接受）。

模块内已包含 `[Host] openclaw-dashboard.test = 127.0.0.1`，让 Surge 本地解析该域名，避免「Testing rules failed / Empty DNS answer」（公共 DNS 没有 .test 记录）。

### 步骤 2：Surge 中启用 MitM

在 Surge 里为该域名开启 MitM，并用自己的根证书解密 HTTPS，避免证书告警：

1. Surge → 设置 → MitM → 生成证书并安装到系统/浏览器。
2. 在「MitM」主机名单中加入：`openclaw-dashboard.test`。

### 步骤 3：使用模块（可选）

若希望通过「从 URL 安装模块」统一管理，可使用本仓库提供的模块：

- 模块说明与用法见下节；模块内域名/端口需按你本机实际修改。

## Surge 模块（从 URL 添加）

若你的 Surge 支持「从 URL 安装模块」，可添加：

```
# 使用前请把 <port> 改成你的 Gateway 端口（如 3010）
# 模块仅包含 MitM 主机，本地 HTTPS 服务仍需自行用 Caddy/nginx 等搭建

https://raw.githubusercontent.com/<你的用户名>/<仓库名>/<分支>/docs/surge-openclaw-dashboard.sgmodule
```

添加后，在模块里把 `openclaw-dashboard.test` 和端口改成你自己的，并确保本机已运行 Caddy（或其它反向代理）转发到 `127.0.0.1:<port>`。

## 小结

| 方式           | 优点           | 缺点           |
|----------------|----------------|----------------|
| SSH 隧道       | 简单、安全     | 仍是 HTTP、需 SSH |
| Surge + Caddy  | 本地 HTTPS、Secure Context | 需在本机跑 Caddy、配置 MitM |

若仅需远程打开 Dashboard，优先用 **SSH 隧道**；若需要 HTTPS 或 PWA 等依赖 Secure Context 的能力，再用 **Surge + 本地反向代理**。
