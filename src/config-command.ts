import { getConfig, getConfigPath, saveConfig, setDefaultApp } from './config.js';
import { isAppName } from './constants.js';
import type { GlobalOptions } from './cli.js';
import { printHeading, printJson, printKeyValues, printSuccess, printWarning } from './output.js';

export interface ConfigCommandOptions {
  clientId?: string;
  clientSecret?: string;
  iamBaseUrl?: string;
  defaultApp?: string;
  show?: boolean;
  showSecret?: boolean;
}

export async function configCommand(
  opts: ConfigCommandOptions,
  global: GlobalOptions,
): Promise<void> {
  const hasUpdate =
    opts.clientId !== undefined ||
    opts.clientSecret !== undefined ||
    opts.iamBaseUrl !== undefined ||
    opts.defaultApp !== undefined;

  if (!hasUpdate || opts.show) {
    const config = getConfig();
    if (global.json) {
      printJson({
        path: getConfigPath(),
        currentApp: config.currentApp,
        iamBaseUrl: config.developer.iamBaseUrl,
        clientId: config.developer.clientId,
        clientSecret: opts.showSecret
          ? config.developer.clientSecret
          : config.developer.clientSecret
            ? '••••••••'
            : '',
        accounts: Object.fromEntries(
          Object.entries(config.accounts).map(([app, account]) => [
            app,
            { username: account.username, expiresAt: account.expiresAt, baseUrl: account.baseUrl },
          ]),
        ),
      });
      return;
    }

    printHeading('当前配置');
    printKeyValues([
      ['配置文件', getConfigPath()],
      ['默认应用', config.currentApp],
      ['IAM Base URL', config.developer.iamBaseUrl],
      ['Client ID', config.developer.clientId],
      ['Client Secret', config.developer.clientSecret ? (opts.showSecret ? config.developer.clientSecret : '••••••••') : '(未设置)'],
      [
        '登录状态',
        Object.entries(config.accounts)
          .map(([app, account]) => `${app}: ${account.username} (${account.expiresAt})`)
          .join('; ') || '(未登录)',
      ],
    ]);

    if (!config.developer.clientId || !config.developer.clientSecret) {
      printWarning('未配置开发者凭证，登录将回落到直接登录模式；注册/重置密码不可用。');
      console.log('  postbot config --client-id <id> --client-secret <secret>');
    }
    return;
  }

  if (opts.defaultApp !== undefined) {
    if (!isAppName(opts.defaultApp)) {
      throw new Error('--default-app 只能是 postbot 或 postar');
    }
    setDefaultApp(opts.defaultApp);
  }

  const config = getConfig();
  if (opts.clientId !== undefined) config.developer.clientId = opts.clientId;
  if (opts.clientSecret !== undefined) config.developer.clientSecret = opts.clientSecret;
  if (opts.iamBaseUrl !== undefined) config.developer.iamBaseUrl = opts.iamBaseUrl;
  saveConfig(config);

  if (global.json) {
    printJson({ saved: true, path: getConfigPath(), currentApp: config.currentApp });
    return;
  }
  printSuccess('配置已保存。');
}
