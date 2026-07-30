<p align="center">
  <img alt="logo" src="https://postbot.exmay.com/docs/images/postbot_logo.svg" width="150" height="150">
</p>
<h1 align="center" style="margin: 30px 0 30px; font-weight: bold;">PostBot CLI v1.0.0</h1>

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

> [!NOTE]
> 当前为快速迭代开发版，适用于开发者与 CI/CD 场景。<br />
> 如需浏览器扩展或桌面端，请访问 [PostBot 内容同步助手](https://postbot.exmay.com)。

## 📦 安装

```bash
# 全局安装
npm install -g @gitcoffee/postbot-cli

# 或使用 pnpm
pnpm add -g @gitcoffee/postbot-cli
```

## 🚀 快速开始

```bash
# 配置开发者凭证
postbot config --client-id <id> --client-secret <secret>

# 登录
postbot login

# 查看当前用户
postbot whoami

# 一键发布内容
postbot publish --name "我的文章" --type article --content-file ./content.json
```

## 🔧 命令

### 认证

| 命令 | 说明 |
|------|------|
| `postbot login` | 交互式登录（支持代理认证与直接认证） |
| `postbot register` | 注册新账号 |
| `postbot logout` | 退出登录 |
| `postbot whoami` | 查看当前用户信息 |
| `postbot config` | 查看或设置开发者 OAuth2 凭证 |

### 同步发布

| 命令 | 说明 |
|------|------|
| `postbot publish` | 快速同步发布（交互式或参数式） |
| `postbot batch-publish --file <json>` | 从 JSON 文件批量同步发布 |
| `postbot status <taskId>` | 查询任务同步发布状态 |

### 工作流

| 命令 | 说明 |
|------|------|
| `postbot workflow status <executionId>` | 查询工作流执行状态 |
| `postbot workflow retry <executionId>` | 重试失败的工作流 |

### 任务管理

| 命令 | 说明 |
|------|------|
| `postbot task list` | 列出任务 |
| `postbot task get <taskId>` | 查看任务详情 |

### 查询

| 命令 | 说明 |
|------|------|
| `postbot platform list` | 列出支持的媒体平台 |
| `postbot account list` | 列出已绑定的媒体账号 |
| `postbot client list` | 列出已注册的客户端 |

### 应用模式

所有命令支持 `--app` 参数切换应用模式：

```bash
# 国际版 (Postar)
postbot --app postar login

# 指定平台同步发布
postbot --app postbot publish --name "Hello" --type article --content-file ./content.json
```

## ⚙️ 配置

配置文件位于 `~/.config/postbot-cli/config.json`，存储开发者凭证、登录 token 等信息。

```bash
# 查看当前配置
postbot config --show

# 设置凭证
postbot config --client-id <id> --client-secret <secret>

# 自定义 IAM 地址
postbot config --iam-base-url https://custom-iam.example.com
```

## 🏗️ 开发

```bash
# 克隆仓库
git clone https://github.com/gitcoffee-os/postbot-cli.git
cd postbot-cli

# 安装依赖
pnpm install

# 开发运行
pnpm dev

# 构建
pnpm build

# 以 postbot 模式运行
pnpm postbot

# 以 postar 模式运行
pnpm postar
```

## 📦 架构

```
apps/postbot-cli/          CLI 应用（commander + inquirer + chalk）
packages/sdk/postbot-sdk/  通用 SDK（HTTP 客户端、认证、领域 API、类型）
```

CLI 依赖的 API 调用能力全部由 `@gitcoffee/postbot-sdk` 提供，该 SDK 同样可被其他前端应用（如 PostBot.app、Postar.app）复用。

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
