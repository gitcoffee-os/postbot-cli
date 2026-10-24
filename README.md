<p align="center">
  <img alt="logo" src="https://postbot.exmay.com/docs/images/postbot_logo.svg" width="150" height="150">
</p>
<h1 align="center" style="margin: 30px 0 30px; font-weight: bold;">PostBot CLI v1.1.0</h1>

<h4 align="center">
  一款命令行下的多平台内容同步、任务流程管理效率工具。
  <br />
  支持内容快捷同步发布、批量同步发布、任务管理、工作流编排，无缝对接 PostBot / Postar 平台。
</h4>
<p align="center">
  <!-- <a href="https://github.com/gitcoffee-os/postbot-cli" style="display:inline-block;margin:5px;">
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/gitcoffee-os/postbot-cli">
  </a> -->
  <a href="https://github.com/gitcoffee-os/postbot-cli/blob/main/LICENSE" style="display:inline-block;margin:5px;">
    <img src="https://img.shields.io/github/license/gitcoffee-os/postbot-cli.svg">
  </a>
</p>

<p align="center">
	正在持续迭代中...
</p>

<p align="center">
   <a href="https://github.com/gitcoffee-os/magio" target="_balnk" style="font-size:14px;color:#915930;">基于开源生态内的开源项目 Magio 平台开发（内置免费模型）<br />Magio 面向全应用端的全链路 AI 开发平台与全场景智能体工作空间</a>
</p>

