import { ClientApi } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import { confirmAction, type GlobalOptions } from '../cli.js';
import { printCancelled, printJson, printSuccess } from '../output.js';

export async function clientRemove(
  clientId: string,
  options: { force?: boolean },
  global: GlobalOptions,
): Promise<void> {
  const id = Number(clientId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`客户端 ID 非法: ${clientId}`);

  const confirmed = await confirmAction(`确认删除客户端 ${id}？`, {
    yes: options.force || global.yes,
  });
  if (!confirmed) return printCancelled();

  const client = createApiClient(appName(global.app));
  await new ClientApi(client).remove(id);

  if (global.json) {
    printJson({ id, deleted: true });
    return;
  }
  printSuccess(`客户端 ${id} 已删除。`);
}
