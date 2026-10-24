# PostBot Engine API 对接说明

本文记录 `@gitcoffee-os/postbot-cli` 实际使用的 `exmay-postbot-engine` 接口、字段和行为差异。实现位于 `packages/sdk/postbot-sdk`，CLI 只负责参数解析、预检和展示。

## 1. 连接与认证

| 项 | 值 |
|---|---|
| API 根地址 | `https://api.exmay.com/exmay/authority/api`（Postar 使用对应站点） |
| 认证头 | `Authorization: Bearer <token>` |
| 应用头 | `App-Id: <appId>` |
| 内容类型 | `Content-Type: application/json` |
| 默认超时 | 30 秒 |

环境变量 `POSTBOT_API_URL` / `POSTAR_API_URL` 可覆盖完整 API 根地址（必须包含 `/exmay/authority/api`）。

### 响应约定

引擎多数接口返回 HTTP 200，业务结果在响应体：

```json
{ "code": "SUCCESS", "msg": "ok", "data": {} }
```

- 成功码：`SUCCESS`、`0`、`"0"`、缺省 `code`。
- 失败：HTTP 200 且 `code` 为业务错误码/数值码；SDK 会抛出 `IamApiError`，保留 `code`。
- 非 2xx：SDK 抛出带 HTTP 状态和响应片段的错误。
- `NOT_LOGIN` / `USER.TOKEN_EXPIRED` / `DEVELOPER.TOKEN_EXPIRED` 等由 CLI 归类后提示重新登录。

## 2. 接口清单

### 任务

| SDK 方法 | 方法 / 路径 | 说明 |
|---|---|---|
| `TaskApi.list` | `GET /postbot/media/task/list?page=&size=` | 分页；引擎只按用户过滤，**不实现 status 过滤** |
| `TaskApi.listAll` | `GET /postbot/media/task/listing` | 全量；CLI 用于状态/平台/关键字筛选 |
| `TaskApi.get` | `GET /postbot/media/task/load?id=` | 校验归属 |
| `TaskApi.create` | `POST /postbot/media/task/save` | 新建；`isAutoPublish=true` 时保存后立即编排 Job |
| `TaskApi.update` | `PUT /postbot/media/task/update` | 需含 `id`；见第 3 节注意事项 |
| `TaskApi.delete` | `DELETE /postbot/media/task/remove` | 请求体 `{ id }` |
| `TaskApi.batchDelete` | `DELETE /postbot/media/task/batch_remove?ids=1,2` | **查询参数**，不是 JSON body |
| `TaskApi.bindContent` | `POST /postbot/media/task/bind_content` | `{ taskId, contentId }`，幂等 |

### 自动发布

| SDK 方法 | 方法 / 路径 | 说明 |
|---|---|---|
| `AutoPublishApi.trigger` | `POST /postbot/autopublish/task/{taskId}/trigger` | 忽略定时时间立即编排；已有活跃 Job 的平台跳过 |
| `AutoPublishApi.getStatus` | `GET /postbot/autopublish/task/{taskId}/status` | 最新一条 Job 或 `null` |
| `AutoPublishApi.listJobs` | `GET /postbot/autopublish/job/list` | 返回当前用户全部 Job；SDK 在客户端按 `taskId/status/platformCode/limit` 过滤 |
| `AutoPublishApi.listLogs` | `GET /postbot/autopublish/log/list` | 返回全部日志；SDK 客户端过滤 |

### 平台 / 账号 / 客户端

