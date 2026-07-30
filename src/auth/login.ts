import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig, setCurrentToken, getAppConfig, appName } from '../config.js';
import { getAppToken, proxyLogin, proxyRegister, directLogin } from '@gitcoffee/postbot-sdk';

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
        const msg = loginError.message || '';
        const isUserNotFound = msg.includes('用户不存在') ||
          msg.includes('用户名或密码错误') ||
          msg.includes('does not exist');

        if (isUserNotFound) {
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
            spinner.fail(chalk.red(`Registration failed: ${registerError.message}`));
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
    spinner.fail(chalk.red(`Login failed: ${error.message}`));
    process.exit(1);
  }
}
