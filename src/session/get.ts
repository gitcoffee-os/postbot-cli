import { SessionApi } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { formatDateTime, printHeading, printJson, printKeyValues, printTable } from '../output.js';

export interface SessionGetOptions {
  cookies?: boolean;
}

/** 按 SessionBot 业务 ID（bizId）加载会话。 */
export async function sessionGet(
  bizId: string,
  opts: SessionGetOptions,
  global: GlobalOptions,
): Promise<void> {
  if (!bizId.trim()) throw new Error('bizId 不能为空');

  const client = createApiClient(appName(global.app));
  const session = await new SessionApi(client).get(bizId.trim());

  if (global.json) {
    printJson(session);
    return;
  }

  printHeading(`会话 ${session.bizId}`);
  printKeyValues([
    ['数据库 ID', session.id],
    ['别名', session.alias],
    ['域名', session.domain],
    ['域名匹配', session.domainPattern],
    ['分组', session.groupId],
    ['标签', Array.isArray(session.tags) ? session.tags.join(', ') : undefined],
    ['Cookie 数', Array.isArray(session.cookies) ? session.cookies.length : 0],
    ['Storage 数', Array.isArray(session.storages) ? session.storages.length : 0],
    ['创建时间', formatDateTime(session.createTime)],
  ]);

  if (opts.cookies && Array.isArray(session.cookies) && session.cookies.length > 0) {
    printHeading('Cookies（仅名称/域名，值请用 --json）');
    printTable(
      [
        { header: '名称', maxWidth: 28 },
        { header: '域名', maxWidth: 32 },
        { header: 'Path', maxWidth: 12 },
        { header: 'HttpOnly', maxWidth: 8 },
        { header: 'Secure', maxWidth: 6 },
      ],
      session.cookies.map((cookie) => [
        cookie.name,
        cookie.domain,
        cookie.path,
        cookie.httpOnly ? '是' : '否',
        cookie.secure ? '是' : '否',
      ]),
    );
  }

  if (Array.isArray(session.storages) && session.storages.length > 0) {
    printHeading('Storage');
    printTable(
      [{ header: 'Key', maxWidth: 60 }],
      session.storages.map((storage) => [storage.name ?? storage.key ?? JSON.stringify(storage).slice(0, 60)]),
    );
  }
}
