import { readFileSync } from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import { WorkflowApi } from '@gitcoffee/postbot-sdk';

export async function batchPublish(opts: {
  file?: string;
  channel?: string;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const workflowApi = new WorkflowApi(client);

  if (!opts.file) {
    console.log(chalk.red('File is required: --file <path>'));
    process.exit(1);
  }

  let tasks: any[];
  try {
    const raw = readFileSync(opts.file, 'utf-8');
    const data = JSON.parse(raw);
    tasks = Array.isArray(data) ? data : data.tasks || [];
  } catch (error: any) {
    console.log(chalk.red(`Failed to read file: ${error.message}`));
    process.exit(1);
  }

  if (tasks.length === 0) {
    console.log(chalk.yellow('No tasks found in file'));
    process.exit(0);
  }

  const spinner = ora(`Publishing ${tasks.length} tasks...`).start();

  try {
    const result = await workflowApi.executeWorkflow('BATCH_PUBLISH', {
      tasks,
      publishChannel: opts.channel || 'CLOUD',
    });

    spinner.succeed(chalk.green('Batch publish workflow executed!'));

    console.log(chalk.bold('\nResult:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  Execution ID: ${chalk.cyan(result.executionId)}`);
    console.log(`  Status:       ${chalk.yellow(result.status)}`);
    if (result.result?.successCount !== undefined) {
      console.log(`  Success:      ${chalk.green(result.result.successCount)}`);
      console.log(`  Failed:       ${chalk.red(result.result.failCount)}`);
      console.log(`  Total:        ${result.result.total}`);
    }
    console.log(chalk.gray('─'.repeat(50)));
  } catch (error: any) {
    spinner.fail(chalk.red(`Batch publish failed: ${error.message}`));
    process.exit(1);
  }
}
