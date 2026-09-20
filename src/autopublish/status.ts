import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import { AutoPublishApi } from '@gitcoffee/postbot-sdk';

export async function autopublishStatus(opts: {
  taskId?: string;
  json?: boolean;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const api = new AutoPublishApi(client);

  if (!opts.taskId) {
    console.log(chalk.red('Task ID is required'));
    process.exit(1);
  }

  const spinner = ora('Querying publish status...').start();
  try {
    const result = await api.getStatus(Number(opts.taskId));
    spinner.stop();

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold('\nAuto-Publish Status:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  Task ID:      ${chalk.cyan(result.taskId)}`);
    console.log(`  Status:       ${chalk.yellow(result.status)}`);
    if (result.publishedUrl) console.log(`  Published:    ${chalk.cyan(result.publishedUrl)}`);
    if (result.contentUrl) console.log(`  Content:      ${chalk.cyan(result.contentUrl)}`);
    if (result.errorMsg) console.log(`  Error:        ${chalk.red(result.errorMsg)}`);
    if (result.lastRunAt) console.log(`  Last Run:     ${chalk.cyan(result.lastRunAt)}`);
    console.log(chalk.gray('─'.repeat(50)));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to query status: ${error.message}`));
    process.exit(1);
  }
}
