import { AutoPublishApi, type AutoPublishListParams } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { formatDateTime, printJson, printTable } from '../output.js';
import { normalizePlatformCode } from '../platform/registry.js';

export interface AutopublishJobsOptions {
  task?: string;
  status?: string;
  platform?: string;
  limit?: string;
}

export async function autopublishJobs(
  opts: AutopublishJobsOptions,
  global: GlobalOptions,
): Promise<void> {
  const params: AutoPublishListParams = {};
  if (opts.task !== undefined) {
    const taskId = Number(opts.task);
    if (!Number.isInteger(taskId) || taskId < 1) throw new Error(`--task 非法: ${opts.task}`);
    params.taskId = taskId;
  }
  if (opts.status) params.status = opts.status.toUpperCase();
  if (opts.limit !== undefined) {
    const limit = Number(opts.limit);
    if (!Number.isInteger(limit) || limit < 0) throw new Error('--limit 必须是非负整数');
  }

  const client = createApiClient(appName(global.app));
  let jobs = await new AutoPublishApi(client).listJobs(params);

  // 平台编号在 SDK 侧是精确匹配；这里按标准码再过滤一次，兼容字典中的历史短码。
  if (opts.platform) {
    const target = normalizePlatformCode(opts.platform);
    jobs = jobs.filter((job) => normalizePlatformCode(String(job.platformCode ?? '')) === target);
  }
  if (opts.limit !== undefined) {
    jobs = jobs.slice(0, Number(opts.limit));
  }

  if (global.json) {
    printJson(jobs);
    return;
  }

  if (jobs.length === 0) {
    console.log('暂无发布 Job。');
    return;
  }

  console.log(`\n发布 Job（${jobs.length} 条，按 ID 倒序）`);
  printTable(
    [
      { header: 'Job ID', align: 'right' },
      { header: '任务', align: 'right' },
      { header: '平台', maxWidth: 16 },
      { header: '通道', maxWidth: 26 },
      { header: '状态', maxWidth: 16 },
      { header: '重试', maxWidth: 7 },
      { header: '定时', maxWidth: 19 },
      { header: '执行', maxWidth: 19 },
      { header: '认领方', maxWidth: 18 },
    ],
    jobs.map((job) => [
      job.id,
      job.taskId,
      job.platformCode,
      job.publishChannel,
      job.status,
      `${job.retryCount ?? 0}/${job.maxRetryCount ?? '-'}`,
      formatDateTime(job.scheduledAt),
      formatDateTime(job.executedAt),
      job.claimedBy,
    ]),
  );
}
