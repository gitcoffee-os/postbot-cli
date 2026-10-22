import { AccountApi, SessionApi } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { loadResources, resolvePlatformRef } from '../resources.js';
import { printJson, printSuccess, printWarning } from '../output.js';

export interface AccountSaveOptions {
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
 * 创建媒体账号。
 *
 * 引擎 /save 无返回体，且 `bindSessionbotSession` 在保存前调用；保存后通过
 * `/listing` 反查最新记录以返回账号 ID（尽力而为）。
 */
export async function accountSave(opts: AccountSaveOptions, global: GlobalOptions): Promise<void> {
  if (!opts.username) throw new Error('缺少 --username（平台账号用户名）');
  if (!opts.platform) throw new Error('缺少 --platform（平台 code 或 ID）');

  const client = createApiClient(appName(global.app));
  const bundle = await loadResources(client, { withAccounts: false, withClients: false });
  const platform = resolvePlatformRef(bundle, opts.platform);

  let sessionbotSessionId: number | undefined;
  if (opts.session) {
    const session = await new SessionApi(client).get(opts.session);
    if (session.id === undefined) {
      throw new Error(`会话 ${opts.session} 没有数据库 ID，无法绑定`);
    }
    sessionbotSessionId = Number(session.id);
  }

  const accountApi = new AccountApi(client);
  await accountApi.save({
    username: opts.username,
    name: opts.name ?? opts.username,
    mediaPlatformId: Number(platform.id),
    accountId: opts.accountId,
    profile: opts.profile,
    avatar: opts.avatar,
    homepage: opts.homepage,
    url: opts.url,
    sessionbotSessionId,
  });

  const accounts = await accountApi.list({ mediaPlatformId: Number(platform.id) });
  const created = accounts
    .filter((account) => account.username === opts.username)
    .sort((a, b) => Number(b.id) - Number(a.id))[0];

  if (global.json) {
    printJson({ saved: true, id: created?.id, platformCode: platform.code, username: opts.username });
    return;
  }

  printSuccess(
    created
      ? `账号已保存: #${created.id} ${opts.username} (${platform.code})`
      : `账号已保存: ${opts.username} (${platform.code})`,
  );
  if (!created) {
    printWarning('引擎 /save 不返回账号 ID，且未能反查到新记录，请用 `postbot account list` 确认。');
  }
}
