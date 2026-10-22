# PostBot CLI 命令参考（v1.1）

本文按命令组列出全部选项与行为。所有命令都支持全局选项；`postbot` 与 `postar` 两个可执行文件等价，区别只是默认 `--app`。

```bash
postbot <command> [options]
postar  <command> [options]   # 等价于 postbot --app postar ...
```

## 全局选项

| 选项 | 说明 |
|---|---|
| `--app <postbot\|postar>` | 应用模式。默认取配置 `currentApp`（初始为 `postbot`）；`postar` 使用国际版接口 |
| `--json` | 输出 JSON。适合 CI / 脚本；日志类提示走 stderr，stdout 保持可解析 |
| `--verbose` | 错误时打印堆栈 |
| `-y, --yes` | 跳过删除等操作的确认提示 |
| `-v, --version` | 打印版本 |
| `-h, --help` | 帮助 |

全局选项既可写在子命令前，也可写在子命令后（`-v/--version` 仅根命令前置使用）：

```bash
postbot --json task list
postbot task list --json
postbot --app postar task list
postbot task list --app postar
```

退出码：成功 `0`；参数/网络/业务错误或 `whoami` 未登录 `1`。删除类命令在非交互环境必须显式加 `--yes` / `--force`。

---

## 认证

### `postbot login`

| 选项 | 说明 |
|---|---|
| `-u, --username <username>` | 用户名 / 手机号 |
| `-p, --password <password>` | 密码 |
| `--no-register` | 用户不存在时不要自动注册 |
| `--show-token` | JSON 输出中包含 token（默认隐藏） |

- 已配置开发者凭证时走 IAM 代理登录；未配置时走直接登录。
- 代理登录发现用户不存在时默认自动注册（可用 `--no-register` 关闭）。
- 非交互环境必须显式传 `--username` / `--password`。

```bash
postbot login -u 13800000000 -p 'secret'
postbot login --json
```

### `postbot register`

| 选项 | 说明 |
|---|---|
| `-u, --username <username>` | 用户名 / 手机号 |
| `-p, --password <password>` | 密码 |
| `-n, --nickname <nickname>` | 昵称 |
| `-m, --mobile <mobile>` | 手机号 |
| `--show-token` | JSON 输出中包含 token |

需要开发者凭证（`postbot config --client-id ... --client-secret ...`）。

### `postbot forgot-password`

| 选项 | 说明 |
|---|---|
| `-u, --username <username>` | 用户名 |
| `-p, --password <password>` | 新密码 |

无需登录，但需要开发者凭证。

### `postbot logout`

仅删除本地 token，不会让服务端 token 失效。

### `postbot whoami`

打印当前登录用户。`--json` 输出 `{ app, loggedIn, user }`；未登录时退出码为 `1`。

---

## 配置

### `postbot config`

| 选项 | 说明 |
|---|---|
| `--show` | 显示当前配置（默认行为） |
| `--client-id <id>` | 设置 OAuth2 client ID |
| `--client-secret <secret>` | 设置 OAuth2 client secret |
| `--iam-base-url <url>` | 设置 IAM 地址 |
| `--default-app <postbot\|postar>` | 设置默认应用 |
| `--show-secret` | 显示完整 client secret（默认打码） |

配置文件：`~/.config/postbot-cli/config.json`。

```bash
postbot config --show
postbot config --client-id my-id --client-secret my-secret
postbot config --default-app postar
```

### 环境变量

| 变量 | 作用 |
|---|---|
| `POSTBOT_BASE_URL` / `POSTAR_BASE_URL` | 应用站点地址（直接登录使用） |
| `POSTBOT_API_URL` / `POSTAR_API_URL` | 引擎 API 根地址，需包含 `/exmay/authority/api` |
| `POSTBOT_APP_ID` / `POSTAR_APP_ID` | `App-Id` 请求头 |
| `POSTBOT_PROXY_APP_ID` / `POSTAR_PROXY_APP_ID` | 代理登录使用的 appId |

环境变量在进程启动时读取，优先级高于内置默认值。

---

## 发布

### `postbot publish`（别名 `pub`）

