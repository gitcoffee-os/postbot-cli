import {
  TaskApi,
  type Account,
  type MediaClient,
  type Platform,
  type PostbotClient,
  type TaskSaveRequest,
} from '@gitcoffee/postbot-sdk';
import {
  CONTENT_TYPES,
  normalizePublishChannel,
  type ContentType,
  type PublishChannel,
} from '../constants.js';
import {
  buildTaskData,
  loadContent,
  normalizeOnlineTime,
  validateContentForType,
  type TaskContent,
} from '../content.js';
import {
  preflightTargets,
  resolveAccount,
  resolveClientForChannel,
  type ResourceBundle,
  loadResources,
} from '../resources.js';
import { parsePlatformCodesInput } from '../platform/registry.js';

export interface TaskBuildSpec {
  name?: string;
  type?: string;
  /** 逗号分隔或数组 */
  platforms?: string | string[];
  /** 单平台兼容参数 */
  platform?: string;
  account?: string;
  accountId?: string | number;
  client?: string;
  channel?: string;
  contentFile?: string;
  contentJson?: string;
  content?: TaskContent;
  title?: string;
  scheduledAt?: string;
  maxRetries?: string | number;
  /** 是否自动发布，默认 true */
  autoPublish?: boolean;
  /** 仅保存草稿（等价 autoPublish=false） */
  draft?: boolean;
  contentId?: string;
  config?: string;
  /** 内容文件相对目录（批量发布使用） */
  baseDir?: string;
  /** 账号缺失时只警告（用于自定义发布器或稍后绑定账号） */
  allowMissingAccounts?: boolean;
}

export interface PreparedTask {
  payload: TaskSaveRequest & { platformCodes: string[] };
  platformCodes: string[];
  primaryPlatform?: Platform;
  primaryAccount?: Account;
  client?: MediaClient;
  content: TaskContent;
  data: TaskContent;
  autoPublish: boolean;
  channel: PublishChannel;
  warnings: string[];
}

/**
 * 将命令参数 + 引擎资源组装为 `/postbot/media/task/save` 请求。
 *
 * 与旧版 QUICK_PUBLISH 工作流的区别：
 * - 支持多平台（platformCodes 数组）；
 * - 支持草稿、定时、客户端绑定、重试次数、contentId；
 * - 保存后由引擎按平台编排 Job，行为与 Web 端一致。
 */
export async function prepareTask(
  client: PostbotClient,
  spec: TaskBuildSpec,
  bundle?: ResourceBundle,
): Promise<PreparedTask> {
  const warnings: string[] = [];

  const type = parseContentType(spec.type);
  const platformCodes = parsePlatformCodesInput(spec.platforms ?? spec.platform);
  if (platformCodes.length === 0) {
    throw new Error('至少需要一个目标平台，请使用 --platforms weixin,xiaohongshu');
  }

  const autoPublish = spec.draft ? false : spec.autoPublish !== false;
  const channel = normalizePublishChannel(spec.channel);
  if (!channel) {
    throw new Error(`非法发布通道: ${spec.channel}（可选 CLOUD / BROWSER_EXTENSION / BROWSER_EXTENSION_EPHEMERAL / DESKTOP）`);
  }

  const content = loadContent({
    contentFile: spec.contentFile,
    contentJson: spec.contentJson,
    content: spec.content,
    title: spec.title,
    baseDir: spec.baseDir,
  });

  const resources = bundle ?? (await loadResources(client, { withClients: true }));

  const preflight = preflightTargets(resources, platformCodes, {
    requireAccounts: autoPublish && !spec.allowMissingAccounts,
    type,
  });
  warnings.push(...preflight.warnings);
  if (spec.allowMissingAccounts) {
    warnings.push('已跳过账号缺失校验；若引擎找不到对应平台账号，Job 会直接失败。');
  }

  const primaryPlatform = resources.platformByCode.get(platformCodes[0]);
  if (!primaryPlatform) {
    // preflightTargets 已覆盖，此处仅做类型收窄保护
    throw new Error(`引擎中不存在平台: ${platformCodes[0]}`);
  }

  const primaryAccount =
    resolveAccount(resources, { account: spec.account, accountId: spec.accountId }) ??
    preflight.accountByPlatform.get(platformCodes[0]);

  const clientResult = await resolveClientForChannel(resources, {
    channel,
    explicit: spec.client,
  });
  warnings.push(...clientResult.warnings);

  const scheduledAt =
    spec.scheduledAt !== undefined
      ? normalizeOnlineTime(spec.scheduledAt)
      : content.onlineTime !== undefined
        ? normalizeOnlineTime(String(content.onlineTime))
        : undefined;

  if (scheduledAt && isPast(scheduledAt) && autoPublish) {
    warnings.push(`定时时间 ${scheduledAt} 已过去，引擎会尽快执行。`);
  }

  const data = buildTaskData({ content, platformCodes, scheduledAt, type });
  const contentProblems = validateContentForType(data, type, { autoPublish });
  warnings.push(...contentProblems);

  const name = String(spec.name ?? '').trim() || String(data.title ?? '').trim() || defaultTaskName();
  if (!String(spec.name ?? '').trim() && !String(data.title ?? '').trim()) {
    warnings.push(`未提供 --name，已自动命名为 "${name}"`);
  }

  const payload: PreparedTask['payload'] = {
    name,
    type,
    data,
    platformCodes,
    isAutoPublish: autoPublish,
    publishChannel: channel,
    mediaPlatformId: primaryPlatform.id,
  };

  if (primaryAccount) {
    payload.mediaAccountId = primaryAccount.id;
  }
  if (clientResult.client) {
    payload.mediaClientId = clientResult.client.id;
  }
  if (spec.maxRetries !== undefined && spec.maxRetries !== '') {
    const maxRetries = Number(spec.maxRetries);
    if (!Number.isInteger(maxRetries) || maxRetries < 0) {
      throw new Error(`--max-retries 必须是非负整数: ${String(spec.maxRetries)}`);
    }
    payload.maxRetryCount = maxRetries;
  }
  if (spec.contentId) {
    payload.contentId = spec.contentId;
  }
  if (spec.config) {
    payload.config = spec.config;
  }

  return {
    payload,
    platformCodes,
    primaryPlatform,
    primaryAccount,
    client: clientResult.client,
    content,
    data,
    autoPublish,
    channel,
    warnings,
  };
}

/** 创建任务并返回引擎保存后的实体 */
export async function createTask(client: PostbotClient, prepared: PreparedTask) {
  return new TaskApi(client).create(prepared.payload);
}

function parseContentType(value?: string): ContentType {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'article';
  if (!(CONTENT_TYPES as readonly string[]).includes(normalized)) {
    throw new Error(`非法内容类型: ${value}（可选 ${CONTENT_TYPES.join(' / ')}）`);
  }
  return normalized as ContentType;
}

function defaultTaskName(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `Post ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function isPast(engineTime: string): boolean {
  if (/^\d+$/.test(engineTime)) return Number(engineTime) < Date.now();
  const parsed = new Date(engineTime.replace(' ', 'T'));
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
}
