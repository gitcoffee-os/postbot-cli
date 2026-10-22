import { AccountApi, PlatformApi, type Account } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { formatDateTime, printJson, printTable } from '../output.js';
import { normalizePlatformCode } from '../platform/registry.js';

export interface AccountListOptions {
  platform?: string;
  status?: string;
  search?: string;
  page?: string;
  size?: string;
  all?: boolean;
}

/**
 * 账号列表。引擎 /listing 支持 mediaPlatformId / status / search，
 * 但 platform 参数既可能是平台 ID 也可能是平台 code，这里统一解析后过滤。
 */
export async function accountList(opts: AccountListOptions, global: GlobalOptions): Promise<void> {
  const client = createApiClient(appName(global.app));
  const [accounts, platforms] = await Promise.all([
    new AccountApi(client).list(),
    new PlatformApi(client).list(),
  ]);

  const platformById = new Map(platforms.map((platform) => [Number(platform.id), platform]));
  const platformByCode = new Map(
    platforms.map((platform) => [normalizePlatformCode(platform.code), platform]),
  );

  let filtered = accounts;

  if (opts.platform) {
    const raw = opts.platform.trim();
    const platform = /^\d+$/.test(raw)
      ? platformById.get(Number(raw))
      : platformByCode.get(normalizePlatformCode(raw));
    if (!platform) {
      throw new Error(
        `平台不存在: ${raw}。可用平台: ${platforms.map((item) => item.code).join(', ')}`,
      );
    }
    filtered = filtered.filter((account) => Number(account.mediaPlatformId) === Number(platform.id));
  }

  if (opts.status) {
    const status = validateAccountStatus(opts.status);
    filtered = filtered.filter((account) => String(account.status ?? '').toLowerCase() === status);
  }

  if (opts.search) {
    const keyword = opts.search.toLowerCase();
    filtered = filtered.filter((account) =>
      [account.username, account.name, account.accountId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }

  filtered.sort(
    (a, b) =>
      Number(a.mediaPlatformId) - Number(b.mediaPlatformId) || Number(a.id) - Number(b.id),
  );

  const page = Number(opts.page ?? 1);
  const size = Number(opts.size ?? (opts.all ? Math.max(filtered.length, 1) : 20));
  if (!Number.isInteger(page) || page < 1) {
    throw new Error('--page 必须是 >= 1 的整数');
  }
  if (!Number.isInteger(size) || size < 1 || size > 200) {
    throw new Error('--size 必须是 1-200 的整数');
  }
  const current = opts.all ? 1 : page;
  const pageItems = opts.all
    ? filtered
    : filtered.slice((page - 1) * size, (page - 1) * size + size);

  const payload = {
    list: pageItems,
    total: filtered.length,
    current,
    size: opts.all ? Math.max(filtered.length, 1) : size,
    pages: opts.all ? 1 : Math.max(1, Math.ceil(filtered.length / size)),
  };

  if (global.json) {
    printJson(payload);
    return;
  }

  if (filtered.length === 0) {
    console.log('暂无账号。请先在 PostBot 客户端登录并绑定平台账号。');
    return;
  }

  console.log(`\n账号（第 ${payload.current}/${payload.pages} 页，共 ${payload.total} 条）`);
  printTable(
    [
      { header: 'ID', align: 'right' },
      { header: '平台', maxWidth: 18 },
      { header: '用户名', maxWidth: 22 },
      { header: '名称', maxWidth: 20 },
      { header: '状态', maxWidth: 9 },
      { header: '会话', align: 'right' },
      { header: '创建时间', maxWidth: 19 },
    ],
    pageItems.map((account) => {
      const platform = platformById.get(Number(account.mediaPlatformId));
      return [
        account.id,
        platformDisplay(platform?.code, platform?.name, account.mediaPlatformId),
        account.username,
        account.name,
        account.status,
        account.sessionbotSessionId ?? '—',
        formatDateTime(account.createTime),
      ];
    }),
  );
}

function platformDisplay(code: string | undefined, name: string | undefined, id?: number): string {
  if (code) return name ? `${name} (${normalizePlatformCode(code)})` : normalizePlatformCode(code);
  return id ? `#${id}` : '—';
}

export function validateAccountStatus(status: string | undefined): string | undefined {
  if (!status) return undefined;
  const normalized = status.toLowerCase();
  if (!['ok', 'renew', 'expired', 'unbound'].includes(normalized)) {
    throw new Error(`非法账号状态: ${status}（可选 ok / renew / expired / unbound）`);
  }
  return normalized;
}

export function accountSortKey(account: Account): string {
  return `${account.mediaPlatformId}-${account.id}`;
}
