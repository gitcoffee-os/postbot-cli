/** 应用模式 */
export type AppName = 'postbot' | 'postar';

export const APP_NAMES: AppName[] = ['postbot', 'postar'];

export function isAppName(value: unknown): value is AppName {
  return value === 'postbot' || value === 'postar';
}

/** 内容类型（与引擎 ExmayPostbotMediaTask.type 一致） */
export const CONTENT_TYPES = ['article', 'moment', 'video', 'audio'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export function normalizeContentType(value: string | undefined | null): ContentType {
  const normalized = String(value ?? '').trim().toLowerCase();
  return (CONTENT_TYPES as readonly string[]).includes(normalized)
    ? (normalized as ContentType)
    : 'article';
}

/** 发布通道（与引擎 ExmayAutoPublishChannel 一致） */
export const PUBLISH_CHANNELS = [
  'CLOUD',
  'BROWSER_EXTENSION',
  'BROWSER_EXTENSION_EPHEMERAL',
  'DESKTOP',
] as const;
export type PublishChannel = (typeof PUBLISH_CHANNELS)[number];

export const DEFAULT_PUBLISH_CHANNEL: PublishChannel = 'CLOUD';

/** 归一化发布通道；非法值是 undefined（由调用方报错），空值回落 CLOUD */
export function normalizePublishChannel(value?: string | null): PublishChannel | undefined {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized) return DEFAULT_PUBLISH_CHANNEL;
  return (PUBLISH_CHANNELS as readonly string[]).includes(normalized)
    ? (normalized as PublishChannel)
    : undefined;
}

/** 任务状态（引擎任务 status 聚合值） */
export const TASK_STATUSES = [
  'DRAFT',
  'PENDING',
  'SCHEDULED',
  'RUNNING',
  'SUCCESS',
  'FAILED_RETRYABLE',
  'FAILED',
  'CANCELLED',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** 任务终态（等待发布结束时可停止轮询） */
export const TERMINAL_TASK_STATUSES: string[] = ['DRAFT', 'SUCCESS', 'FAILED', 'CANCELLED'];

/** Job 状态 */
export const JOB_STATUSES = [
  'PENDING',
  'SCHEDULED',
  'RUNNING',
  'SUCCESS',
  'FAILED_RETRYABLE',
  'FAILED',
  'CANCELLED',
] as const;

/** Job 终态 */
export const TERMINAL_JOB_STATUSES: string[] = ['SUCCESS', 'FAILED', 'CANCELLED'];

/** 媒体客户端类型 */
export const MEDIA_CLIENT_TYPES = [
  'browser_extension',
  'browser_extension_ephemeral',
  'desktop',
  'cloud',
] as const;
export type MediaClientType = (typeof MEDIA_CLIENT_TYPES)[number];

export function normalizeClientType(value?: string | null): MediaClientType | undefined {
  const normalized = String(value ?? '').trim().toLowerCase();
  return (MEDIA_CLIENT_TYPES as readonly string[]).includes(normalized)
    ? (normalized as MediaClientType)
    : undefined;
}

/** 账号状态（引擎按会话 Cookie 有效期计算） */
export const ACCOUNT_STATUSES = ['ok', 'renew', 'expired', 'unbound'] as const;

/** 客户端"在线"判定窗口：引擎心跳超时 90s，加一个心跳间隔余量取 120s */
export const CLIENT_ONLINE_WINDOW_MS = 120_000;