| SDK 方法 | 方法 / 路径 |
|---|---|
| `PlatformApi.list` / `listPaged` | `GET /postbot/media/platform/listing` / `/list` |
| `PlatformApi.get` | `GET /postbot/media/platform/load?id=` |
| `AccountApi.list` / `listPaged` | `GET /postbot/media/account/listing` / `/list` |
| `AccountApi.get` | `GET /postbot/media/account/load?id=` |
| `AccountApi.findBySession` | `GET /postbot/media/account/find_by_session?sessionbotSessionId=` |
| `AccountApi.save` | `POST /postbot/media/account/save`（无返回体） |
| `AccountApi.update` | `PUT /postbot/media/account/update` |
| `AccountApi.remove` | `DELETE /postbot/media/account/remove`（body `{ id }`） |
| `AccountApi.batchRemove` | `DELETE /postbot/media/account/batch_remove?ids=` |
| `ClientApi.list` / `listPaged` | `GET /postbot/media/client/listing` / `/list` |
| `ClientApi.get` | `GET /postbot/media/client/load?id=` |
| `ClientApi.register` | `POST /postbot/media/client/save`（无返回体） |
| `ClientApi.update` | `PUT /postbot/media/client/update` |
| `ClientApi.remove` / `batchRemove` | `DELETE .../remove`（body）/ `.../batch_remove?ids=` |

### 指纹 / 会话 / 通知 / 工作流

| SDK 方法 | 方法 / 路径 |
|---|---|
| `FingerprintApi.load` | `GET /postbot/media/account/fingerprint/load?mediaAccountId=` |
| `FingerprintApi.save` | `POST /postbot/media/account/fingerprint/save` |
| `FingerprintApi.remove` | `DELETE /postbot/media/account/fingerprint/remove?mediaAccountId=` |
| `SessionApi.list` / `listPaged` | `GET /sessionbot/session/listing` / `/list` |
| `SessionApi.get` | `GET /sessionbot/session/load?id=<bizId>` |
| `NotifyApi.send` | `POST /postbot/notify` |
| `WorkflowApi.listDefinitions` | `GET /workflow/definitions` |
| `WorkflowApi.executeWorkflow` | `POST /workflow/execute` |
| `WorkflowApi.getExecutionStatus` | `GET /workflow/execution/{id}` |
| `WorkflowApi.retryExecution` | `POST /workflow/execution/{id}/retry` |

## 3. 任务保存 / 更新

### 请求字段

```ts
interface TaskSaveRequest {
  id?: number;
  name?: string;
  type?: string;                 // article | moment | video | audio
  mediaPlatformId?: number | null;
  mediaAccountId?: number | null;
  mediaClientId?: number | null;
  contentId?: string;
  data?: string | Record<string, any>;
  platformCodes?: string[];      // 与 data.platformCodes 合并去重、别名归一化
  isAutoPublish?: boolean;
  config?: string | Record<string, any>;
  publishChannel?: string;       // CLOUD | BROWSER_EXTENSION | BROWSER_EXTENSION_EPHEMERAL | DESKTOP
  scheduledAt?: string;          // Jackson LocalDateTime，建议 "yyyy-MM-ddTHH:mm:ss"
  maxRetryCount?: number;
  status?: string;
}
```

### 保存行为

1. 解析 `data`（对象或 JSON 字符串）并统一存为 JSON 字符串。
2. 合并顶层 `platformCodes` 与 `data.platformCodes`，做别名归一化、去重。
3. 若未传 `scheduledAt`，从 `data.onlineTime` 解析；支持 `yyyy-MM-dd HH:mm:ss`、`yyyy-MM-dd'T'HH:mm:ss`、`yyyy-MM-dd HH:mm`、纯日期、毫秒时间戳、空串（立即）。
4. 由 `isAutoPublish` + 定时时间推导 `status`：草稿 `DRAFT`；未来时间 `SCHEDULED`；否则 `PENDING`。
5. `isAutoPublish=true` 时立即为每个目标平台创建 Job；**Job 初始状态统一为 `PENDING`，即使定时时间在未来**。

### 更新行为（重要）

`PUT /update` 不是 PATCH：

