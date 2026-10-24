import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { TaskApi } from '@gitcoffee-os/postbot-sdk';
import { printJson } from '../output.js';
import { printTaskDetail } from './format.js';

export async function taskGet(taskId: string, global: GlobalOptions): Promise<void> {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`任务 ID 非法: ${taskId}`);

  const client = createApiClient(appName(global.app));
  const task = await new TaskApi(client).get(id);

  if (global.json) {
    printJson(task);
    return;
  }
  printTaskDetail(task);
}
