import { PlatformApi } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { printJson, printTable } from '../output.js';
import { getPlatform, normalizePlatformCode } from './registry.js';

export interface PlatformListOptions {
  type?: string;
  status?: string;
  search?: string;
}

export async function platformList(opts: PlatformListOptions, global: GlobalOptions): Promise<void> {
  const client = createApiClient(appName(global.app));
  const platforms = await new PlatformApi(client).list();

  let filtered = platforms;
  if (opts.type) {
    const type = opts.type.toLowerCase();
    filtered = filtered.filter((platform) => String(platform.type ?? '').toLowerCase() === type);
  }
  if (opts.status) {
    const status = opts.status.toLowerCase();
    filtered = filtered.filter((platform) => String(platform.status ?? '').toLowerCase() === status);
  }
  if (opts.search) {
    const keyword = opts.search.toLowerCase();
    filtered = filtered.filter((platform) =>
      [platform.name, platform.code, platform.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }

  filtered.sort(
    (a, b) => Number(a.sort ?? 9999) - Number(b.sort ?? 9999) || String(a.code).localeCompare(String(b.code)),
  );

  if (global.json) {
    printJson(
      filtered.map((platform) => ({
        ...platform,
        canonicalCode: normalizePlatformCode(platform.code),
      })),
    );
    return;
  }

  console.log(`\n平台（${filtered.length} 个）`);
  printTable(
    [
      { header: 'ID', align: 'right' },
      { header: 'Code', maxWidth: 20 },
      { header: '名称', maxWidth: 20 },
      { header: '类型', maxWidth: 10 },
      { header: '状态', maxWidth: 8 },
      { header: '支持的内容类型', maxWidth: 24 },
      { header: '排序', align: 'right' },
    ],
    filtered.map((platform) => {
      const canonical = normalizePlatformCode(platform.code);
      const meta = getPlatform(canonical);
      return [
        platform.id,
        platform.code,
        platform.name,
        platform.type,
        platform.status,
        meta ? meta.contentTypes.join(', ') : '未注册',
        platform.sort,
      ];
    }),
  );

  const legacy = filtered.filter((platform) => normalizePlatformCode(platform.code) !== String(platform.code).toLowerCase());
  if (legacy.length > 0) {
    console.log(
      `\n注意: ${legacy.map((item) => item.code).join(', ')} 是旧平台编号；` +
        '引擎会把请求编号归一化为标准码，若发布 Job 未创建，请先更新平台字典 code。',
    );
  }
}
