import { AutoPublishApi } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { formatDateTime, printHeading, printJson, printKeyValues } from '../output.js';

export async function autopublishStatus(taskId: string, global: GlobalOptions): Promise<void> {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`任务 ID 非法: ${taskId}`);

  const client = createApiClient(appName(global.app));
  const job = await new AutoPublishApi(client).getStatus(id);

  if (global.json) {
    printJson(job);
    return;
  }

  if (!job) {
    console.log(`任务 ${id} 暂无发布 Job（草稿、未自动发布，或平台未匹配导致未创建）。`);
    return;
  }

  printHeading(`任务 #${id} 最新发布 Job`);
  printKeyValues([
    ['Job ID', job.id],
    ['平台', job.platformCode],
    ['平台 ID', job.mediaPlatformId],
    ['账号 ID', job.mediaAccountId],
    ['客户端 ID', job.mediaClientId],
    ['发布通道', job.publishChannel],
    ['状态', job.status],
    ['优先级', job.priority],
    ['定时时间', formatDateTime(job.scheduledAt)],
    ['执行时间', formatDateTime(job.executedAt)],
    ['重试', `${job.retryCount ?? 0} / ${job.maxRetryCount ?? '-'}`],
    ['认领方', job.claimedBy],
    ['租约到期', formatDateTime(job.leaseExpiresAt)],
    ['Worker', job.workerNode],
    ['创建时间', formatDateTime(job.createdAt)],
  ]);
}
