import ora from 'ora';
import { AutoPublishApi, TaskApi } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { printJson, printSuccess } from '../output.js';

/**
 * 手动触发：引擎忽略既定定时时间，立即为任务编排 Job。
 * 已存在 PENDING/RUNNING/FAILED_RETRYABLE Job 的平台不会重复创建。
 */
export async function autopublishTrigger(taskId: string, global: GlobalOptions): Promise<void> {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`任务 ID 非法: ${taskId}`);

  const client = createApiClient(appName(global.app));
  const task = await new TaskApi(client).get(id);

  const spinner = global.json ? null : ora(`触发任务 ${id} 自动发布...`).start();
  try {
    await new AutoPublishApi(client).trigger(id);
    spinner?.succeed(`任务 ${id} 已触发自动发布。`);
  } catch (error) {
    spinner?.fail('触发失败');
    throw error;
  }

  if (global.json) {
    printJson({ taskId: id, triggered: true, status: task.status, platformCodes: task.platformCodes });
    return;
  }
  printSuccess('引擎会尽快调度；若任务已有待执行 Job，对应平台不会重复创建。');
  console.log(`查看状态: postbot status ${id}`);
}
