import { ClientApi } from '@gitcoffee-os/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { loadResources, resolvePlatformRef } from '../resources.js';
import { normalizeClientType } from '../constants.js';
import { printJson, printSuccess } from '../output.js';

export interface ClientUpdateOptions {
  name?: string;
  type?: string;
  clientKey?: string;
  platform?: string;
  accountId?: string;
  session?: string;
  online?: boolean;
}

export async function clientUpdate(
  clientId: string,
  opts: ClientUpdateOptions,
  global: GlobalOptions,
): Promise<void> {
  const id = Number(clientId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`客户端 ID 非法: ${clientId}`);
  if (!Object.values(opts).some((value) => value !== undefined)) {
    throw new Error('没有需要更新的字段。可用: --name --type --client-key --platform --account-id --session --online');
  }

  const client = createApiClient(appName(global.app));
  const payload: Record<string, any> = { id };

  if (opts.name !== undefined) payload.name = opts.name;
  if (opts.clientKey !== undefined) payload.clientKey = opts.clientKey;
  if (opts.type !== undefined) {
    const type = normalizeClientType(opts.type);
    if (!type) throw new Error(`非法客户端类型: ${opts.type}`);
    payload.type = type;
  }
  if (opts.online) {
    payload.lastOnlineAt = new Date().toISOString().replace('Z', '');
  }
  if (opts.platform !== undefined) {
    const bundle = await loadResources(client, { withAccounts: false, withClients: false });
    const platform = resolvePlatformRef(bundle, opts.platform);
    payload.mediaPlatformId = Number(platform.id);
  }
  if (opts.accountId !== undefined) {
    const accountId = Number(opts.accountId);
    if (!Number.isInteger(accountId) || accountId < 1) throw new Error('--account-id 必须是正整数');
    payload.mediaAccountId = accountId;
  }
  if (opts.session !== undefined) {
    if (opts.session === '' || opts.session === 'none') {
      throw new Error('引擎 /update 无法清空 sessionbotSessionId（updateById 忽略 null）。');
    }
    const sessionId = Number(opts.session);
    if (!Number.isInteger(sessionId) || sessionId < 1) throw new Error('--session 需要数字会话 ID');
    payload.sessionbotSessionId = sessionId;
  }

  await new ClientApi(client).update(id, payload);
  const fresh = await new ClientApi(client).get(id);

  if (global.json) {
    printJson(fresh);
    return;
  }
  printSuccess(`客户端 ${id} 已更新。`);
}
