import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig, setCurrentToken, getAppConfig, appName } from '../config.js';
import { getAppToken, proxyLogin, proxyRegister, directLogin } from '@gitcoffee/postbot-sdk';
import { classifyError, tokenHint } from '../errors.js';

/** 判断是否「用户不存在」（后端未来以 USER_NOT_FOUND 业务码区分；当前兼容中英文消息） */
function isUserNotFound(error: unknown): boolean {
  const { code, message } = classifyError(error);
  if (code === 'USER_NOT_FOUND') return true;
  // 注意：不能匹配「用户名或密码错误」——该文案同时表示密码错误，误判会导致错误密码被静默注册新账号
  return (
    message.includes('用户不存在') ||
    message.includes('does not exist') ||
    // IAM 实际返回：`Account loginName not found: <phone>`（明确的「账号不存在」，非密码错误）
    /loginName not found/i.test(message)
  );
}

export async function login(opts: { username?: string; password?: string; app?: 'postbot' | 'postar' }) {
  const config = getConfig();
  const appKey = appName(opts.app);

  let username = opts.username;
  let password = opts.password;

  if (!username || !password) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Phone number:',
        when: !username,
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        mask: '*',
        when: !password,
      },
    ]);
    username = username || answers.username;
    password = password || answers.password;
  }

  if (!username || !password) {
    console.log(chalk.red('Phone number and password are required'));
    process.exit(1);
  }

  const spinner = ora('Logging in...').start();

  try {
    if (config.developer.clientId && config.developer.clientSecret) {
      spinner.text = 'Getting app token...';
      const appAccessToken = await getAppToken(
        config.developer.iamBaseUrl,
        config.developer.clientId,
        config.developer.clientSecret
      );

      spinner.text = 'Authenticating...';
      try {
        const result = await proxyLogin({
          iamBaseUrl: config.developer.iamBaseUrl,
          appAccessToken,
          clientId: config.developer.clientId,
          username,
          password,
          appId: getAppConfig(appKey).proxyAppId,
        });

        setCurrentToken(result.token, result.username, result.expiresIn, appKey);
        spinner.succeed(chalk.green(`Logged in as ${result.username} (${appKey})`));
      } catch (loginError: any) {
        if (isUserNotFound(loginError)) {
          spinner.text = 'User not found, registering...';
          try {
            const registerResult = await proxyRegister({
              iamBaseUrl: config.developer.iamBaseUrl,
              appAccessToken,
              clientId: config.developer.clientId,
              username,
              password,
              appId: getAppConfig(appKey).proxyAppId,
            });

            setCurrentToken(registerResult.token, registerResult.username, registerResult.expiresIn, appKey);
            spinner.succeed(chalk.green(`Account created and logged in as ${registerResult.username} (${appKey})`));
          } catch (registerError: any) {
            const hint = tokenHint(registerError);
            spinner.fail(chalk.red(`Registration failed: ${registerError.message}${hint ? ` (${hint})` : ''}`));
            process.exit(1);
          }
        } else {
          throw loginError;
        }
      }
    } else {
      spinner.text = 'Direct login...';
      const appConf = getAppConfig(appKey);
      const result = await directLogin(appConf.baseUrl, username, password);

      setCurrentToken(result.access_token, username, result.expires_in, appKey);
      spinner.succeed(chalk.green(`Logged in as ${username} (${appKey})`));
    }
  } catch (error: any) {
    const hint = tokenHint(error);
    spinner.fail(chalk.red(`Login failed: ${error.message}${hint ? ` (${hint})` : ''}`));
    process.exit(1);
  }
}
