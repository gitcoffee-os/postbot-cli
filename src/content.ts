import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import type { ContentType } from './constants.js';
import { normalizePlatformCodes } from './platform/registry.js';

export type TaskContent = Record<string, any>;

export interface ContentInputOptions {
  /** 内容 JSON 文件路径 */
  contentFile?: string;
  /** 内联 JSON（与 --content-file 二选一） */
  contentJson?: string;
  /** 已解析的内容对象（批量发布内部使用） */
  content?: TaskContent;
  /** 覆盖/补充 data.title */
  title?: string;
  /** 相对路径基准目录（批量文件所在目录） */
  baseDir?: string;
}

/** 读取并校验内容 JSON；必须是对象（数组不是合法的任务内容） */
export function loadContent(options: ContentInputOptions): TaskContent {
  let raw: unknown;

  if (options.content !== undefined) {
    raw = options.content;
  } else if (options.contentJson !== undefined) {
    raw = parseJson(options.contentJson, '--content');
  } else if (options.contentFile) {
    const path = resolveContentPath(options.contentFile, options.baseDir);
    let text: string;
    try {
      text = readFileSync(path, 'utf-8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`无法读取内容文件 ${path}: ${message}`);
    }
    raw = parseJson(text, path);
  } else {
    throw new Error('缺少内容：请使用 --content-file <path> 或 --content <json>');
  }

  if (!isPlainObject(raw)) {
    throw new Error('内容必须是 JSON 对象，例如 {"title":"标题","content":"正文"}');
  }

  const content: TaskContent = { ...raw };
  if (options.title !== undefined && options.title !== '') {
    content.title = options.title;
  }

  // data.platformCodes 兼容数组 / JSON 数组字符串；统一成数组，最终由 buildTaskData 写入
  if (content.platformCodes !== undefined) {
    if (Array.isArray(content.platformCodes)) {
      content.platformCodes = normalizePlatformCodes(content.platformCodes.map(String));
    } else if (typeof content.platformCodes === 'string') {
      try {
        const parsed = JSON.parse(content.platformCodes);
        content.platformCodes = Array.isArray(parsed)
          ? normalizePlatformCodes(parsed.map(String))
          : normalizePlatformCodes([content.platformCodes]);
      } catch {
        content.platformCodes = normalizePlatformCodes([content.platformCodes]);
      }
    }
  }

  return content;
}

function resolveContentPath(path: string, baseDir?: string): string {
  if (isAbsolute(path)) return path;
  return resolve(baseDir ?? process.cwd(), path);
}

function parseJson(text: string, source: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`内容不是合法 JSON (${source}): ${message}`);
  }
}

function isPlainObject(value: unknown): value is TaskContent {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 归一化定时发布时间为引擎可解析的格式。
 *
 * 引擎支持：
 * - `yyyy-MM-dd HH:mm:ss`
 * - `yyyy-MM-dd'T'HH:mm:ss`
 * - `yyyy-MM-dd HH:mm`
 * - `yyyy-MM-dd`
 * - 毫秒时间戳
 * - 空串 = 立即发布
 *
 * 带时区的 ISO 8601（如 `2026-08-29T12:00:00Z` / `+08:00`）会转换为本地时间
 * `yyyy-MM-dd HH:mm:ss`，避免引擎按字面量解析产生时区偏移。
 */
export function normalizeOnlineTime(input?: string | null): string {
  const text = String(input ?? '').trim();
  if (!text) return '';

  // 纯数字：13 位按毫秒；10 位按秒（常见误传，转换为毫秒）
  if (/^\d+$/.test(text)) {
    if (text.length >= 12) return text;
    if (text.length === 10) return String(Number(text) * 1000);
    throw new Error(`无法识别的时间戳: ${text}（请传 13 位毫秒时间戳或 10 位秒时间戳）`);
  }

  // 引擎原生支持的本地时间格式
  const localMatch = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::(\d{2}))?)?$/.exec(text);
  if (localMatch) {
    const date = localMatch[1];
    const time = localMatch[2];
    const seconds = localMatch[3] ?? '00';
    return time ? `${date} ${time}:${seconds}` : `${date} 00:00:00`;
  }

  // 带时区的 ISO 8601 / 其他可解析格式 → 本地时间
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `无法识别的发布时间: "${text}"。支持 "2026-08-29 12:00:00"、"2026-08-29T12:00:00"、` +
        `"2026-08-29 12:00"、"2026-08-29"、13 位毫秒时间戳或 ISO 8601（带时区）。`,
    );
  }
  return formatLocalDateTime(date);
}

