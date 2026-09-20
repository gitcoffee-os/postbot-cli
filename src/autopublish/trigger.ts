import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import { AutoPublishApi } from '@gitcoffee/postbot-sdk';

export async function autopublishTrigger(opts: {
  taskId?: string;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const api = new AutoPublishApi(client);

  if (!opts.taskId) {
    console.log(chalk.red('Task ID is required'));
    process.exit(1);
  }

  const spinner = ora(`Triggering auto-publish for task ${opts.taskId}...`).start();
  try {
    await api.trigger(Number(opts.taskId));
    spinner.succeed(chalk.green(`Task ${opts.taskId} auto-publish triggered.`));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to trigger: ${error.message}`));
    process.exit(1);
  }
}
