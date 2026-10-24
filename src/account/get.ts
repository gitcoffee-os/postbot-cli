import { AccountApi, PlatformApi } from '@gitcoffee-os/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { formatDateTime, printHeading, printJson, printKeyValues } from '../output.js';
import { normalizePlatformCode } from '../platform/registry.js';

export async function accountGet(accountId: string, global: GlobalOptions): Promise<void> {
  const id = Number(accountId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`账号 ID 非法: ${accountId}`);

  const client = createApiClient(appName(global.app));
  const [account, platforms] = await Promise.all([
    new AccountApi(client).get(id),
    new PlatformApi(client).list(),
  ]);

  const platform = platforms.find((item) => Number(item.id) === Number(account.mediaPlatformId));

  if (global.json) {
    printJson({ ...account, platformCode: platform ? normalizePlatformCode(platform.code) : undefined });
    return;
  }

  printHeading(`账号 #${account.id}`);
  printKeyValues([
    ['平台', platform ? `${platform.name} (${normalizePlatformCode(platform.code)})` : `#${account.mediaPlatformId}`],
    ['用户名', account.username],
    ['平台账号 ID', account.accountId],
    ['名称', account.name],
    ['状态', account.status],
    ['主页', account.homepage],
    ['URL', account.url],
    ['头像', account.avatar],
    ['简介', account.profile],
    ['SessionBot 会话 ID', account.sessionbotSessionId],
    ['会话域名', account.session?.domain],
    ['Cookie 数', Array.isArray(account.session?.cookies) ? account.session.cookies.length : undefined],
    ['创建时间', formatDateTime(account.createTime)],
  ]);
}