/**
 * 转换为 Jackson `LocalDateTime` 可反序列化的 ISO 本地时间（`yyyy-MM-ddTHH:mm:ss`）。
 * 用于任务更新请求顶层的 `scheduledAt`；`data.onlineTime` 仍可用空格格式。
 */
export function toEngineLocalDateTime(engineTime: string): string {
  const text = normalizeOnlineTime(engineTime);
  if (!text) return '';
  if (/^\d+$/.test(text)) {
    return formatLocalDateTime(new Date(Number(text))).replace(' ', 'T');
  }
  return text.replace(' ', 'T');
}

function formatLocalDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export interface BuildTaskDataOptions {
  content: TaskContent;
  platformCodes: string[];
  /** 已归一化的发布时间；`undefined` 表示沿用 content.onlineTime */
  scheduledAt?: string;
  type?: ContentType;
}

/** 组装引擎 data 字段：平台编号、发布时间、标题覆盖 */
export function buildTaskData(options: BuildTaskDataOptions): TaskContent {
  const data: TaskContent = { ...options.content };
  data.platformCodes = normalizePlatformCodes(options.platformCodes);

  if (options.scheduledAt !== undefined) {
    data.onlineTime = normalizeOnlineTime(options.scheduledAt);
  } else if (data.onlineTime !== undefined) {
    data.onlineTime = normalizeOnlineTime(String(data.onlineTime));
  }

  return data;
}

/** 媒体引用兼容字符串 / {objectUrl} / {url} / {src} */
export function hasMediaReference(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (!isPlainObject(value)) return false;
  return ['objectUrl', 'url', 'src', 'value'].some(
    (key) => typeof value[key] === 'string' && value[key].trim().length > 0,
  );
}

/**
 * 发布前内容完整性检查：
 * - video 必须有 videoData；
 * - audio 必须有 audioData；
 * - article / moment 至少需要 title 或 content。
 * 草稿（不自动发布）只返回警告，不阻断保存。
 */
export function validateContentForType(
  data: TaskContent,
  type: ContentType,
  options: { autoPublish: boolean },
): string[] {
  const problems: string[] = [];

  if (type === 'video' && !hasMediaReference(data.videoData)) {
    problems.push('video 类型缺少 data.videoData（需包含 objectUrl 或 url）');
  }
  if (type === 'audio' && !hasMediaReference(data.audioData)) {
    problems.push('audio 类型缺少 data.audioData（需包含 objectUrl 或 url）');
  }
  if (
    (type === 'article' || type === 'moment') &&
    !String(data.title ?? '').trim() &&
    !String(data.content ?? '').trim() &&
    !hasMediaReference(data.videoData) &&
    !hasMediaReference(data.audioData)
  ) {
    problems.push(`${type} 类型至少需要 data.title 或 data.content`);
  }

  if (problems.length > 0 && options.autoPublish) {
    throw new Error(`${problems.join('；')}`);
  }
  return problems;
}

/** 判断内容是否已有定时发布时间 */
export function hasScheduledTime(content: TaskContent): boolean {
  return String(content.onlineTime ?? '').trim().length > 0;
}

/** 内容文件所在的目录（批量发布解析相对路径） */
export function contentBaseDir(file?: string): string | undefined {
  if (!file) return undefined;
  return dirname(resolve(file));
}
