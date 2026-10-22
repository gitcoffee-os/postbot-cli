import { appName, clearToken, getCurrentToken } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { printJson, printSuccess } from '../output.js';

export async function logout(global: GlobalOptions): Promise<void> {
  const appKey = appName(global.app);
  const hadToken = Boolean(getCurrentToken(appKey));
  clearToken(appKey);

  if (global.json) {
    printJson({ app: appKey, loggedOut: true, hadToken });
    return;
  }
  printSuccess(hadToken ? `已退出登录: ${appKey}` : `${appKey} 当前未登录，本地令牌已清理。`);
}
