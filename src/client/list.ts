import { ClientApi, PlatformApi, type MediaClient } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { formatDateTime, printJson, printTable } from '../output.js';
import { isClientOnline } from '../resources.js';
import { normalizeClientType } from '../constants.js';
import { normalizePlatformCode } from '../platform/registry.js';

export interface ClientListOptions {
  type?: string;
  online?: boolean;
  platform?: string;
}

export async function clientList(opts: ClientListOptions, global: GlobalOptions): Promise<void> {
  const client = createApiClient(appName(global.app));
  const [clients, platforms] = await Promise.all([
    new ClientApi(client).list(),
    new PlatformApi(client).list(),
  ]);

  const platformById = new Map(platforms.map((platform) => [Number(platform.id), platform]));
  const platformByCode = new Map(platforms.map((platform) => [normalizePlatformCode(platform.code), platform]));

  let filtered = clients;
  if (opts.type) {
    const type = normalizeClientType(opts.type);
    if (!type) {
      throw new Error(`非法客户端类型: ${opts.type}（可选 browser_extension / browser_extension_ephemeral / desktop / cloud）`);
    }
    filtered = filtered.filter((item) => String(item.type ?? '').toLowerCase() === type);
  }
  if (opts.online) {
    filtered = filtered.filter((item) => isClientOnline(item));
  }
  if (opts.platform) {
    const raw = opts.platform.trim();
    const platform = /^\d+$/.test(raw)
      ? platformById.get(Number(raw))
      : platformByCode.get(normalizePlatformCode(raw));
    if (!platform) throw new Error(`平台不存在: ${raw}`);
    filtered = filtered.filter((item) => Number(item.mediaPlatformId) === Number(platform.id));
  }

  filtered.sort((a, b) => Number(a.id) - Number(b.id));

  if (global.json) {
    printJson(filtered);
    return;
  }

  if (filtered.length === 0) {
    console.log('暂无客户端。');
    return;
  }

  console.log(`\n客户端（${filtered.length} 个）`);
  printTable(
    [
      { header: 'ID', align: 'right' },
      { header: '名称', maxWidth: 22 },
      { header: '类型', maxWidth: 28 },
      { header: '平台', maxWidth: 16 },
      { header: '在线', maxWidth: 4 },
      { header: '最后在线', maxWidth: 19 },
      { header: 'Client Key', maxWidth: 24 },
    ],
    filtered.map((item) => {
      const platform = item.mediaPlatformId
        ? platformById.get(Number(item.mediaPlatformId))
        : undefined;
      return [
        item.id,
        item.name,
        item.type,
        platform ? `${platform.name} (${normalizePlatformCode(platform.code)})` : '—',
        isClientOnline(item) ? '是' : '否',
        formatDateTime(item.lastOnlineAt),
        item.clientKey,
      ];
    }),
  );
}

export function clientTypeOf(client: MediaClient): string {
  return String(client.type ?? '').toLowerCase();
}
