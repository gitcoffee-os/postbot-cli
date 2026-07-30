import chalk from 'chalk';
import ora from 'ora';
import { getConfig, getCurrentToken, getAppConfig, appName } from '../config.js';
import { getUserInfo } from '@gitcoffee/postbot-sdk';

export async function whoami(opts: { app?: 'postbot' | 'postar' }) {
  const appKey = appName(opts.app);
  const token = getCurrentToken(appKey);

  if (!token) {
    console.log(chalk.yellow(`Not logged in to ${appKey}`));
    console.log(chalk.gray('Run: postbot login'));
    return;
  }

  const spinner = ora('Fetching user info...').start();

  try {
    const config = getConfig();
    const appConf = getAppConfig(appKey);
    const userInfo = await getUserInfo(config.developer.iamBaseUrl, token, appConf.appId);

    spinner.stop();
    console.log(chalk.bold(`\nLogged in to ${appKey}:`));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  Username: ${chalk.cyan(userInfo.preferred_username || userInfo.username || 'N/A')}`);
    console.log(`  Name:     ${chalk.cyan(userInfo.name || 'N/A')}`);
    console.log(`  Email:    ${chalk.cyan(userInfo.email || 'N/A')}`);
    console.log(`  Mobile:   ${chalk.cyan(userInfo.phone_number || 'N/A')}`);
    console.log(chalk.gray('─'.repeat(40)));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to get user info: ${error.message}`));
    console.log(chalk.yellow('Token may be expired. Run: postbot login'));
  }
}
