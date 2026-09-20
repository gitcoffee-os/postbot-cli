import chalk from 'chalk';
import inquirer from 'inquirer';
import { appName, createApiClient } from '../config.js';
import { TaskApi } from '@gitcoffee/postbot-sdk';

export async function taskBatchDelete(opts: {
  ids?: string;
  force?: boolean;
  json?: boolean;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const taskApi = new TaskApi(client);

  if (!opts.ids) {
    console.log(chalk.red('Task IDs are required (comma-separated)'));
    process.exit(1);
  }

  const taskIds = opts.ids.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
  if (taskIds.length === 0) {
    console.log(chalk.red('No valid task IDs provided'));
    process.exit(1);
  }

  if (!opts.force) {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Delete ${taskIds.length} task(s) (${taskIds.join(', ')})?`,
      default: false,
    }]);
    if (!confirm) {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }
  }

  try {
    await taskApi.batchDelete(taskIds);
    console.log(chalk.green(`${taskIds.length} task(s) deleted.`));
  } catch (error: any) {
    console.log(chalk.red(`Failed to batch delete tasks: ${error.message}`));
    process.exit(1);
  }
}
