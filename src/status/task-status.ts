import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import { WorkflowApi } from '@gitcoffee/postbot-sdk';

export async function taskStatus(opts: {
  taskId?: string;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);

  if (!opts.taskId) {
    console.log(chalk.red('Task ID is required'));
    process.exit(1);
  }

  const spinner = ora('Querying status...').start();

  try {
    const client = createApiClient(appKey);
    const workflowApi = new WorkflowApi(client);
    const result = await workflowApi.executeWorkflow('STATUS_QUERY', {
      taskId: Number(opts.taskId),
    });

    spinner.stop();

    console.log(chalk.bold('\nTask Status:'));
    console.log(chalk.gray('─'.repeat(60)));

    if (result.result?.task) {
      const task = result.result.task as Record<string, any>;
      console.log(`  Task ID:      ${chalk.cyan(task.id)}`);
      console.log(`  Name:         ${chalk.cyan(task.name)}`);
      console.log(`  Type:         ${chalk.cyan(task.type)}`);
      console.log(`  Status:       ${chalk.yellow(task.status)}`);
      console.log(`  Channel:      ${chalk.cyan(task.publishChannel || 'N/A')}`);
    }

    if (result.result?.latestJob) {
      const job = result.result.latestJob as Record<string, any>;
      console.log(chalk.bold('\n  Latest Publish Job:'));
      console.log(`    Job ID:      ${chalk.cyan(job.id)}`);
      console.log(`    Status:      ${chalk.yellow(job.status)}`);
      console.log(`    Scheduled:   ${chalk.cyan(job.scheduledAt || 'N/A')}`);
      console.log(`    Executed:    ${chalk.cyan(job.executedAt || 'N/A')}`);
      console.log(`    Retries:     ${job.retryCount}`);
    }

    if (result.result?.recentLogs && Array.isArray(result.result.recentLogs) && result.result.recentLogs.length > 0) {
      console.log(chalk.bold('\n  Recent Logs:'));
      for (const log of result.result.recentLogs) {
        const logEntry = log as Record<string, any>;
        const statusIcon = logEntry.status === 'SUCCESS' ? chalk.green('✓') : chalk.red('✗');
        console.log(`    ${statusIcon} ${logEntry.status} - ${logEntry.publishedUrl || logEntry.errorMsg || 'N/A'}`);
      }
    }

    console.log(chalk.gray('─'.repeat(60)));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to query status: ${error.message}`));
    process.exit(1);
  }
}
