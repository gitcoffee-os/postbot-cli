import chalk from 'chalk';
import { appName, createApiClient } from '../config.js';
import { TaskApi } from '@gitcoffee/postbot-sdk';

export async function taskUpdate(opts: {
  taskId?: string;
  name?: string;
  status?: string;
  scheduledAt?: string;
  maxRetries?: string;
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

  try {
    const existing = await taskApi.get(taskId);

    const updateData: Record<string, any> = {};
    if (opts.name) updateData.name = opts.name;
    if (opts.status) updateData.status = opts.status;
    if (opts.scheduledAt) updateData.scheduledAt = opts.scheduledAt;
    if (opts.maxRetries !== undefined) updateData.maxRetryCount = Number(opts.maxRetries);

    if (Object.keys(updateData).length === 0) {
      console.log(chalk.yellow('No fields to update. Use --name, --status, --scheduled-at, or --max-retries.'));
      process.exit(1);
    }

    const task = await taskApi.update(taskId, updateData);

    if (opts.json) {
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    console.log(chalk.green(`Task ${task.id} updated successfully.`));
    console.log(`  Name:     ${chalk.cyan(task.name)}`);
    console.log(`  Status:   ${chalk.yellow(task.status)}`);
    console.log(`  Updated:  ${chalk.cyan(task.updatedAt || 'N/A')}`);
  } catch (error: any) {
    console.log(chalk.red(`Failed to update task: ${error.message}`));
    process.exit(1);
  }
}