- `updateById` 忽略 null 字段，但保存前会执行 `fillPublishParams`；缺省 `publishChannel` 会重置为 `CLOUD`，缺省 `status` 会按定时时间重置为 `PENDING` / `SCHEDULED`。
- 因此 CLI 先 `GET /load`，合并本次修改后**整体回传**。
- `mediaClientId` 使用 MyBatis `NOT_NULL` 更新策略，**无法通过 `/update` 清空**；从 `DESKTOP` 切到 `CLOUD` 时 CLI 会报错，建议新建任务。
- 端点解析器在 `mediaClientId` 存在时会按客户端类型覆盖 `publishChannel`；CLI 在绑定客户端时按此规则校验。
- 修改 `scheduledAt` 不会更新已创建 Job 的定时时间。要按新时间执行，需取消/重建任务或等待旧 Job 处理；`trigger` 只对缺少活跃 Job 的平台补建。

## 4. 自动发布编排

保存/更新后，`ExmayPostbotMediaTaskAutoPublishHandler` 在插入和更新时都会触发自动发布处理：

1. 读取任务 `platformCodes` 与 `data`。
2. 对每个目标平台查平台字典；平台不存在则跳过并记录。
3. 解析该平台的媒体账号（优先任务 `mediaAccountId` / `mediaPlatformId`，否则按平台自动选账号）。
4. 已有 `PENDING` / `RUNNING` / `FAILED_RETRYABLE` Job 的平台不重复创建。
5. 创建 Job，写入平台、账号、客户端、通道、定时时间与任务快照。

常见“保存成功但没有 Job”原因：

- 平台 code 不在引擎字典（尤其是数据库仍用 `xhs` / `channels` 旧码）；
- 自动发布目标平台没有可用账号；
- `DESKTOP` 通道未绑定 `mediaClientId`，`canAutoPublish=false`；
- 已有同平台活跃 Job，属于幂等跳过。

## 5. 发布通道

| 通道 | 执行方 | 客户端绑定 |
|---|---|---|
| `CLOUD` | 云端 Worker | 不需要；传入客户端会被端点解析器改通道，CLI 拒绝 |
| `BROWSER_EXTENSION` | 已保存的浏览器扩展 | 可指定 `mediaClientId`；不指定时由扩展侧领取 |
| `BROWSER_EXTENSION_EPHEMERAL` | 服务端临时浏览器 | **不可绑定客户端**；由服务端执行 |
| `DESKTOP` | 桌面端 | 必须绑定在线桌面端 `mediaClientId` |

在线判定：`lastOnlineAt` 距当前不超过 120 秒（客户端心跳周期 90 秒，留余量）。

## 6. 状态查询

任务级聚合状态使用工作流：

```json
{ "workflowType": "STATUS_QUERY", "input": { "taskId": 123 } }
```

返回 `task`、`latestJob`、`recentLogs`、`summary` 等。注意：

- `latestJob` 是精简字段（`id/status/channel/times/retry`），完整 Job 需再查 `/autopublish/task/{id}/status`。
- 任务聚合状态可能因平台多 Job 而取“最差/进行中”组合；CLI 会优先展示任务自身 `status`，并展示 Job/日志。

## 7. 平台编号冲突

引擎代码中的标准码（`normalizePlatformCode`）与 Worker 发布器 key 一致：

| 标准码 | 历史别名 |
|---|---|
| `xiaohongshu` | `xhs` |
| `weixin_channels` | `channels`、`wechat_channels` |
| `weixin` | `weixinmp`、`wechat_mp` |
| `xianyu` | 无（CLI 额外接受 `goofish` / `idlefish`） |

但仓库内 `V1_3_1__media_platform_init.sql` 仍插入 `xhs`、`channels`、`xianyu`。如果数据库平台字典没有升级：

- 保存请求里的 `xiaohongshu` 会被归一化，但按 code 查平台时可能找不到；
- Job 不会创建，任务看似“保存成功”。

核对命令：

```bash
postbot platform list
postbot platform get xiaohongshu
```

修复方向：把 `exmay_postbot_media_platform.code` 更新为标准码（同时保留别名兼容），或让部署脚本按实际字典同步。
