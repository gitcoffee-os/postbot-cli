import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NotifyApi } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import { parseJsonInput, type GlobalOptions } from '../cli.js';
import { printJson, printSuccess } from '../output.js';

export interface NotifySendOptions {
  event?: string;
  info?: string;
  infoFile?: string;
  clientId?: string;
}

/**
 * 发送通用通知（引擎 POST /postbot/notify）。
 * 接收方须实时返回 SUCCESS 字符串；失败会以业务错误返回。
 */
export async function notifySend(opts: NotifySendOptions, global: GlobalOptions): Promise<void> {
  if (!opts.event) throw new Error('缺少 --event（事件名称，如 userProxyRenewal）');
  if (opts.info && opts.infoFile) throw new Error('--info 与 --info-file 不能同时使用');

  let info: unknown;
  if (opts.info !== undefined) {
    info = parseJsonInput(opts.info, '--info');
  } else if (opts.infoFile) {
    const path = resolve(opts.infoFile);
    let text: string;
    try {
      text = readFileSync(path, 'utf-8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`无法读取通知内容 ${path}: ${message}`);
    }
    info = parseJsonInput(text, path);
  }

  const client = createApiClient(appName(global.app));
  await new NotifyApi(client).send({ event: opts.event, info }, opts.clientId);

  if (global.json) {
    printJson({ sent: true, event: opts.event, clientId: opts.clientId });
    return;
  }
  printSuccess(`通知已发送: ${opts.event}`);
}
