import ora from 'ora';
import { WorkflowApi } from '@gitcoffee-os/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { TERMINAL_TASK_STATUSES } from '../constants.js';
import { printJson, printKeyValues, printSuccess, printWarning } from '../output.js';
import { prepareTask, createTask, type TaskBuildSpec } from '../task/build.js';
import { printTaskDetail, printWarnings } from '../task/format.js';

export interface PublishOptions extends TaskBuildSpec {
  /** 保存后等待发布结束 */
  wait?: boolean;
  /** 等待超时秒数，默认 600 */
  timeout?: string;
  /** 轮询间隔秒数，默认 3 */
  interval?: string;
}

/**
 * 快捷发布：直接调用 `/postbot/media/task/save`（isAutoPublish=true）。
 *
 * 所有平台走同一条路径，不再区分单平台 QUICK_PUBLISH 工作流：
 * 引擎任务保存本身即支持多平台、定时、草稿、客户端绑定与重试。
 */
export async function quickPublish(opts: PublishOptions, global: GlobalOptions): Promise<void> {
  const client = createApiClient(appName(global.app));

  if (opts.platform && !opts.platforms) {
    printWarning('--platform 已废弃，请改用 --platforms（支持逗号分隔多平台）。');
  }
  if (opts.wait && opts.draft) {
    throw new Error('--draft 仅保存草稿，不能与 --wait 同时使用');
  }

  const timeoutSeconds = Number(opts.timeout ?? 600);
  const intervalSeconds = Number(opts.interval ?? 3);
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    throw new Error(`--timeout 必须是正数秒: ${opts.timeout}`);
  }
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    throw new Error(`--interval 必须是正数秒: ${opts.interval}`);
  }

  const prepared = await prepareTask(client, opts);
  printWarnings(prepared.warnings);

  const spinner = global.json ? null : ora('正在创建发布任务...').start();
  let task;
  try {
    task = await createTask(client, prepared);
    spinner?.succeed(`任务已创建（ID ${task.id}）`);
  } catch (error) {
    spinner?.fail('创建发布任务失败');
    throw error;
  }

  if (!global.json) {
    printTaskDetail(task, {
      platformCodes: prepared.platformCodes,
      clientId: prepared.client?.id,
    });
    printSuccess(
      prepared.autoPublish
        ? `已编排 ${prepared.platformCodes.length} 个平台的发布 Job。`
        : '已保存为草稿。',
    );
  }

  if (!opts.wait) {
    if (global.json) {
      printJson(task);
    } else if (prepared.autoPublish) {
      console.log(`查看状态: postbot status ${task.id}`);
      console.log(`等待完成: postbot publish --wait  （或 postbot status ${task.id}）`);
    }
    return;
  }

  const timeoutMs = timeoutSeconds * 1000;
  const intervalMs = intervalSeconds * 1000;
  const statusResult = await waitForCompletion(client, task.id, {
    timeoutMs,
    intervalMs,
    silent: Boolean(global.json),
  });

  if (global.json) {
    printJson({ task, status: statusResult });
    return;
  }

  const taskInfo = (statusResult.task ?? {}) as Record<string, any>;
  const job = (statusResult.latestJob ?? {}) as Record<string, any>;
  printKeyValues([
    ['最终状态', taskInfo.status ?? task.status],
    ['最新 Job', job.id ? `#${job.id} ${job.status}` : '（无 Job）'],
    ['发布链接', taskInfo.publishedUrl],
    ['内容链接', taskInfo.contentUrl],
    ['执行结果', taskInfo.executionResult],
  ]);

  if (String(taskInfo.status ?? '') !== 'SUCCESS') {
    throw new Error(`任务未成功完成，最终状态: ${taskInfo.status ?? 'UNKNOWN'}`);
  }
  printSuccess('发布成功。');
}

interface WaitResult {
  task?: Record<string, any>;
  latestJob?: Record<string, any>;
  recentLogs?: Array<Record<string, any>>;
}

async function waitForCompletion(
  client: ReturnType<typeof createApiClient>,
  taskId: number,
  options: { timeoutMs: number; intervalMs: number; silent: boolean },
): Promise<WaitResult> {
  const workflowApi = new WorkflowApi(client);
  const deadline = Date.now() + options.timeoutMs;
  let last: WaitResult = {};
  let warnedNoJob = false;

  const spinner = options.silent ? null : ora(`等待任务 ${taskId} 完成...`).start();

  try {
    for (;;) {
      const result = await workflowApi.executeWorkflow('STATUS_QUERY', { taskId });
      last = (result.result ?? {}) as WaitResult;
      const status = String(last.task?.status ?? '');
      const jobStatus = String(last.latestJob?.status ?? '');

      if (spinner) {
        spinner.text = `等待任务 ${taskId} 完成... 任务 ${status || '?'}${jobStatus ? ` / Job ${jobStatus}` : ''}`;
      }

      if (!warnedNoJob && !last.latestJob?.id && status === 'PENDING' && Date.now() > deadline - options.timeoutMs + 15_000) {
        warnedNoJob = true;
        printWarning(
          '任务仍为 PENDING 且没有 Job。请检查平台字典 code 是否与引擎标准化后的编号一致（postbot platform list）。',
        );
      }

      if (TERMINAL_TASK_STATUSES.includes(status)) {
        spinner?.succeed(`任务 ${taskId} 已结束: ${status}`);
        return last;
      }

      if (Date.now() + options.intervalMs > deadline) {
        spinner?.fail(`等待超时（${Math.round(options.timeoutMs / 1000)}s）`);
        throw new Error(`等待任务 ${taskId} 超时，最后状态: ${status || 'UNKNOWN'}`);
      }

      await sleep(options.intervalMs);
    }
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
