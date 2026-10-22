import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { TaskApi, type Task } from '@gitcoffee/postbot-sdk';
import {
  CONTENT_TYPES,
  TASK_STATUSES,
  normalizePublishChannel,
  type ContentType,
  type PublishChannel,
} from '../constants.js';
import {
  buildTaskData,
  loadContent,
  normalizeOnlineTime,
  toEngineLocalDateTime,
  validateContentForType,
  type TaskContent,
} from '../content.js';
import {
  loadResources,
  preflightTargets,
  resolveAccount,
  resolveClientForChannel,
  type ResourceBundle,
} from '../resources.js';
import { parsePlatformCodesInput } from '../platform/registry.js';
import { printJson, printSuccess, printWarning } from '../output.js';
import { printTaskDetail, printWarnings } from './format.js';

export interface TaskUpdateOptions {
  name?: string;
  type?: string;
  status?: string;
  platforms?: string;
  platform?: string;
  account?: string;
  accountId?: string;
  client?: string;
  channel?: string;
  contentFile?: string;
  contentJson?: string;
  title?: string;
  scheduledAt?: string;
  maxRetries?: string;
  contentId?: string;
  config?: string;
  draft?: boolean;
  autoPublish?: boolean;
}

const ACTIVE_STATUSES = ['PENDING', 'SCHEDULED', 'FAILED_RETRYABLE'];

/**
 * 更新任务。
 *
 * 引擎 `/update` 是「整实体覆盖 + updateById 忽略 null」语义，且未传
 * type / publishChannel / status 时会被 fillPublishParams 重置为默认值。
 * 因此这里先 GET 全量任务，合并本次修改后再整体回传，避免静默破坏 DESKTOP 等配置。
 */
