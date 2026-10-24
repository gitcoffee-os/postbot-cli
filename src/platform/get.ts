import { PlatformApi } from '@gitcoffee-os/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { printHeading, printJson, printKeyValues } from '../output.js';
import { getPlatform, normalizePlatformCode } from './registry.js';
import { loadResources, resolvePlatformRef } from '../resources.js';

export async function platformGet(ref: string, global: GlobalOptions): Promise<void> {
  const client = createApiClient(appName(global.app));
  const bundle = await loadResources(client, { withAccounts: false, withClients: false });
  const platform = resolvePlatformRef(bundle, ref);
  const meta = getPlatform(platform.code);

  const detail = {
    ...platform,
    canonicalCode: normalizePlatformCode(platform.code),
    contentTypes: meta?.contentTypes,
    locale: meta?.locale,
  };

  if (global.json) {
    printJson(detail);
    return;
  }

  printHeading(`平台 #${platform.id}`);
  printKeyValues([
    ['Code', platform.code],
    ['标准 Code', normalizePlatformCode(platform.code)],
    ['名称', platform.name],
    ['类型', platform.type],
    ['状态', platform.status],
    ['排序', platform.sort],
    ['主页', platform.homepage],
    ['URL', platform.url],
    ['Base URL', platform.baseUrl],
    ['描述', platform.description],
    ['静态注册表内容类型', meta?.contentTypes.join(', ')],
  ]);

  if (platform.publishChannelConfig) {
    printHeading('发布通道配置');
    printJson(parseJson(platform.publishChannelConfig) ?? platform.publishChannelConfig);
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
