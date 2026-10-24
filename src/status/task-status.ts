import { AutoPublishApi, WorkflowApi, type AutoPublishJob, type AutoPublishLog } from '@gitcoffee-os/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { formatDateTime, printHeading, printJson, printKeyValues, printTable, printWarning } from '../output.js';

export interface TaskStatusOptions {
  logs?: boolean;
  logLimit?: string;
}

interface StatusTaskInfo extends Record<string, any> {
  id?: number;
  name?: string;
  type?: string;
  status?: string;
  publishChannel?: string;
  scheduledAt?: string;
  publishedUrl?: string;
  contentUrl?: string;
  executionResult?: string;
  CreateTime?: string;
  UpdateTime?: string;
}

interface StatusResult {
  task?: StatusTaskInfo;
  latestJob?: AutoPublishJob | Record<string, any>;
  recentLogs?: Array<AutoPublishLog | Record<string, any>>;
}

/**
 * 任务发布状态：以工作流 STATUS_QUERY 的聚合结果为主，
 * 并用 `/autopublish/task/{id}/status` 补全最新 Job 的平台、租约等字段
 * （工作流只返回 id/status/时间等精简字段）。
 */
export async function taskStatus(
  taskId: string,
  options: TaskStatusOptions,
  global: GlobalOptions,
): Promise<void> {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`任务 ID 非法: ${taskId}`);

  const logLimit = Number(options.logLimit ?? 5);
  if (!Number.isInteger(logLimit) || logLimit < 1) {
    throw new Error(`--log-limit 必须是 >= 1 的整数: ${options.logLimit}`);
  }

  const client = createApiClient(appName(global.app));
  const workflowApi = new WorkflowApi(client);
  const autoPublishApi = new AutoPublishApi(client);

  const [workflow, latestJob] = await Promise.all([
    workflowApi.executeWorkflow('STATUS_QUERY', { taskId: id }),
    autoPublishApi.getStatus(id),
  ]);

  const result = (workflow.result ?? {}) as StatusResult;
  const job = latestJob ?? (result.latestJob && (result.latestJob as any).id ? result.latestJob : null);

  const payload = {
    ...result,
    latestJob: job,
  };

  if (global.json) {
    printJson(payload);
    return;
  }

  printHeading(`任务状态 #${id}`);
  printKeyValues([
    ['名称', result.task?.name],
    ['类型', result.task?.type],
    ['状态', result.task?.status],
    ['发布通道', result.task?.publishChannel],
    ['定时时间', formatDateTime(result.task?.scheduledAt)],
    ['发布时间', formatDateTime((result.task as any)?.lastExecutedAt)],
    ['发布链接', result.task?.publishedUrl],
    ['内容链接', result.task?.contentUrl],
    ['执行结果', result.task?.executionResult],
    ['创建时间', formatDateTime(result.task?.CreateTime ?? (result.task as any)?.createdAt)],
    ['更新时间', formatDateTime(result.task?.UpdateTime ?? (result.task as any)?.updatedAt)],
  ]);

  printHeading('最新发布 Job');
  if (!job) {
    console.log('  暂无 Job（任务可能为草稿，或平台未匹配导致 Job 未创建）。');
  } else {
    printKeyValues([
      ['Job ID', (job as AutoPublishJob).id],
      ['平台', (job as AutoPublishJob).platformCode],
      ['状态', (job as AutoPublishJob).status],
      ['发布通道', (job as AutoPublishJob).publishChannel],
      ['定时时间', formatDateTime((job as AutoPublishJob).scheduledAt)],
      ['执行时间', formatDateTime((job as AutoPublishJob).executedAt)],
      ['重试', formatRetry(job as AutoPublishJob)],
      ['认领方', (job as AutoPublishJob).claimedBy],
      ['租约到期', formatDateTime((job as AutoPublishJob).leaseExpiresAt)],
      ['Worker', (job as AutoPublishJob).workerNode],
    ]);
  }

  const recentLogs = (result.recentLogs ?? []) as Array<Record<string, any>>;
  if (options.logs === false) return;

  printHeading(`最近执行日志（${recentLogs.length}）`);
  if (recentLogs.length === 0) {
    console.log('  暂无执行日志。');
    return;
  }

  const limit = logLimit;
  const visible = recentLogs.slice(0, limit);

  printTable(
    [
      { header: '日志 ID', align: 'right' },
      { header: '平台', maxWidth: 14 },
      { header: '状态', maxWidth: 16 },
      { header: '开始', maxWidth: 19 },
      { header: '结束', maxWidth: 19 },
      { header: '错误', maxWidth: 36 },
    ],
    visible.map((log) => [
      log.id,
      log.platformCode,
      log.status,
      formatDateTime(log.startedAt),
      formatDateTime(log.finishedAt),
      log.errorMsg || log.failureReason,
    ]),
  );

  const latestLog = visible[0];
  if (latestLog?.contentUrl || latestLog?.publishedUrl) {
    printKeyValues([
      ['内容链接', latestLog.contentUrl],
      ['发布链接', latestLog.publishedUrl],
    ]);
  }
  if (latestLog?.fullLog) {
    printHeading('最新日志片段');
    const preview = String(latestLog.fullLog).slice(-1500).trim();
    for (const line of preview.split('\n').slice(-30)) {
      console.log(`  ${line.slice(-160)}`);
    }
  }
  if (latestLog?.screenshotUrl) {
    printWarning(`截图: ${latestLog.screenshotUrl}`);
  }
}

function formatRetry(job: AutoPublishJob): string | undefined {
  if (job.retryCount === undefined && job.maxRetryCount === undefined) return undefined;
  return `${job.retryCount ?? 0} / ${job.maxRetryCount ?? '-'}`;
}