> [!NOTE]
> 当前为快速迭代开发版，适用于开发者与 CI/CD 场景。<br />
> 如需浏览器扩展或桌面端，请访问 [PostBot 内容同步助手](https://postbot.exmay.com)。

## 特性

- **多平台发布**：一次请求写入多个目标平台，由引擎为每个平台创建发布 Job。
- **内容类型**：文章、动态、视频、音频。
- **定时发布**：支持本地时间、ISO 8601、毫秒/秒时间戳。
- **草稿与自动发布**：`--draft` 仅保存；默认保存后自动发布。
- **发布前预检**：校验平台字典、账号、在线桌面端，避免“保存成功但没 Job”。
- **批量发布**：JSON 数组或 `{ defaults, tasks }`，支持 dry-run、fail-fast、相对内容文件。
- **任务与 Job 管理**：任务 CRUD、绑定内容 ID、触发自动发布、查看 Job 与执行日志。
- **账号 / 客户端 / 会话**：账号与浏览器指纹、扩展/桌面客户端、SessionBot 只读会话。
- **脚本友好**：`--json` 输出、明确退出码、全局选项可放在子命令之后。

## 安装

一键安装（自动检测 Node.js 环境，通过 npm 全局安装）：

```bash
curl -fsSL https://raw.githubusercontent.com/gitcoffee-os/postbot-cli/main/install.sh | bash
```

安装指定版本：

```bash
curl -fsSL https://raw.githubusercontent.com/gitcoffee-os/postbot-cli/main/install.sh | bash -s -- --version 1.1.0
```

或直接使用 npm / pnpm：

```bash
npm install -g @gitcoffee-os/postbot-cli
pnpm add -g @gitcoffee-os/postbot-cli
```

要求 Node.js >= 18。安装脚本会检测 Node 版本；若 npm 全局目录无写权限，自动改用 `~/.postbot` 作为用户级安装目录并提示 PATH 配置。

## 快速开始

```bash
# 1. 配置开发者凭证（可选；不配置则使用直接登录）
postbot config --client-id <id> --client-secret <secret>

# 2. 登录
postbot login

# 3. 查看当前用户
postbot whoami

# 4. 检查引擎平台字典与账号
postbot platform list
postbot account list

# 5. 发布
postbot publish \
  --platforms weixin,xiaohongshu \
  --content-file ./content.json
```

`content.json`：

```json
{
  "title": "一篇来自 CLI 的文章",
  "content": "<h2>Hello</h2><p>这是正文。</p>",
  "cover": "https://cdn.example.com/cover.jpg",
  "images": ["https://cdn.example.com/1.jpg"]
}
```

## 命令总览

| 命令 | 作用 |
|---|---|
| `postbot login` / `register` / `logout` / `whoami` | 登录、注册、退出、当前用户 |
| `postbot forgot-password` | 重置密码 |
| `postbot config` | 查看或修改 CLI 配置 |
| `postbot publish`（`pub`） | 创建并自动发布任务 |
| `postbot batch-publish` | 从 JSON 批量创建任务 |
| `postbot status <taskId>` | 聚合任务状态 + 最新 Job + 最近日志 |
| `postbot task list/get/save/update/delete` | 任务 CRUD |
| `postbot task batch-delete` | 批量删除任务 |
| `postbot task bind-content` | 幂等绑定上游内容 ID |
| `postbot autopublish trigger/status/jobs/log` | 自动发布触发、Job、日志 |
| `postbot logs` | `autopublish log` 快捷方式 |
| `postbot platform list/get` | 平台字典 |
| `postbot account ...` | 账号 CRUD、浏览器指纹 |
| `postbot client ...` | 扩展/桌面/云端客户端 |
| `postbot session list/get` | SessionBot 会话（只读） |
| `postbot notify` | 发送通用通知 |
| `postbot workflow list/execute/status/retry` | 工作流 |

完整选项见 [docs/CLI-REFERENCE.md](docs/CLI-REFERENCE.md)。

## 发布示例

### 多平台立即发布

```bash
postbot publish \
  --platforms weixin,xiaohongshu,douyin \
  --type article \
  --name "多平台文章" \
  --content-file ./content.json
```

`--platforms` 支持别名：`xhs` → `xiaohongshu`，`channels` / `wechat_channels` → `weixin_channels`，`goofish` / `idlefish` → `xianyu`。

### 定时发布

```bash
postbot publish \
  --platforms weixin \
  --content-file ./content.json \
  --scheduled-at "2026-09-01 09:00:00"

postbot publish \
  --platforms xhs \
  --content-file ./note.json \
  --scheduled-at "2026-09-01T09:00:00+08:00"
```

CLI 会把时间归一化为引擎可识别的格式。已过去的时间会尽快执行，并给出警告。

### 草稿

```bash
postbot publish --platforms weixin --draft --content-file ./content.json
```

### 指定发布通道

```bash
# 云端（默认）
postbot publish --platforms weixin --channel CLOUD --content-file ./content.json

# 浏览器扩展
postbot publish --platforms xhs --channel BROWSER_EXTENSION --content-file ./note.json

# 桌面端：自动选择唯一在线桌面端；多个时交互选择
postbot publish --platforms xhs --channel DESKTOP --content-file ./note.json

# 显式指定桌面端（ID / 名称 / clientKey）
postbot publish --platforms xhs --channel DESKTOP --client "MacBook" --content-file ./note.json
```

- `DESKTOP` 必须有在线桌面端，否则报错。
- `CLOUD` / `BROWSER_EXTENSION_EPHEMERAL` 不接受客户端绑定。
- 自动发布时，每个目标平台必须有可用账号；否则报错。`--draft` 不受此限制。

### 发布并等待

```bash
postbot publish --platforms weixin --content-file ./content.json --wait --timeout 600
```

### 保存任务但不发布

```bash
postbot task save --platforms weixin --content-file ./content.json --draft
```

## 内容格式

通用字段：

```json
{
  "title": "标题",
  "content": "正文（HTML 或纯文本）",
  "description": "视频/音频描述",
  "images": ["https://cdn.example.com/1.jpg"],
  "cover": "https://cdn.example.com/cover.jpg",
  "videoData": {
    "objectUrl": "https://cdn.example.com/demo.mp4",
    "name": "demo.mp4",
    "type": "video/mp4"
  },
  "audioData": {
    "objectUrl": "https://cdn.example.com/ep1.mp3",
    "name": "ep1.mp3",
    "type": "audio/mpeg"
  }
}
```

- 文章：`title` + `content`，可带 `cover` / `images`。
- 动态：`title` + `content` + `images`。
- 视频：`title` + `description` + `videoData`。
- 音频：`title` + `description` + `audioData`。

完整字段与各平台差异见 [docs/CONTENT-DATA.md](docs/CONTENT-DATA.md)。

## 批量发布

`tasks.json`：

```json
{
  "defaults": {
    "type": "article",
    "channel": "CLOUD"
  },
  "tasks": [
    {
      "name": "任务 A",
      "platforms": ["weixin", "xhs"],
      "contentFile": "./a.json"
    },
    {
      "name": "任务 B",
      "platforms": "weibo",
      "content": {
        "title": "B",
        "content": "正文"
      },
      "scheduledAt": "2026-09-01 09:00:00"
    }
  ]
}
```

```bash
postbot batch-publish --file ./tasks.json --dry-run
postbot batch-publish --file ./tasks.json --fail-fast
```

`contentFile` 相对批量文件所在目录解析。失败任务会汇总；默认继续处理后续任务。

## 任务与排障

```bash
# 任务列表与筛选
postbot task list --status FAILED
postbot task list --platform xiaohongshu --search "文章"

# 任务详情
postbot task get 123

# 聚合状态（任务 + 最新 Job + 最近日志）
postbot status 123

# 手动触发自动发布（忽略定时时间）
postbot autopublish trigger 123

# 查看 Job 与执行日志
postbot autopublish jobs --task 123
postbot autopublish log --task 123 --full
postbot logs --task 123 --failed

# 更新任务（CLI 会 GET 合并后整体回传）
postbot task update 123 --title "新标题"

# 删除
postbot task delete 123 --force
```

常见问题：

| 现象 | 处理 |
|---|---|
| 保存成功但没有 Job | 检查平台 code 是否存在于引擎字典；`DESKTOP` 是否绑定在线桌面端 |
| 提示目标平台没有账号 | 先在客户端登录该平台账号；或使用 `--draft` |
| 定时任务没按新时间执行 | 引擎不会重排已有 Job；新建任务或 `autopublish trigger` |
| `HTTP 502` | 网关/引擎不可用，检查 API 地址与网络 |
| 登录已失效 | `postbot login` |

## JSON 与自动化

```bash
postbot whoami --json
postbot task list --status SUCCESS --json
postbot publish --platforms weixin --content-file ./content.json --wait --json
postbot batch-publish --file ./tasks.json --json
```

全局选项可放在子命令后：

```bash
postbot task list --json --app postbot
postbot platform list --app postar --json
```

错误输出：

```json
{
  "success": false,
  "error": {
    "message": "…",
    "code": "USER.NOT_FOUND",
    "kind": "user",
    "hint": "…"
  }
}
```

## 平台与通道

发布平台以 `postbot platform list` 返回的引擎字典为准。CLI 使用标准码：

| 标准码 | 别名 | 平台 |
|---|---|---|
| `xiaohongshu` | `xhs` | 小红书 |
| `weixin_channels` | `channels`、`wechat_channels` | 视频号 |
| `weixin` | `weixinmp`、`wechat_mp` | 公众号 |
| `xianyu` | `goofish`、`idlefish` | 闲鱼 |

发布通道：

- `CLOUD`：云端 Worker，默认。
- `BROWSER_EXTENSION`：已保存的浏览器扩展。
- `BROWSER_EXTENSION_EPHEMERAL`：服务端临时浏览器，不可绑定客户端。
- `DESKTOP`：桌面端，必须绑定在线客户端。

> 若数据库平台字典仍是 `xhs` / `channels` 等旧码，保存后可能不创建 Job。先运行 `postbot platform list` 核对；详见 [docs/ENGINE-API.md](docs/ENGINE-API.md#7-平台编号冲突)。

## 文档

- [CLI 命令参考](docs/CLI-REFERENCE.md)
- [内容数据格式](docs/CONTENT-DATA.md)
- [Engine API 对接](docs/ENGINE-API.md)

## 开发

```bash
pnpm install
pnpm build
pnpm test
pnpm dev -- --help
```

CLI 位于 `apps/postbot-cli`，SDK 位于 `packages/sdk/postbot-sdk`。修改 SDK 后需要重新构建 SDK 的 `dist`，CLI 才能读取到新的类型与实现。

## 👀 使用体验
- [PostBot 内容同步助手 云端体验](https://postbot.exmay.com/exmay/postbot/center/home)

## 📚 技术文档
- [官网文档](https://postbot.exmay.com/docs)
- [用户指南](https://postbot.exmay.com/docs/README)
- [快速开始](https://postbot.exmay.com/docs/quickstart)
- [开发指南](https://postbot.exmay.com/docs/dev-guide)

## 💻 代码托管

### PostBot CLI
- GitHub：[https://github.com/gitcoffee-os/postbot-cli](https://github.com/gitcoffee-os/postbot-cli)
- Gitee：[https://gitee.com/gitcoffee-os/postbot-cli](https://gitee.com/gitcoffee-os/postbot-cli)

### PostBot
- GitHub：[https://github.com/gitcoffee-os/postbot](https://github.com/gitcoffee-os/postbot)
- Gitee：[https://gitee.com/gitcoffee-os/postbot](https://gitee.com/gitcoffee-os/postbot)

### 国版版 Postar
- GitHub：[https://github.com/gitcoffee-os/postar](https://github.com/gitcoffee-os/postar)
- Gitee：[https://gitee.com/gitcoffee-os/postar](https://gitee.com/gitcoffee-os/postar)

## 🙌 贡献指南

PostBot CLI 只有通过开源协作才能蓬勃发展。秉持这一精神，我们欢迎来自社区的各种贡献。如果您有意参与其中，请查阅我们的 [贡献者指南](https://postbot.exmay.com/docs/contributing) 。


## ⚖️ License

本项目遵循 [GitCoffee Open Source License](https://github.com/gitcoffee-os/postbot-cli/blob/main/LICENSE) 开源协议，该许可证本质上是 [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0)，但有一些额外的限制。

## 🤝 商务合作

- [合作咨询](https://postbot.exmay.com/docs/partner)

## 👥 加入社区
PostBot CLI 内容同步助手 微信 交流群：

<img src="https://cdn.exmay.com/exmay/upload/app/qrcode/gitcoffee/gitcoffee-wechat-qrcode.png" width="230px" title="PostBot CLI 内容同步助手 微信群" />`

(扫码添加微信，备注：PostBot CLI，邀您加入群聊)

- [用户社群](https://postbot.exmay.com/docs/usergroup)

## 🌐 国际版
- [Postar - 国际版内容同步助手](https://postar.exmay.com/docs/) — 面向国际媒体平台（X / Twitter、Facebook、Instagram、TikTok、YouTube、LinkedIn 等）的内容同步分发工具。
- GitHub：[https://github.com/gitcoffee-os/postar](https://github.com/gitcoffee-os/postar)

## 🌍 开源生态

[开源生态](https://postbot.exmay.com/docs/opensource) 

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/image?repos=gitcoffee-os/postbot&type=date&legend=top-left)](https://github.com/gitcoffee-os/postbot)

<div align="center">

**⚡ PostBot 内容同步助手** - 一款开源的多平台内容同步分发生产力工具。

支持将文章、笔记、动态、图片、视频、音频等内容，一键同步发布至主流媒体平台。 🚀

[🏠 官网](https://postbot.exmay.com) | [📖 文档](https://postbot.exmay.com/docs) | [✨ PostBot 内容同步助手 云端体验](https://postbot.exmay.com/exmay/postbot/center/home) | [💬 社区](https://postbot.exmay.com/docs/usergroup) | [🐛 反馈](https://github.com/gitcoffee-os/postbot/issues) | [🌐 国际版 Postar](https://github.com/gitcoffee-os/postar)

</div>

<div align="center">

**⚡ PostBot CLI** - 命令行下的多平台内容同步、任务流程管理效率工具。 🚀

</div>
