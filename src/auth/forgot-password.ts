import inquirer from 'inquirer';
import ora from 'ora';
import { getAppToken, proxyForgotPassword } from '@gitcoffee-os/postbot-sdk';
import { appName, getAppConfig, getConfig } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { printJson, printSuccess } from '../output.js';

export interface ForgotPasswordOptions {
  username?: string;
  password?: string;
}

/** 通过 IAM 开发者代理重置密码（无需登录）。 */
export async function forgotPassword(
  opts: ForgotPasswordOptions,
  global: GlobalOptions,
): Promise<void> {
  let username = opts.username;
  let password = opts.password;

  if ((!username || !password) && process.stdin.isTTY && !global.json) {
    const answers = await inquirer.prompt<{ username?: string; password?: string }>([
      { type: 'input', name: 'username', message: '用户名:', when: !username },
      { type: 'password', name: 'password', message: '新密码:', mask: '*', when: !password },
    ]);
    username = username || answers.username;
    password = password || answers.password;
  }

  if (!username || !password) {
    throw new Error('缺少 --username / --password（非交互环境必须显式传入）');
  }

  const config = getConfig();
  if (!config.developer.clientId || !config.developer.clientSecret) {
    throw new Error(
      '重置密码需要开发者凭证。请先运行: postbot config --client-id <id> --client-secret <secret>',
    );
  }

  const appKey = appName(global.app);
  const spinner = global.json ? null : ora('重置密码中...').start();

  try {
    const appAccessToken = await getAppToken(
      config.developer.iamBaseUrl,
      config.developer.clientId,
      config.developer.clientSecret,
    );
    await proxyForgotPassword({
      iamBaseUrl: config.developer.iamBaseUrl,
      appAccessToken,
      clientId: config.developer.clientId,
      username,
      password,
      appId: getAppConfig(appKey).proxyAppId,
    });

    if (global.json) {
      spinner?.stop();
      printJson({ reset: true, username });
      return;
    }
    spinner?.succeed(`密码已重置: ${username}。请使用新密码登录。`);
  } catch (error) {
    spinner?.fail('重置密码失败');
    throw error;
  }
}
