import inquirer from 'inquirer';
import ora from 'ora';
import {
  directLogin,
  getAppToken,
  proxyLogin,
  proxyRegister,
} from '@gitcoffee-os/postbot-sdk';
import { appName, getAppConfig, getConfig, setCurrentToken } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { classifyError } from '../errors.js';
import { printJson, printSuccess, printWarning } from '../output.js';

export interface LoginOptions {
  username?: string;
  password?: string;
  /** 用户不存在时自动注册，默认 true */
  register?: boolean;
  /** JSON 输出时是否包含 token（默认不输出，避免泄漏） */
  showToken?: boolean;
}

function isUserNotFound(error: unknown): boolean {
  const { code, message } = classifyError(error);
  if (code === 'USER_NOT_FOUND') return true;
  return (
    message.includes('用户不存在') ||
    message.includes('does not exist') ||
    /loginName not found/i.test(message)
  );
}

export async function login(opts: LoginOptions, global: GlobalOptions): Promise<void> {
  let username = opts.username;
  let password = opts.password;

  if ((!username || !password) && process.stdin.isTTY && !global.json) {
    const answers = await inquirer.prompt<{ username?: string; password?: string }>([
      { type: 'input', name: 'username', message: '手机号 / 用户名:', when: !username },
      { type: 'password', name: 'password', message: '密码:', mask: '*', when: !password },
    ]);
    username = username || answers.username;
    password = password || answers.password;
  }

  if (!username || !password) {
    throw new Error('缺少 --username / --password（非交互环境必须显式传入）');
  }

  const appKey = appName(global.app);
  const config = getConfig();
  const appConf = getAppConfig(appKey);
  const spinner = global.json ? null : ora('登录中...').start();

  try {
    if (config.developer.clientId && config.developer.clientSecret) {
      spinner && (spinner.text = '获取应用令牌...');
      const appAccessToken = await getAppToken(
        config.developer.iamBaseUrl,
        config.developer.clientId,
        config.developer.clientSecret,
      );

      spinner && (spinner.text = '认证中...');
      let result;
      try {
        result = await proxyLogin({
          iamBaseUrl: config.developer.iamBaseUrl,
          appAccessToken,
          clientId: config.developer.clientId,
          username,
          password,
          appId: appConf.proxyAppId,
        });
      } catch (loginError) {
        if (!isUserNotFound(loginError)) throw loginError;
        if (opts.register === false) {
          throw new Error(`用户不存在: ${username}（已禁用自动注册）`);
        }
        spinner && (spinner.text = '用户不存在，自动注册中...');
        result = await proxyRegister({
          iamBaseUrl: config.developer.iamBaseUrl,
          appAccessToken,
          clientId: config.developer.clientId,
          username,
          password,
          appId: appConf.proxyAppId,
        });
        printWarning('用户不存在，已自动注册并登录。');
      }

      setCurrentToken(result.token, result.username, result.expiresIn, appKey);

      if (global.json) {
        spinner?.stop();
        printJson({
          app: appKey,
          username: result.username,
          expiresIn: result.expiresIn,
          ...(opts.showToken ? { token: result.token } : {}),
        });
        return;
      }
      spinner?.succeed(`已登录: ${result.username} (${appKey})`);
      return;
    }

    spinner && (spinner.text = '直接登录中...');
    const result = await directLogin(appConf.baseUrl, username, password);
    setCurrentToken(result.access_token, username, result.expires_in, appKey);

    if (global.json) {
      spinner?.stop();
      printJson({
        app: appKey,
        username,
        expiresIn: result.expires_in,
        ...(opts.showToken ? { token: result.access_token } : {}),
      });
      return;
    }
    spinner?.succeed(`已登录: ${username} (${appKey})`);
  } catch (error) {
    spinner?.fail('登录失败');
    throw error;
  }
}
