import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import { WorkflowApi } from '@gitcoffee/postbot-sdk';

export async function workflowRetry(opts: {
  executionId?: string;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);

  if (!opts.executionId) {
    console.log(chalk.red('Execution ID is required'));
    process.exit(1);
  }

  const spinner = ora('Retrying workflow...').start();

  try {
    const client = createApiClient(appKey);
    const workflowApi = new WorkflowApi(client);
    const result = await workflowApi.retryExecution(opts.executionId);

    spinner.succeed(chalk.green('Workflow retried!'));

    console.log(chalk.bold('\nResult:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  Execution ID: ${chalk.cyan(result.executionId)}`);
    console.log(`  Status:       ${chalk.yellow(result.status)}`);
    console.log(chalk.gray('─'.repeat(50)));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to retry workflow: ${error.message}`));
    process.exit(1);
  }
}
