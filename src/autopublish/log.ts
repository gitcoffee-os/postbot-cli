import { AutoPublishApi, type AutoPublishListParams } from '@gitcoffee-os/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { formatDateTime, printDivider, printJson, printTable } from '../output.js';
import { normalizePlatformCode } from '../platform/registry.js';

export interface AutopublishLogOptions {
  task?: string;
  status?: string;
  platform?: string;
  limit?: string;
  failed?: boolean;
  full?: boolean;
}

export async function autopublishLog(
  opts: AutopublishLogOptions,
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
  let logs = await new AutoPublishApi(client).listLogs(params);

  // 兼容平台字典中的历史短码；SDK 的平台过滤是精确匹配。
  if (opts.platform) {
    const target = normalizePlatformCode(opts.platform);
    logs = logs.filter((log) => normalizePlatformCode(String(log.platformCode ?? '')) === target);
  }
  if (opts.failed) {
    logs = logs.filter((log) => ['FAILED', 'FAILED_RETRYABLE'].includes(String(log.status).toUpperCase()));
  }
  if (opts.limit !== undefined) {
    logs = logs.slice(0, Number(opts.limit));
  }

  if (global.json) {
    printJson(logs);
    return;
  }

  if (logs.length === 0) {
    console.log('暂无执行日志。');
    return;
  }

  if (opts.task) {
    console.log(`\n任务 #${opts.task} 执行日志（${logs.length} 条）`);
    for (const log of logs) {
      printDivider(92);
      console.log(
        `  Log #${log.id} | Job #${log.jobId ?? '-'} | ${log.platformCode ?? '-'} | ${log.status}` +
          ` | 通道 ${log.publishChannel ?? '-'} | worker ${log.workerNode ?? '-'}`,
      );
      console.log(
        `  开始: ${formatDateTime(log.startedAt) ?? '-'}` +
          `${log.finishedAt ? ` → ${formatDateTime(log.finishedAt)}` : ''}` +
          ` | 重试 ${log.retryCount ?? 0}`,
      );
      if (log.errorMsg) console.log(`  错误: ${log.errorMsg}`);
      if (log.contentUrl) console.log(`  内容: ${log.contentUrl}`);
      if (log.publishedUrl) console.log(`  发布: ${log.publishedUrl}`);
      if (log.screenshotUrl) console.log(`  截图: ${log.screenshotUrl}`);
      if (opts.full && log.fullLog) {
        console.log('  完整日志:');
        for (const line of String(log.fullLog).split('\n')) {
          console.log(`    ${line}`);
        }
      }
    }
    printDivider(92);
    return;
  }

  console.log(`\n执行日志（${logs.length} 条，按 ID 倒序）`);
  printTable(
    [
      { header: '日志 ID', align: 'right' },
      { header: '任务', align: 'right' },
      { header: 'Job', align: 'right' },
      { header: '平台', maxWidth: 15 },
      { header: '状态', maxWidth: 16 },
      { header: '重试', maxWidth: 5 },
      { header: '开始', maxWidth: 19 },
      { header: '错误', maxWidth: 40 },
    ],
    logs.map((log) => [
      log.id,
      log.taskId,
      log.jobId,
      log.platformCode,
      log.status,
      log.retryCount,
      formatDateTime(log.startedAt),
      log.errorMsg,
    ]),
  );
  console.log('\n使用 --task <id> 查看单任务明细，--full 输出完整日志。');
}