创建任务并默认自动发布。所有平台都直接调用 `POST /postbot/media/task/save`，不再区分单平台快捷工作流。

| 选项 | 默认 | 说明 |
|---|---|---|
| `--name <name>` | 内容标题 | 任务名称 |
| `--type <type>` | `article` | `article` / `moment` / `video` / `audio` |
| `--platforms <codes>` | — | 目标平台，逗号分隔，支持别名 |
| `--platform <code>` | — | 单平台兼容参数，已废弃 |
| `--account <username>` | 自动 | 主账号元数据；引擎仍按目标平台自动选账号 |
| `--account-id <id>` | 自动 | 主账号 ID |
| `--client <client>` | 自动 | 客户端 `id` / `name` / `clientKey` |
| `--channel <channel>` | `CLOUD` | `CLOUD` / `BROWSER_EXTENSION` / `BROWSER_EXTENSION_EPHEMERAL` / `DESKTOP` |
| `--content-file <path>` | — | 内容 JSON 文件 |
| `--content <json>` | — | 内联内容 JSON |
| `--title <title>` | — | 覆盖 `data.title` |
| `--scheduled-at <datetime>` | 立即 | 定时时间 |
| `--max-retries <count>` | 引擎默认 | 最大重试次数 |
| `--content-id <id>` | — | 上游内容 ID |
| `--config <json>` | — | 任务扩展配置 |
| `--draft` | 否 | 仅保存草稿，不自动发布 |
| `--allow-missing-accounts` | 否 | 跳过账号预检（不推荐） |
| `--wait` | 否 | 创建后轮询直到成功/失败/取消 |
| `--timeout <seconds>` | `600` | `--wait` 超时 |
| `--interval <seconds>` | `3` | `--wait` 轮询间隔 |

示例：

```bash
# 多平台立即发布
postbot publish \
  --platforms weixin,xiaohongshu,douyin \
  --content-file ./content.json

# 定时发布
postbot publish \
  --platforms weixin \
  --content-file ./content.json \
  --scheduled-at "2026-09-01 09:00:00"

# 桌面端发布（自动选择在线桌面端）
postbot publish --platforms xhs --channel DESKTOP --content-file ./note.json

# 保存草稿
postbot publish --platforms weixin --draft --content-file ./content.json

# 发布并等待结果
postbot publish --platforms weixin --content-file ./content.json --wait
```

预检行为：

- 目标平台必须存在于引擎平台字典，否则直接报错。
- 自动发布时每个目标平台必须有一个可用账号；缺失会报错。账号 `expired` / `unbound` / `renew` 会给警告。
- `DESKTOP` 通道必须有在线桌面端；省略 `--client` 时自动选择唯一在线桌面端，多个时交互选择。
- `CLOUD` / `BROWSER_EXTENSION_EPHEMERAL` 不接受 `--client`，避免引擎按客户端类型覆盖通道。
- 内容类型不被静态注册表支持时只警告，以引擎实际发布器为准。

### `postbot batch-publish`

| 选项 | 说明 |
|---|---|
| `--file <path>` | 必填，批量 JSON |
| `--channel <channel>` | 默认发布通道 |
| `--dry-run` | 只组装并打印 payload，不保存 |
| `--fail-fast` | 第一个错误后停止 |

批量文件支持两种形态：

```json
[
  {
    "name": "任务 A",
    "type": "article",
    "platforms": ["weixin", "xhs"],
    "contentFile": "./a.json"
  },
  {
    "name": "任务 B",
    "type": "moment",
    "platforms": "weibo",
    "content": { "title": "B", "content": "正文" }
  }
]
```

或带默认值：

```json
{
  "defaults": {
    "type": "article",
    "channel": "CLOUD",
    "account": "my-account"
  },
  "tasks": [
    { "name": "A", "platforms": ["weixin"], "contentFile": "./a.json" },
    { "name": "B", "platforms": ["zhihu"], "contentFile": "./b.json", "scheduledAt": "2026-09-01 09:00:00" }
  ]
}
```

字段别名：

