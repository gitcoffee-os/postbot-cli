import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import { WorkflowApi } from '@gitcoffee/postbot-sdk';

export async function workflowStatus(opts: {
  executionId?: string;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);

  if (!opts.executionId) {
    console.log(chalk.red('Execution ID is required'));
    process.exit(1);
  }

  const spinner = ora('Querying workflow status...').start();

  try {
    const client = createApiClient(appKey);
    const workflowApi = new WorkflowApi(client);
    const result = await workflowApi.getExecutionStatus(opts.executionId);

    spinner.stop();

    console.log(chalk.bold('\nWorkflow Execution Status:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  Execution ID: ${chalk.cyan(result.executionId)}`);
    console.log(`  Workflow:     ${chalk.cyan(result.workflowType)}`);
    console.log(`  Status:       ${chalk.yellow(result.status)}`);

    if (result.result) {
      console.log(chalk.bold('\n  Result:'));
      console.log(`    ${JSON.stringify(result.result, null, 2).split('\n').join('\n    ')}`);
    }

    if (result.errorMessage) {
      console.log(chalk.bold('\n  Error:'));
      console.log(`    ${chalk.red(result.errorMessage)}`);
    }

    if (result.steps && result.steps.length > 0) {
      console.log(chalk.bold('\n  Steps:'));
      for (const step of result.steps) {
        const icon = step.status === 'SUCCESS' ? chalk.green('✓') : step.status === 'FAILED' ? chalk.red('✗') : chalk.yellow('○');
        console.log(`    ${icon} ${step.stepName}: ${step.message}`);
      }
    }

    console.log(chalk.gray('─'.repeat(60)));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to query workflow status: ${error.message}`));
    process.exit(1);
  }
}
