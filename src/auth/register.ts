import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig, setCurrentToken, getAppConfig, appName } from '../config.js';
import { getAppToken, proxyRegister } from '@gitcoffee/postbot-sdk';

export async function register(opts: { username?: string; password?: string; nickname?: string; mobile?: string; app?: 'postbot' | 'postar' }) {
  const config = getConfig();
  const appKey = appName(opts.app);

  let username = opts.username;
  let password = opts.password;
  let nickname = opts.nickname;
  let mobile = opts.mobile;

  if (!username || !password) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Username:',
        when: !username,
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        mask: '*',
        when: !password,
      },
      {
        type: 'input',
        name: 'nickname',
        message: 'Nickname (optional):',
        when: !nickname,
      },
      {
        type: 'input',
        name: 'mobile',
        message: 'Mobile (optional):',
        when: !mobile,
      },
    ]);
    username = username || answers.username;
    password = password || answers.password;
    nickname = nickname || answers.nickname;
    mobile = mobile || answers.mobile;
  }

  if (!username || !password) {
    console.log(chalk.red('Username and password are required'));
    process.exit(1);
  }

  const spinner = ora('Registering...').start();

  try {
    if (!config.developer.clientId || !config.developer.clientSecret) {
      spinner.fail(chalk.red('Developer credentials not configured. Run: postbot config --client-id <id> --client-secret <secret>'));
      process.exit(1);
    }

    spinner.text = 'Getting app token...';
    const appAccessToken = await getAppToken(
      config.developer.iamBaseUrl,
      config.developer.clientId,
      config.developer.clientSecret
    );

    spinner.text = 'Creating account...';
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
    spinner.succeed(chalk.green(`Account created and logged in as ${result.username} (${appKey})`));
  } catch (error: any) {
    spinner.fail(chalk.red(`Registration failed: ${error.message}`));
    process.exit(1);
  }
}