| 目标 | 可用字段 |
|---|---|
| 平台 | `platforms` / `platformCodes` / `platformCode` / `platform` |
| 账号 | `account` / `accountUsername` / `accountId` |
| 通道 | `channel` / `publishChannel` |
| 内容 | `content`（对象或 JSON 字符串）/ `contentFile` |
| 定时 | `scheduledAt` / `onlineTime` |
| 重试 | `maxRetryCount` / `maxRetries` |
| 客户端 | `client` / `mediaClientId` |

`contentFile` 的相对路径基于批量文件所在目录。默认继续执行后续任务；汇总失败数并设置退出码 `1`。

```bash
postbot batch-publish --file ./tasks.json --dry-run
postbot batch-publish --file ./tasks.json --channel CLOUD
```

### `postbot status <taskId>`

| 选项 | 默认 | 说明 |
|---|---|---|
| `--no-logs` | 显示 | 不显示最近执行日志 |
| `--log-limit <count>` | `5` | 显示日志条数 |

聚合任务状态来自工作流 `STATUS_QUERY`，最新 Job 由 `/autopublish/task/{id}/status` 补全（工作流只返回精简字段）。

---

## 任务

### `postbot task list`

| 选项 | 默认 | 说明 |
|---|---|---|
| `--page <page>` | `1` | 页码 |
| `--size <size>` | `20` | 每页 1–200 |
| `--status <status>` | — | `DRAFT` / `PENDING` / `SCHEDULED` / `RUNNING` / `SUCCESS` / `FAILED_RETRYABLE` / `FAILED` / `CANCELLED` |
| `--platform <code>` | — | 按平台筛选 |
| `--search <keyword>` | — | 按名称 / ID 搜索 |
| `--all` | 否 | 返回全部 |

引擎 `/task/list` 只支持分页，不支持状态/平台过滤；带筛选条件时 CLI 会先取 `/task/listing` 全量再本地过滤、分页。

### `postbot task get <taskId>`

查看任务详情。`--json` 输出引擎原始实体。

### `postbot task save`

与 `publish` 基本一致，但默认不等待，选项为：

`--name --type --platforms --platform --account --account-id --client --channel --content-file --content --title --scheduled-at --max-retries --content-id --config --draft --allow-missing-accounts`

不传 `--draft` 时 `isAutoPublish=true`；传 `--draft` 时保存为 `DRAFT`。

### `postbot task update <taskId>`

| 选项 | 说明 |
|---|---|
| `--name` / `--type` / `--status` | 名称 / 类型 / 状态 |
| `--platforms` / `--platform` | 目标平台 |
| `--account` / `--account-id` | 主账号 |
| `--client` / `--channel` | 客户端 / 通道 |
| `--content-file` / `--content` | 替换内容 |
| `--title` | 覆盖标题 |
| `--scheduled-at` | 新定时时间 |
| `--max-retries` | 新重试次数 |
| `--content-id` / `--config` | 内容 ID / 扩展配置 |
| `--auto-publish` | 开启自动发布并重算状态 |
| `--draft` | 转为草稿 |

实现方式：先 `GET /task/load`，合并修改后整体回传。原因是引擎 `/update` 在缺省字段时会把 `publishChannel` 重置为 `CLOUD`、`status` 重置为 `PENDING`/`SCHEDULED`。

注意事项：

- 引擎 `/update` 无法清空 `mediaClientId`；如果任务已绑定客户端而目标通道是 `CLOUD` / `BROWSER_EXTENSION_EPHEMERAL`，CLI 会报错，建议新建任务。
- 修改 `--scheduled-at` 不会修改已创建 Job 的定时时间；旧 Job 仍按原时间执行。
- `--draft` 与 `--auto-publish` 不能同时使用。

### `postbot task delete <taskId>`

| 选项 | 说明 |
|---|---|
| `-f, --force` | 跳过确认 |

### `postbot task batch-delete`

| 选项 | 说明 |
|---|---|
| `--ids <ids>` | 必填，逗号分隔 |
| `-f, --force` | 跳过确认 |

### `postbot task bind-content <taskId> <contentId>`

幂等绑定上游内容 ID：任务已有 `contentId` 时返回原值，不覆盖。

