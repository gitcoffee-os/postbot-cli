import { ClientApi } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { loadResources, resolvePlatformRef } from '../resources.js';
import { normalizeClientType } from '../constants.js';
import { printJson, printSuccess } from '../output.js';

export interface ClientSaveOptions {
  name?: string;
  type?: string;
  clientKey?: string;
  platform?: string;
  accountId?: string;
  session?: string;
}

/**
 * 注册客户端。通常由扩展/桌面端自动上报；CLI 主要用于调试与运维。
 * 引擎 /save 无返回体。
 */
export async function clientSave(opts: ClientSaveOptions, global: GlobalOptions): Promise<void> {
  if (!opts.name) throw new Error('缺少 --name');
  if (!opts.type) throw new Error('缺少 --type（browser_extension|browser_extension_ephemeral|desktop|cloud）');
  if (!opts.clientKey) throw new Error('缺少 --client-key（客户端唯一标识）');

  const type = normalizeClientType(opts.type);
  if (!type) {
    throw new Error(`非法客户端类型: ${opts.type}（可选 browser_extension / browser_extension_ephemeral / desktop / cloud）`);
  }

  const client = createApiClient(appName(global.app));
  const payload: Record<string, any> = {
    name: opts.name,
    type,
    clientKey: opts.clientKey,
  };

  if (opts.platform) {
    const bundle = await loadResources(client, { withAccounts: false, withClients: false });
    const platform = resolvePlatformRef(bundle, opts.platform);
    payload.mediaPlatformId = Number(platform.id);
  }
  if (opts.accountId) {
    const accountId = Number(opts.accountId);
    if (!Number.isInteger(accountId) || accountId < 1) throw new Error('--account-id 必须是正整数');
    payload.mediaAccountId = accountId;
  }
  if (opts.session) {
    const sessionId = Number(opts.session);
    if (!Number.isInteger(sessionId) || sessionId < 1) throw new Error('--session 需要 SessionBot 会话的数据库 ID（数字）');
    payload.sessionbotSessionId = sessionId;
  }

  await new ClientApi(client).register(payload);

  if (global.json) {
    printJson({ saved: true, ...payload });
    return;
  }
  printSuccess(`客户端已保存: ${opts.name} (${type})`);
}
