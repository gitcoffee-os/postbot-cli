import { readFileSync } from 'node:fs';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import { WorkflowApi, WorkflowExecutionResult, PlatformApi, Platform, AccountApi, Account } from '@gitcoffee/postbot-sdk';

export async function quickPublish(opts: {
  name?: string;
  type?: string;
  platform?: string;
  account?: string;
  contentFile?: string;
  channel?: string;
  scheduledAt?: string;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const workflowApi = new WorkflowApi(client);

  let { name, type, platform, account, contentFile, channel, scheduledAt } = opts;

  if (!name || !type || !platform || !account) {
    const platformApi = new PlatformApi(client);
    const accountApi = new AccountApi(client);

    let platforms: Platform[] = [];
    let accounts: Account[] = [];

    const spinner = ora('Loading platforms and accounts...').start();
    try {
      [platforms, accounts] = await Promise.all([platformApi.list(), accountApi.list()]);
      spinner.stop();
    } catch (error: any) {
      spinner.fail(chalk.red(`Failed to load data: ${error.message}`));
      process.exit(1);
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Task name:',
        when: !name,
      },
      {
        type: 'list',
        name: 'type',
        message: 'Content type:',
        choices: ['article', 'moment', 'video', 'audio'],
        when: !type,
      },
      {
        type: 'list',
        name: 'platform',
        message: 'Platform:',
        choices: platforms.map(p => ({ name: `${p.name} (${p.code})`, value: p.code })),
        when: !platform,
      },
      {
        type: 'list',
        name: 'account',
        message: 'Account:',
        choices: accounts.map(a => ({ name: `${a.username} (${a.name || 'N/A'})`, value: a.username })),
        when: !account,
      },
      {
        type: 'list',
        name: 'channel',
        message: 'Publish channel:',
        choices: ['CLOUD', 'BROWSER_EXTENSION', 'DESKTOP'],
        default: 'CLOUD',
        when: !channel,
      },
    ]);

    name = name || answers.name;
    type = type || answers.type;
    platform = platform || answers.platform;
    account = account || answers.account;
    channel = channel || answers.channel;
  }

  if (!contentFile) {
    const { contentFile: cf } = await inquirer.prompt([{
      type: 'input',
      name: 'contentFile',
      message: 'Content file path (JSON):',
    }]);
    contentFile = cf;
  }

  let content: any;
  try {
    const raw = readFileSync(contentFile!, 'utf-8');
    content = JSON.parse(raw);
  } catch (error: any) {
    console.log(chalk.red(`Failed to read content file: ${error.message}`));
    process.exit(1);
  }

  const spinner = ora('Publishing...').start();

  try {
    const result = await workflowApi.executeWorkflow('QUICK_PUBLISH', {
      name,
      type,
      platformCode: platform,
      accountUsername: account,
      publishChannel: channel || 'CLOUD',
      content,
      scheduledAt,
    });

    spinner.succeed(chalk.green('Publish workflow executed!'));

    console.log(chalk.bold('\nResult:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  Execution ID: ${chalk.cyan(result.executionId)}`);
    console.log(`  Status:       ${chalk.yellow(result.status)}`);
    if (result.result?.taskId) {
      console.log(`  Task ID:      ${chalk.cyan(result.result.taskId)}`);
    }
    if (result.result?.jobId) {
      console.log(`  Job ID:       ${chalk.cyan(result.result.jobId)}`);
    }
    console.log(chalk.gray('─'.repeat(50)));

    if (result.steps) {
      console.log(chalk.bold('\nSteps:'));
      for (const step of result.steps) {
        const icon = step.status === 'SUCCESS' ? chalk.green('✓') : step.status === 'FAILED' ? chalk.red('✗') : chalk.yellow('○');
        console.log(`  ${icon} ${step.stepName}: ${step.message}`);
      }
    }
  } catch (error: any) {
    spinner.fail(chalk.red(`Publish failed: ${error.message}`));
    process.exit(1);
  }
}