---

## 自动发布

### `postbot autopublish trigger <taskId>`

立即触发任务自动发布，忽略既定定时时间。已有 `PENDING` / `RUNNING` / `FAILED_RETRYABLE` Job 的平台不会重复创建。

### `postbot autopublish status <taskId>`

查看任务最新一条 Job（可能为空）。

### `postbot autopublish jobs`

| 选项 | 说明 |
|---|---|
| `--task <taskId>` | 按任务筛选 |
| `--status <status>` | 按状态筛选 |
| `--platform <code>` | 按平台筛选 |
| `--limit <count>` | 最多返回条数 |

### `postbot autopublish log` / `postbot logs`

| 选项 | 说明 |
|---|---|
| `--task <taskId>` | 按任务筛选并输出明细 |
| `--status <status>` | 按状态筛选 |
| `--platform <code>` | 按平台筛选 |
| `--limit <count>` | 最多返回条数 |
| `--failed` | 只看 `FAILED` / `FAILED_RETRYABLE` |
| `--full` | 输出完整 `fullLog` |

`postbot logs` 是 `postbot autopublish log` 的顶层快捷方式。

---

## 平台

### `postbot platform list`

| 选项 | 说明 |
|---|---|
| `--type <type>` | 平台类型，如 `media` |
| `--status <status>` | 状态，如 `ok` |
| `--search <keyword>` | code / 名称 / 描述搜索 |

表格中的“支持的内容类型”来自 CLI 静态注册表，仅作提示；实际以引擎发布器为准。若引擎仍使用 `xhs` / `channels` 等旧编号，CLI 会提示。

### `postbot platform get <idOrCode>`

平台详情，包含 `publishChannelConfig`（按 `BROWSER_EXTENSION` / `DESKTOP` / `CLOUD` 配置发布页与能力）。

---

## 账号与指纹

### `postbot account list`（别名 `acc list`）

| 选项 | 默认 | 说明 |
|---|---|---|
| `--platform <codeOrId>` | — | 按平台筛选 |
| `--status <ok\|renew\|expired\|unbound>` | — | 按状态筛选 |
| `--search <keyword>` | — | 用户名 / 名称 / 平台账号 ID |
| `--page <page>` | `1` | 页码 |
| `--size <size>` | `20` | 每页条数 |
| `--all` | 否 | 返回全部 |

### `postbot account get <accountId>`

账号详情，包含关联的 SessionBot 会话、Cookie 数量等。

### `postbot account save`

| 选项 | 说明 |
|---|---|
| `--username <username>` | 必填，平台账号用户名 |
| `--name <name>` | 显示名称，默认同用户名 |
| `--platform <codeOrId>` | 必填 |
| `--account-id <id>` | 平台侧账号 ID |
| `--profile` / `--avatar` / `--homepage` / `--url` | 资料字段 |
| `--session <bizId>` | 绑定 SessionBot 会话业务 ID |

引擎 `/save` 不返回账号 ID；CLI 会反查最新记录并打印（尽力而为）。

### `postbot account update <accountId>`

选项同上。引擎 `updateById` 忽略 null；CLI 只提交修改字段并保留现有非空字段。

无法通过 update 清空 `sessionbotSessionId`；请改绑另一个会话。

### `postbot account remove <accountId>` / `account batch-remove --ids`

删除账号不会删除 SessionBot 会话。`batch-remove` 支持 `-f/--force`。

### `postbot account fingerprint get <accountId>`

查看账号浏览器指纹；未设置时返回空，发布时使用引擎自动解析。

### `postbot account fingerprint save <accountId>`

| 选项 | 说明 |
|---|---|
| `--ua <ua>` | User-Agent |
| `--locale <locale>` | 如 `zh-CN` |
| `--timezone <timezone>` | 如 `Asia/Shanghai` |
| `--viewport-width <px>` / `--viewport-height <px>` | 视口 |
| `--device-scale-factor <ratio>` | 像素比 |
| `--hardware-concurrency <count>` | CPU 核数 |
| `--color-scheme <light\|dark>` | 配色 |
| `--os <os>` / `--platform <platform>` | 系统信息 |

