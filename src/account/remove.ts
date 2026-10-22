import { AccountApi } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import { confirmAction, type GlobalOptions } from '../cli.js';
import { printCancelled, printJson, printSuccess } from '../output.js';

export async function accountRemove(
  accountId: string,
  options: { force?: boolean },
  global: GlobalOptions,
): Promise<void> {
  const id = Number(accountId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`账号 ID 非法: ${accountId}`);

  const confirmed = await confirmAction(`确认删除账号 ${id}？这不会删除 SessionBot 会话。`, {
    yes: options.force || global.yes,
  });
  if (!confirmed) return printCancelled();

  const client = createApiClient(appName(global.app));
  await new AccountApi(client).remove(id);

  if (global.json) {
    printJson({ id, deleted: true });
    return;
  }
  printSuccess(`账号 ${id} 已删除。`);
}
