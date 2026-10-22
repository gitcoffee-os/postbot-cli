import { SessionApi } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { formatDateTime, printJson, printTable } from '../output.js';

export interface SessionListOptions {
  search?: string;
  domain?: string;
}

/** SessionBot 会话（用户端只读）。 */
export async function sessionList(opts: SessionListOptions, global: GlobalOptions): Promise<void> {
  const client = createApiClient(appName(global.app));
  let sessions = await new SessionApi(client).list();

  if (opts.domain) {
    const domain = opts.domain.toLowerCase();
    sessions = sessions.filter((session) => String(session.domain ?? '').toLowerCase().includes(domain));
  }
  if (opts.search) {
    const keyword = opts.search.toLowerCase();
    sessions = sessions.filter((session) =>
      [session.bizId, session.alias, session.domain]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }

  if (global.json) {
    printJson(sessions);
    return;
  }

  if (sessions.length === 0) {
    console.log('暂无会话。');
    return;
  }

  console.log(`\n会话（${sessions.length} 个，只读）`);
  printTable(
    [
      { header: 'ID', align: 'right' },
      { header: 'Biz ID', maxWidth: 28 },
      { header: '别名', maxWidth: 18 },
      { header: '域名', maxWidth: 28 },
      { header: 'Cookie', align: 'right' },
      { header: 'Storage', align: 'right' },
      { header: '创建时间', maxWidth: 19 },
    ],
    sessions.map((session) => [
      session.id,
      session.bizId,
      session.alias,
      session.domain,
      Array.isArray(session.cookies) ? session.cookies.length : 0,
      Array.isArray(session.storages) ? session.storages.length : 0,
      formatDateTime(session.createTime),
    ]),
  );
}