export async function taskUpdate(
  taskId: string,
  opts: TaskUpdateOptions,
  global: GlobalOptions,
): Promise<void> {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`任务 ID 非法: ${taskId}`);

  if (!hasAnyOverride(opts)) {
    throw new Error(
      '没有需要更新的字段。可用: --name --type --platforms --account --channel --client --content-file --scheduled-at --max-retries --status --content-id --auto-publish / --draft',
    );
  }
  if (opts.draft && opts.autoPublish) {
    throw new Error('--draft 与 --auto-publish 不能同时使用');
  }
  if (opts.scheduledAt !== undefined && String(opts.scheduledAt).trim() === '') {
    throw new Error('不支持通过 CLI 清空定时时间；请设置新的时间，或直接取消/删除任务。');
  }

  const client = createApiClient(appName(global.app));
  const taskApi = new TaskApi(client);
  const existing = await taskApi.get(id);
  const bundle = await loadResources(client, { withClients: true });

  const existingData = parseData(existing.data);

  const type = parseType(opts.type ?? existing.type);
  const platformCodes = parsePlatformCodesInput(
    opts.platforms ?? opts.platform ?? existing.platformCodes ?? existingData.platformCodes,
  );
  if (platformCodes.length === 0) {
    throw new Error('任务没有目标平台，请使用 --platforms 指定');
  }

  const channel = parseChannel(opts.channel ?? existing.publishChannel);
  const autoPublish = opts.draft
    ? false
    : opts.autoPublish === true
      ? true
      : Boolean(existing.isAutoPublish);

  // 内容：提供新内容文件时整体替换，否则沿用现有 data
  const contentReplaced = Boolean(opts.contentFile || opts.contentJson);
  const content: TaskContent = contentReplaced
    ? loadContent({
        contentFile: opts.contentFile,
        contentJson: opts.contentJson,
        title: opts.title,
      })
    : { ...existingData };

  if (!contentReplaced && opts.title !== undefined) {
    content.title = opts.title;
  }

  let scheduledAt: string | undefined;
  if (opts.scheduledAt !== undefined) {
    scheduledAt = normalizeOnlineTime(opts.scheduledAt);
  } else if (existingData.onlineTime) {
    scheduledAt = normalizeOnlineTime(String(existingData.onlineTime));
  } else if (existing.scheduledAt) {
    scheduledAt = normalizeOnlineTime(String(existing.scheduledAt));
  }

  const data = buildTaskData({ content, platformCodes, scheduledAt, type });

  const status = resolveStatus(existing, opts, autoPublish, scheduledAt);
  if (status && !(TASK_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`非法任务状态: ${status}（可选 ${TASK_STATUSES.join(' / ')}）`);
  }

  // 平台 / 账号校验：仅在会触发/保留自动发布时要求账号存在
  const preflight = preflightTargets(bundle, platformCodes, {
    requireAccounts: autoPublish && ACTIVE_STATUSES.includes(status ?? ''),
    type,
  });
  if (ACTIVE_STATUSES.includes(status ?? '')) {
    printWarnings(preflight.warnings);
  }

  const primaryPlatform = bundle.platformByCode.get(platformCodes[0]);
  if (!primaryPlatform) {
    throw new Error(`引擎中不存在平台: ${platformCodes[0]}`);
  }

  const platformsChanged = Boolean(opts.platforms || opts.platform);
  const explicitAccount = resolveAccount(bundle, {
    account: opts.account,
    accountId: opts.accountId,
  });
  const existingPrimaryAccount =
    existing.mediaAccountId !== undefined && existing.mediaAccountId !== null
      ? bundle.accounts.find((account) => Number(account.id) === Number(existing.mediaAccountId))
      : undefined;
  const primaryAccount =
    explicitAccount ??
    (platformsChanged ? preflight.accountByPlatform.get(platformCodes[0]) : existingPrimaryAccount) ??
    preflight.accountByPlatform.get(platformCodes[0]);

  const mediaClientId = await resolveUpdateClientId(bundle, existing, channel, opts.client);

  const contentProblems = validateContentForType(data, type, {
    autoPublish: autoPublish && ACTIVE_STATUSES.includes(status ?? ''),
  });
  printWarnings(contentProblems);

  const updatePayload: Record<string, any> = {
    name: opts.name ?? existing.name,
    type,
    data: JSON.stringify(data),
    platformCodes,
    isAutoPublish: autoPublish,
    publishChannel: channel,
    status,
    mediaPlatformId: opts.platforms || opts.platform ? primaryPlatform.id : existing.mediaPlatformId,
    mediaAccountId: primaryAccount?.id ?? existing.mediaAccountId,
    mediaClientId,
    contentId: opts.contentId ?? existing.contentId,
    config: opts.config ?? existing.config,
    scheduledAt: scheduledAt ? toEngineLocalDateTime(scheduledAt) : undefined,
  };

  if (opts.maxRetries !== undefined) {
    const maxRetries = Number(opts.maxRetries);
    if (!Number.isInteger(maxRetries) || maxRetries < 0) {
      throw new Error(`--max-retries 必须是非负整数: ${opts.maxRetries}`);
    }
    updatePayload.maxRetryCount = maxRetries;
  } else if (existing.maxRetryCount !== undefined) {
    updatePayload.maxRetryCount = existing.maxRetryCount;
  }

  if (opts.scheduledAt !== undefined) {
    printWarning(
      '引擎不会更新已存在 Job 的定时时间；修改定时后旧 Job 仍会按原时间执行。' +
        '如需立即重排，请创建新任务或使用 `postbot autopublish trigger <id>`。',
    );
  }

  await taskApi.update(id, updatePayload);
  const fresh = await taskApi.get(id);

  if (global.json) {
    printJson(fresh);
    return;
  }

  printSuccess(`任务 ${id} 已更新。`);
  printTaskDetail(fresh, { platformCodes });
}

function hasAnyOverride(opts: TaskUpdateOptions): boolean {
  return (
    opts.name !== undefined ||
    opts.type !== undefined ||
    opts.status !== undefined ||
    opts.platforms !== undefined ||
    opts.platform !== undefined ||
    opts.account !== undefined ||
    opts.accountId !== undefined ||
    opts.client !== undefined ||
    opts.channel !== undefined ||
    opts.contentFile !== undefined ||
    opts.contentJson !== undefined ||
    opts.title !== undefined ||
    opts.scheduledAt !== undefined ||
    opts.maxRetries !== undefined ||
    opts.contentId !== undefined ||
    opts.config !== undefined ||
    opts.draft !== undefined ||
    opts.autoPublish !== undefined
  );
}

