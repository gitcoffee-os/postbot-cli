import { AccountApi, SessionApi } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { loadResources, resolvePlatformRef } from '../resources.js';
import { printJson, printSuccess, printWarning } from '../output.js';

export interface AccountUpdateOptions {
  username?: string;
  name?: string;
  platform?: string;
  accountId?: string;
  profile?: string;
  avatar?: string;
  homepage?: string;
  url?: string;
  session?: string;
}

/**
 * 更新媒体账号。引擎 /update 为 updateById 语义（忽略 null），
 * 因此只提交本次修改的字段，避免覆盖未提供的列。
 */
export async function accountUpdate(
  accountId: string,
  opts: AccountUpdateOptions,
  global: GlobalOptions,
): Promise<void> {
  const id = Number(accountId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`账号 ID 非法: ${accountId}`);

  const hasOverride = Object.values(opts).some((value) => value !== undefined);
  if (!hasOverride) {
    throw new Error('没有需要更新的字段。可用: --username --name --platform --account-id --profile --avatar --homepage --url --session');
  }

  const client = createApiClient(appName(global.app));
  const accountApi = new AccountApi(client);
  const existing = await accountApi.get(id);

  const payload: Record<string, any> = { id };
  if (opts.username !== undefined) payload.username = opts.username;
  if (opts.name !== undefined) payload.name = opts.name;
  if (opts.accountId !== undefined) payload.accountId = opts.accountId;
  if (opts.profile !== undefined) payload.profile = opts.profile;
  if (opts.avatar !== undefined) payload.avatar = opts.avatar;
  if (opts.homepage !== undefined) payload.homepage = opts.homepage;
  if (opts.url !== undefined) payload.url = opts.url;

  if (opts.platform !== undefined) {
    const bundle = await loadResources(client, { withAccounts: false, withClients: false });
    const platform = resolvePlatformRef(bundle, opts.platform);
    payload.mediaPlatformId = Number(platform.id);
  }

  if (opts.session !== undefined) {
    if (opts.session === '' || opts.session === 'none') {
      throw new Error('引擎 /update 无法清空 sessionbotSessionId（updateById 忽略 null）；请绑定另一个会话。');
    }
    const session = await new SessionApi(client).get(opts.session);
    if (session.id === undefined) throw new Error(`会话 ${opts.session} 没有数据库 ID，无法绑定`);
    payload.sessionbotSessionId = Number(session.id);
  }

  // 保留既有非空字段，避免引擎的整实体校验/展示缺字段
  for (const key of ['username', 'name', 'accountId', 'profile', 'avatar', 'homepage', 'url', 'mediaPlatformId', 'sessionbotSessionId'] as const) {
    if (payload[key] === undefined && (existing as any)[key] !== undefined) {
      payload[key] = (existing as any)[key];
    }
  }

  if (payload.sessionbotSessionId && payload.sessionbotSessionId !== existing.sessionbotSessionId) {
    printWarning('会话绑定具有独占性；引擎会自动解绑占用该会话的其他账号。');
  }

  await accountApi.update(id, payload);
  const fresh = await accountApi.get(id);

  if (global.json) {
    printJson(fresh);
    return;
  }
  printSuccess(`账号 ${id} 已更新。`);
}
