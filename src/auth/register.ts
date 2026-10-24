import inquirer from 'inquirer';
import ora from 'ora';
import { getAppToken, proxyRegister } from '@gitcoffee-os/postbot-sdk';
import { appName, getAppConfig, getConfig, setCurrentToken } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { printJson } from '../output.js';

export interface RegisterOptions {
  username?: string;
  password?: string;
  nickname?: string;
  mobile?: string;
  showToken?: boolean;
}

export async function register(opts: RegisterOptions, global: GlobalOptions): Promise<void> {
  let { username, password, nickname, mobile } = opts;

  if ((!username || !password) && process.stdin.isTTY && !global.json) {
    const answers = await inquirer.prompt<{
      username?: string;
      password?: string;
      nickname?: string;
      mobile?: string;
    }>([
      { type: 'input', name: 'username', message: '用户名:', when: !username },
      { type: 'password', name: 'password', message: '密码:', mask: '*', when: !password },
      { type: 'input', name: 'nickname', message: '昵称（可选）:', when: !nickname },
      { type: 'input', name: 'mobile', message: '手机号（可选）:', when: !mobile },
    ]);
    username = username || answers.username;
    password = password || answers.password;
    nickname = nickname || answers.nickname;
    mobile = mobile || answers.mobile;
  }

  if (!username || !password) {
    throw new Error('缺少 --username / --password（非交互环境必须显式传入）');
  }

  const config = getConfig();
  if (!config.developer.clientId || !config.developer.clientSecret) {
    throw new Error(
      '注册需要开发者凭证。请先运行: postbot config --client-id <id> --client-secret <secret>',
    );
  }

  const appKey = appName(global.app);
  const spinner = global.json ? null : ora('注册中...').start();

  try {
    spinner && (spinner.text = '获取应用令牌...');
    const appAccessToken = await getAppToken(
      config.developer.iamBaseUrl,
      config.developer.clientId,
      config.developer.clientSecret,
    );

    spinner && (spinner.text = '创建账号...');
    const result = await proxyRegister({
      iamBaseUrl: config.developer.iamBaseUrl,
      appAccessToken,
      clientId: config.developer.clientId,
      username,
      password,
      nickname,
      mobile,
      appId: getAppConfig(appKey).proxyAppId,
    });

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
    spinner?.succeed(`注册成功并已登录: ${result.username} (${appKey})`);
  } catch (error) {
    spinner?.fail('注册失败');
    throw error;
  }
}
