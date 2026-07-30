import chalk from 'chalk';
import { appName, createApiClient } from '../config.js';
import { TaskApi } from '@gitcoffee/postbot-sdk';

export async function taskGet(opts: {
  taskId?: string;
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

  try {
    const task = await taskApi.get(Number(opts.taskId));

    if (opts.json) {
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    console.log(chalk.bold('\nTask Detail:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  ID:        ${chalk.cyan(task.id)}`);
    console.log(`  Name:      ${chalk.cyan(task.name)}`);
    console.log(`  Type:      ${chalk.cyan(task.type)}`);
    console.log(`  Platform:  ${chalk.cyan(task.mediaPlatformId)}`);
    console.log(`  Account:   ${chalk.cyan(task.mediaAccountId)}`);
    console.log(`  Channel:   ${chalk.cyan(task.publishChannel || 'N/A')}`);
    console.log(`  Status:    ${chalk.yellow(task.status)}`);
    console.log(`  Auto:      ${task.isAutoPublish ? 'Yes' : 'No'}`);
    console.log(`  Created:   ${chalk.cyan(task.createdAt || 'N/A')}`);
    console.log(`  Updated:   ${chalk.cyan(task.updatedAt || 'N/A')}`);
    console.log(chalk.gray('─'.repeat(50)));
  } catch (error: any) {
    console.log(chalk.red(`Failed to get task: ${error.message}`));
    process.exit(1);
  }
}
