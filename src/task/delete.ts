import chalk from 'chalk';
import inquirer from 'inquirer';
import { appName, createApiClient } from '../config.js';
import { TaskApi } from '@gitcoffee/postbot-sdk';

export async function taskDelete(opts: {
  taskId?: string;
  force?: boolean;
  json?: boolean;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const taskApi = new TaskApi(client);

  if (!opts.taskId) {
    console.log(chalk.red('Task ID is required'));
    process.exit(1);
  }

  const taskId = Number(opts.taskId);

  if (!opts.force) {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Delete task ${taskId}?`,
      default: false,
    }]);
    if (!confirm) {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }
  }

  try {
    await taskApi.delete(taskId);
    console.log(chalk.green(`Task ${taskId} deleted.`));
  } catch (error: any) {
    console.log(chalk.red(`Failed to delete task: ${error.message}`));
    process.exit(1);
  }
}