每次保存版本自动 +1。

### `postbot account fingerprint remove <accountId>`

删除后回落到自动解析。

---

## 客户端

### `postbot client list`

| 选项 | 说明 |
|---|---|
| `--type <type>` | `browser_extension` / `browser_extension_ephemeral` / `desktop` / `cloud` |
| `--online` | 只看 120 秒内有心跳的客户端 |
| `--platform <codeOrId>` | 按平台筛选 |

### `postbot client get <clientId>`

### `postbot client save`

| 选项 | 说明 |
|---|---|
| `--name <name>` | 必填 |
| `--type <type>` | 必填 |
| `--client-key <key>` | 必填，客户端唯一标识 |
| `--platform <codeOrId>` | 平台 |
| `--account-id <id>` | 媒体账号 ID |
| `--session <id>` | SessionBot 会话数据库 ID |

通常由扩展/桌面端自动上报；CLI 主要用于调试。

### `postbot client update <clientId>`

`--name --type --client-key --platform --account-id --session --online`。`--online` 会把 `lastOnlineAt` 更新为当前时间。

### `postbot client remove <clientId>` / `client batch-remove --ids`

---

## SessionBot 会话（只读）

### `postbot session list`

| 选项 | 说明 |
|---|---|
| `--search <keyword>` | bizId / 别名 / 域名 |
| `--domain <domain>` | 域名筛选 |

### `postbot session get <bizId>`

| 选项 | 说明 |
|---|---|
| `--cookies` | 以表格显示 Cookie 名称/域名（值请用 `--json`） |

取消/修改会话请使用 SessionBot 客户端；CLI 不提供写操作。

---

## 通知

### `postbot notify`

| 选项 | 说明 |
|---|---|
| `--event <event>` | 必填，事件名称，如 `userProxyRenewal` |
| `--info <json>` | 事件详情 JSON 对象 |
| `--info-file <path>` | 从文件读取事件详情 |
| `--client-id <id>` | `Client-Id` 请求头 |

接收方须实时返回 `SUCCESS`；通知失败会以业务错误返回。

---

## 工作流

### `postbot workflow list`

列出可用工作流类型。

### `postbot workflow execute <workflowType>`

| 选项 | 说明 |
|---|---|
| `--input <json>` | 输入 JSON 对象 |
| `--input-file <path>` | 从文件读取 |
| `--task-id <id>` | 快捷注入 `input.taskId` |
| `--output` | 打印每个步骤的 output |

```bash
postbot workflow execute STATUS_QUERY --task-id 123
postbot workflow execute STATUS_QUERY --task-id 123 --json
```

### `postbot workflow status <executionId>` / `workflow retry <executionId>`

| 选项 | 说明 |
|---|---|
| `--output` | 打印步骤 output |

---

## JSON 输出约定

大多数命令在 `--json` 下输出引擎原始实体或数组；列表命令输出分页对象：

```json
{
  "list": [],
  "total": 0,
  "current": 1,
  "size": 20,
  "pages": 1
}
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

`publish --wait --json` 输出 `{ "task": {...}, "status": {...} }`；`batch-publish --json` 输出结果数组；`--dry-run --json` 输出 `{ "dryRun": true, "tasks": [...], "failed": [...] }`，有失败时退出码为 `1`。

---

## 常见失败

| 现象 | 原因 / 处理 |
|---|---|
| `任务保存成功但没有 Job` | 平台 code 不在引擎字典，或 `DESKTOP` 没有绑定 `mediaClientId`。先 `postbot platform list` / `postbot client list` |
| `以下平台没有可用账号` | 先在客户端登录该平台账号；或 `--draft` 只存草稿 |
| `HTTP 502` | 网关/引擎不可用，检查 API 地址与网络 |
| `登录已失效` | `postbot login` |
| 定时任务没按新时间执行 | 引擎不会重排已有 Job；新建任务或 `autopublish trigger` |
| 发布成功但链接为空 | 部分发布器不返回发布链接；用 `postbot logs --task <id> --full` 查看详情 |
