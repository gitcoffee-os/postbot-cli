import { FingerprintApi, type MediaAccountFingerprint } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import { confirmAction, parseInteger, type GlobalOptions } from '../cli.js';
import { formatDateTime, printCancelled, printHeading, printJson, printKeyValues, printSuccess } from '../output.js';

export interface FingerprintSaveOptions {
  ua?: string;
  locale?: string;
  timezone?: string;
  viewportWidth?: string;
  viewportHeight?: string;
  deviceScaleFactor?: string;
  hardwareConcurrency?: string;
  colorScheme?: string;
  os?: string;
  platform?: string;
}

export async function fingerprintGet(accountId: string, global: GlobalOptions): Promise<void> {
  const id = parseInteger(accountId, '账号 ID', { min: 1 });
  const client = createApiClient(appName(global.app));
  const fingerprint = await new FingerprintApi(client).load(id);

  if (global.json) {
    printJson(fingerprint);
    return;
  }
  if (!fingerprint) {
    console.log(`账号 ${id} 未设置指纹，将使用引擎自动解析。`);
    return;
  }

  printHeading(`账号 #${id} 浏览器指纹`);
  printKeyValues([
    ['版本', fingerprint.version],
    ['User-Agent', fingerprint.ua],
    ['语言', fingerprint.locale],
    ['时区', fingerprint.timezone],
    ['视口', fingerprint.viewportWidth && fingerprint.viewportHeight ? `${fingerprint.viewportWidth}x${fingerprint.viewportHeight}` : undefined],
    ['Device Scale', fingerprint.deviceScaleFactor],
    ['CPU 核数', fingerprint.hardwareConcurrency],
    ['配色', fingerprint.colorScheme],
    ['系统', fingerprint.os],
    ['Platform', fingerprint.platform],
    ['创建时间', formatDateTime(fingerprint.createTime)],
  ]);
}

export async function fingerprintSave(
  accountId: string,
  opts: FingerprintSaveOptions,
  global: GlobalOptions,
): Promise<void> {
  const id = parseInteger(accountId, '账号 ID', { min: 1 });
  const hasOverride = Object.values(opts).some((value) => value !== undefined);
  if (!hasOverride) {
    throw new Error('没有需要保存的指纹字段。可用: --ua --locale --timezone --viewport-width --viewport-height --device-scale-factor --hardware-concurrency --color-scheme --os --platform');
  }

  const fingerprint: MediaAccountFingerprint = { mediaAccountId: id };
  if (opts.ua !== undefined) fingerprint.ua = opts.ua;
  if (opts.locale !== undefined) fingerprint.locale = opts.locale;
  if (opts.timezone !== undefined) fingerprint.timezone = opts.timezone;
  if (opts.viewportWidth !== undefined) fingerprint.viewportWidth = parseInteger(opts.viewportWidth, '--viewport-width', { min: 1 });
  if (opts.viewportHeight !== undefined) fingerprint.viewportHeight = parseInteger(opts.viewportHeight, '--viewport-height', { min: 1 });
  if (opts.deviceScaleFactor !== undefined) {
    const scale = Number(opts.deviceScaleFactor);
    if (!Number.isFinite(scale) || scale <= 0) throw new Error('--device-scale-factor 必须是正数');
    fingerprint.deviceScaleFactor = scale;
  }
  if (opts.hardwareConcurrency !== undefined) {
    fingerprint.hardwareConcurrency = parseInteger(opts.hardwareConcurrency, '--hardware-concurrency', { min: 1 });
  }
  if (opts.colorScheme !== undefined) {
    if (!['light', 'dark'].includes(opts.colorScheme)) throw new Error('--color-scheme 只能是 light 或 dark');
    fingerprint.colorScheme = opts.colorScheme;
  }
  if (opts.os !== undefined) fingerprint.os = opts.os;
  if (opts.platform !== undefined) fingerprint.platform = opts.platform;

  const client = createApiClient(appName(global.app));
  await new FingerprintApi(client).save(fingerprint);

  if (global.json) {
    printJson({ saved: true, mediaAccountId: id });
    return;
  }
  printSuccess(`账号 ${id} 的指纹已保存（版本自动 +1）。`);
}

export async function fingerprintRemove(
  accountId: string,
  options: { force?: boolean },
  global: GlobalOptions,
): Promise<void> {
  const id = parseInteger(accountId, '账号 ID', { min: 1 });
  const confirmed = await confirmAction(`确认删除账号 ${id} 的指纹？删除后将回落到自动解析。`, {
    yes: options.force || global.yes,
  });
  if (!confirmed) return printCancelled();

  const client = createApiClient(appName(global.app));
  await new FingerprintApi(client).remove(id);

  if (global.json) {
    printJson({ mediaAccountId: id, deleted: true });
    return;
  }
  printSuccess(`账号 ${id} 的指纹已删除，后续将使用引擎自动解析。`);
}
