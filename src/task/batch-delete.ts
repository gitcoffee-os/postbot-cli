import { appName, createApiClient } from '../config.js';
import { confirmAction, parseIdList, type GlobalOptions } from '../cli.js';
import { TaskApi } from '@gitcoffee/postbot-sdk';
import { printCancelled, printJson, printSuccess } from '../output.js';

export async function taskBatchDelete(
  options: { ids?: string; force?: boolean },
  global: GlobalOptions,
): Promise<void> {
  if (!options.ids) throw new Error('缺少 --ids <ids>（逗号分隔的任务 ID）');
  const ids = parseIdList(options.ids, '任务 ID');

  const confirmed = await confirmAction(`确认删除 ${ids.length} 个任务（${ids.join(', ')}）？`, {
    yes: options.force || global.yes,
  });
  if (!confirmed) {
    printCancelled();
    return;
  }

  const client = createApiClient(appName(global.app));
  await new TaskApi(client).batchDelete(ids);

  if (global.json) {
    printJson({ ids, deleted: true });
    return;
  }
  printSuccess(`${ids.length} 个任务已删除。`);
}
