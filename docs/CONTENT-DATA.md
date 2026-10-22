# 内容数据（`data`）格式

`postbot publish` / `postbot task save` 的 `--content-file` 或 `--content` 最终会写入引擎任务的 `data` 字段。引擎把 `data` 原样透传给 Worker 发布器，因此不同平台/内容类型能识别的字段并不完全一致；本文列出通用字段、各类型示例和 CLI 的校验规则。

> 引擎要求 `data` 是 JSON **对象**。数组、纯字符串、空文件会被 CLI 拒绝。

## 1. 通用字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | string | 标题。文章/动态建议提供（部分平台可只发正文）；视频/音频作为标题 |
| `content` | string | 正文。文章/动态可为 HTML 或纯文本；视频/音频作为简介 |
| `description` | string | 描述。视频/音频发布器优先取它，缺省回退 `content` |
| `images` | array | 图片列表。元素可为 URL 字符串，或 `{src}` / `{url}` / `{objectUrl}` |
| `cover` | object \| string \| array | 封面。可为 URL、`{url}`、`{objectUrl}` 或对象数组 |
| `horizontalCover` | object \| string | 横版封面 |
| `verticalCover` | object \| string | 竖版封面 |
| `coverMode` | number \| string | 封面模式，兼容 `0/1` 与 `normal/auto` |
| `videoData` | object | 视频文件，见下文 |
| `audioData` | object | 音频文件，见下文 |
| `mediaType` | string | `image` / `video` / `audio` 等，透传给发布器 |
| `tags` | array | 标签（部分平台使用） |
| `published` | boolean | 发布态标记（编辑器字段，通常无需传） |
| `onlineTime` | string \| number | 定时发布时间，见第 5 节 |
| `platformCodes` | array | 目标平台。CLI 会用 `--platforms` 覆盖并写入 |

### `videoData` / `audioData`

```json
{
  "objectUrl": "https://cdn.example.com/demo.mp4",
  "url": "https://cdn.example.com/demo.mp4",
  "name": "demo.mp4",
  "type": "video/mp4",
  "size": 12345678
}
```

`objectUrl`（或 `url`）是必需的可访问地址；`name` / `type` / `size` 建议提供，发布器会用它们创建上传文件。

## 2. 文章（`--type article`）

```json
{
  "title": "一篇来自 CLI 的文章",
  "content": "<h2>小标题</h2><p>正文段落。</p><p>支持 HTML。</p>",
  "cover": "https://cdn.example.com/cover.jpg",
  "images": [
    "https://cdn.example.com/1.jpg",
    { "url": "https://cdn.example.com/2.jpg" }
  ],
  "tags": ["CLI", "PostBot"]
}
```

- `content` 可以是 HTML；纯文本发布器通常会按换行分段。
- 需要封面时优先给 `cover`；部分平台会从 `images` 取首图。
- 文章类型适合公众号、知乎、头条号、百家号、简书、WordPress 等。

## 3. 动态（`--type moment`）

```json
{
  "title": "今日随记",
  "content": "今天用 CLI 发了一条动态。",
  "images": ["https://cdn.example.com/photo.jpg"]
}
```

- 微博、小红书、抖音、视频号、闲鱼等平台的“动态/笔记”走此类型。
- 小红书等平台标题有长度限制，发布器会截断；建议标题不超过 20 个汉字。
- 闲鱼（平台 code `xianyu`）只支持动态类型。

## 4. 视频 / 音频

### 视频

```json
{
  "title": "视频标题",
  "description": "视频简介",
  "content": "视频简介（description 缺省时使用）",
  "videoData": {
    "objectUrl": "https://cdn.example.com/demo.mp4",
    "name": "demo.mp4",
    "type": "video/mp4"
  },
  "cover": "https://cdn.example.com/cover.jpg"
}
```

### 音频

```json
{
  "title": "播客第 1 期",
  "description": "本期聊 CLI 自动化发布",
  "audioData": {
    "objectUrl": "https://cdn.example.com/ep1.mp3",
    "name": "ep1.mp3",
    "type": "audio/mpeg"
  },
  "cover": "https://cdn.example.com/cover.jpg"
}
```

CLI 在自动发布（非 `--draft`）时会检查 `videoData` / `audioData` 是否存在可访问引用；草稿只提示不阻断。

## 5. 定时发布

CLI 接受以下写法，并统一写入 `data.onlineTime`：

| 输入 | 写入值 |
|---|---|
| `2026-09-01 09:30:00` | `2026-09-01 09:30:00` |
| `2026-09-01T09:30:00` | `2026-09-01 09:30:00` |
| `2026-09-01 09:30` | `2026-09-01 09:30:00` |
| `2026-09-01` | `2026-09-01 00:00:00` |
| `1767225600000`（13 位毫秒） | 原样 |
| `1767225600`（10 位秒） | 转换为 13 位毫秒 |
| `2026-09-01T09:30:00+08:00` / `Z` | 转换为本地时间 `yyyy-MM-dd HH:mm:ss` |
| 空串 / 不传 | 立即发布 |

注意：

- 引擎按服务器本地时区解析不带时区的时间。
- 10 位秒级时间戳会被 CLI 转成毫秒；引擎本身只认毫秒。
- 已过期的定时时间不会报错，引擎会尽快执行，CLI 会给出警告。
- `postbot task update --scheduled-at` 不会重排已经创建的 Job；重排请新建任务或用 `postbot autopublish trigger` 立即执行。

## 6. 平台编号

CLI 输出的平台编号以引擎标准码为准：

| 标准码 | 别名（CLI 接受） | 平台 |
|---|---|---|
| `xiaohongshu` | `xhs` | 小红书 |
| `weixin_channels` | `channels`、`wechat_channels` | 视频号 |
| `weixin` | `weixinmp`、`wechat_mp` | 公众号 |
| `xianyu` | `goofish`、`idlefish` | 闲鱼 |

其他常用：`douyin`、`kuaishou`、`bilibili`、`zhihu`、`weibo`、`toutiao`、`baijiahao`、`qq_om`、`douban`、`jianshu`、`zsxq`、`music163`、`qqmusic`、`ximalaya`、`qingting`、`lizhi`、`xiaoyuzhoufm`，以及 `facebook`、`x`、`instagram`、`tiktok`、`youtube`、`linkedin`、`threads`、`bluesky` 等。

> 实际可发布平台以 `postbot platform list` 返回的引擎字典为准。引擎按 `platformCodes` 逐个查平台并创建 Job；平台不存在或账号缺失时不会发布。

## 7. CLI 会替你写入什么

CLI 组装请求时会：

1. 归一化平台别名，去重；
2. 把 `--platforms` 写入顶层 `platformCodes` 和 `data.platformCodes`；
3. 把 `--scheduled-at` 归一化后写入 `data.onlineTime`；
4. 用 `--title` 覆盖 `data.title`；
5. 根据 `--draft` / 默认值设置 `isAutoPublish`；
6. 校验每个目标平台在引擎字典中存在、自动发布时存在可用账号；
7. `DESKTOP` 通道自动选择在线桌面端并写入 `mediaClientId`。

`data` 里的其他字段会原样保留。