function parseData(raw?: string | null): TaskContent {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    throw new Error('任务 data 不是合法 JSON，无法安全更新；请使用 --content-file 覆盖内容');
  }
}

function parseType(value?: string): ContentType {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'article';
  if (!(CONTENT_TYPES as readonly string[]).includes(normalized)) {
    throw new Error(`非法内容类型: ${value}（可选 ${CONTENT_TYPES.join(' / ')}）`);
  }
  return normalized as ContentType;
}

function parseChannel(value?: string): PublishChannel {
  const channel = normalizePublishChannel(value);
  if (!channel) {
    throw new Error(`非法发布通道: ${value}（可选 CLOUD / BROWSER_EXTENSION / BROWSER_EXTENSION_EPHEMERAL / DESKTOP）`);
  }
  return channel;
}

function resolveStatus(
  existing: Task,
  opts: TaskUpdateOptions,
  autoPublish: boolean,
  scheduledAt?: string,
): string {
  if (opts.status) return opts.status.toUpperCase();
  if (!autoPublish) return 'DRAFT';

  const current = String(existing.status ?? '').toUpperCase();
  const explicitlyActivating = opts.autoPublish === true;
  if (!explicitlyActivating) return current || 'PENDING';

  return scheduledAt && isFuture(scheduledAt) ? 'SCHEDULED' : 'PENDING';
}

function isFuture(engineTime: string): boolean {
  if (/^\d+$/.test(engineTime)) return Number(engineTime) > Date.now();
  const parsed = new Date(engineTime.replace(' ', 'T'));
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now();
}

/**
 * 决定更新后的 mediaClientId。
 *
 * 引擎 `updateById` 忽略 null，无法通过 /update 清空 mediaClientId；
 * 而 endpointResolver 在 mediaClientId 非空时会按客户端类型覆盖发布通道。
 * 因此当目标通道不需要客户端却存在旧 clientId 时，直接报错要求换通道或新建任务。
 */
async function resolveUpdateClientId(
  bundle: ResourceBundle,
  existing: Task,
  channel: PublishChannel,
  explicit?: string,
): Promise<number | undefined> {
  const existingId =
    existing.mediaClientId !== undefined && existing.mediaClientId !== null
      ? Number(existing.mediaClientId)
      : undefined;
  const existingClient = existingId
    ? bundle.clients.find((item) => Number(item.id) === existingId)
    : undefined;

  const clientChannel = channel === 'DESKTOP' || channel === 'BROWSER_EXTENSION';
  if (!clientChannel) {
    if (existingId) {
      throw new Error(
        `任务已绑定客户端 #${existingId}，引擎 /update 无法清空 mediaClientId；` +
          `继续使用 ${channel} 会被客户端类型覆盖发布通道。请改为 --channel DESKTOP / BROWSER_EXTENSION，` +
          '或新建任务。',
      );
    }
    if (explicit) {
      throw new Error(`--client 仅适用于 DESKTOP / BROWSER_EXTENSION 通道，当前通道为 ${channel}`);
    }
    return undefined;
  }

  if (explicit) {
    const result = await resolveClientForChannel(bundle, { channel, explicit });
    return result.client?.id;
  }

  // 已有客户端且类型与目标通道匹配时沿用
  const existingType = String(existingClient?.type ?? '').toLowerCase();
  if (
    (channel === 'DESKTOP' && existingType === 'desktop') ||
    (channel === 'BROWSER_EXTENSION' && existingType === 'browser_extension')
  ) {
    return existingId;
  }

  if (channel === 'BROWSER_EXTENSION' && existingId) {
    throw new Error(
      `任务已绑定客户端 #${existingId}（类型 ${existingClient?.type ?? '未知'}），` +
        '无法直接切换为 BROWSER_EXTENSION；请使用 --client 指定一个 browser_extension 客户端以替换。',
    );
  }

  const result = await resolveClientForChannel(bundle, { channel });
  return result.client?.id;
}
