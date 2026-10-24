import { AccountApi } from '@gitcoffee-os/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import { confirmAction, parseIdList, type GlobalOptions } from '../cli.js';
import { printCancelled, printJson, printSuccess } from '../output.js';

export async function accountBatchRemove(
  options: { ids?: string; force?: boolean },
  global: GlobalOptions,
): Promise<void> {
  if (!options.ids) throw new Error('缺少 --ids <ids>（逗号分隔的账号 ID）');
  const ids = parseIdList(options.ids, '账号 ID');

  const confirmed = await confirmAction(`确认删除 ${ids.length} 个账号（${ids.join(', ')}）？`, {
    yes: options.force || global.yes,
  });
  if (!confirmed) return printCancelled();

  const client = createApiClient(appName(global.app));
  await new AccountApi(client).batchRemove(ids);

  if (global.json) {
    printJson({ ids, deleted: true });
    return;
  }
  printSuccess(`${ids.length} 个账号已删除。`);
}
