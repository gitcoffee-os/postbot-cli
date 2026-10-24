import type { Task } from '@gitcoffee-os/postbot-sdk';
import {
  formatDateTime,
  formatPlatformCodes,
  parseJsonArray,
  printDivider,
  printHeading,
  printKeyValues,
  printWarning,
} from '../output.js';

export function printWarnings(warnings: string[]): void {
  for (const warning of warnings) {
    printWarning(`! ${warning}`);
  }
}

/** 任务详情（save / get / update 共用） */
export function printTaskDetail(task: Task, extra: { clientId?: number; platformCodes?: string[] } = {}): void {
  printHeading('任务详情');
  printDivider(64);

  const codes = extra.platformCodes ?? parseJsonArray(task.platformCodes);
  printKeyValues([
    ['ID', task.id],
    ['名称', task.name],
    ['类型', task.type],
    ['平台', codes.length ? codes.join(', ') : formatPlatformCodes(task.platformCodes)],
    ['主平台 ID', task.mediaPlatformId],
    ['主账号 ID', task.mediaAccountId],
    ['发布通道', task.publishChannel],
    ['客户端 ID', extra.clientId ?? task.mediaClientId],
    ['状态', task.status],
    ['自动发布', task.isAutoPublish ? '是' : '否（草稿）'],
    ['定时时间', formatDateTime(task.scheduledAt)],
    ['重试次数', typeof task.retryCount === 'number' ? `${task.retryCount} / ${task.maxRetryCount ?? '-'}` : undefined],
    ['内容 ID', task.contentId],
    ['发布时间', formatDateTime(task.lastExecutedAt)],
    ['发布链接', task.publishedUrl],
    ['内容链接', task.contentUrl],
    ['执行结果', task.executionResult],
    ['创建时间', formatDateTime(task.createdAt)],
    ['更新时间', formatDateTime(task.updatedAt)],
  ]);

  printDivider(64);
}
