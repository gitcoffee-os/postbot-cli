import { getUserInfo } from '@gitcoffee/postbot-sdk';
import { appName, getAppConfig, getConfig, getCurrentToken } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { printJson, printKeyValues, printWarning } from '../output.js';

export async function whoami(global: GlobalOptions): Promise<void> {
  const appKey = appName(global.app);
  const token = getCurrentToken(appKey);

  if (!token) {
    if (global.json) {
      printJson({ app: appKey, loggedIn: false });
    } else {
      printWarning(`未登录 ${appKey}。运行: postbot login`);
    }
    process.exitCode = 1;
    return;
  }

  const config = getConfig();
  const appConf = getAppConfig(appKey);
  const userInfo = await getUserInfo(config.developer.iamBaseUrl, token, appConf.appId);

  if (global.json) {
    printJson({ app: appKey, loggedIn: true, user: userInfo });
    return;
  }

  printKeyValues([
    ['应用', appKey],
    ['用户名', userInfo.preferred_username || userInfo.username],
    ['名称', userInfo.name || userInfo.nickname],
    ['邮箱', userInfo.email],
    ['手机号', userInfo.phone_number],
    ['用户 ID', userInfo.sub || userInfo.id],
  ]);
}
