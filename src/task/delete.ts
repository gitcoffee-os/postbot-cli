import { appName, createApiClient } from '../config.js';
import { confirmAction, type GlobalOptions } from '../cli.js';
import { TaskApi } from '@gitcoffee/postbot-sdk';
import { printCancelled, printJson, printSuccess } from '../output.js';

export async function taskDelete(
  taskId: string,
  options: { force?: boolean },
  global: GlobalOptions,
): Promise<void> {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`任务 ID 非法: ${taskId}`);

  const confirmed = await confirmAction(`确认删除任务 ${id}？`, {
    yes: options.force || global.yes,
  });
  if (!confirmed) {
    printCancelled();
    return;
  }

  const client = createApiClient(appName(global.app));
  await new TaskApi(client).delete(id);

  if (global.json) {
    printJson({ id, deleted: true });
    return;
  }
  printSuccess(`任务 ${id} 已删除。`);
}
