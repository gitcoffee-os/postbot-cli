import { readFileSync } from 'node:fs';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import { WorkflowApi, WorkflowExecutionResult, PlatformApi, Platform, AccountApi, Account, TaskApi } from '@gitcoffee/postbot-sdk';
import { getContentTypeChoices, getPlatformChoices, validatePlatformCodes } from '../platform/registry.js';

export async function quickPublish(opts: {
  name?: string;
  type?: string;
  platform?: string;
  platforms?: string;
  account?: string;
  contentFile?: string;
  channel?: string;
  scheduledAt?: string;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const workflowApi = new WorkflowApi(client);

  let { name, type, platform, platforms, account, contentFile, channel, scheduledAt } = opts;

  if (!name || !type || (!platform && !platforms) || !account) {
    const platformApi = new PlatformApi(client);
    const accountApi = new AccountApi(client);

    let platformList: Platform[] = [];
    let accountList: Account[] = [];

    const spinner = ora('Loading platforms and accounts...').start();
    try {
      [platformList, accountList] = await Promise.all([platformApi.list(), accountApi.list()]);
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
        choices: getContentTypeChoices(),
        when: !type,
      },
      {
        type: 'checkbox',
        name: 'platforms',
        message: 'Select target platforms:',
        choices(answers: any) {
          return getPlatformChoices(answers.type || type);
        },
        validate: (value: string[]) => value.length > 0 || 'Please select at least one platform',
        when: !platform && !platforms,
      },
      {
        type: 'list',
        name: 'account',
        message: 'Account:',
        choices: accountList.map(a => ({ name: `${a.username} (${a.name || 'N/A'})`, value: a.username })),
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
    ] as any);

    name = name || answers.name;
    type = type || answers.type;
    platforms = platforms || answers.platforms?.join(',');
    account = account || answers.account;
    channel = channel || answers.channel;
  }

  const selectedPlatforms = (platforms || platform || '')
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);

  if (selectedPlatforms.length === 0) {
    console.log(chalk.red('At least one platform is required'));
    process.exit(1);
  }

  const { valid, invalid, unsupported } = validatePlatformCodes(selectedPlatforms, type as any);
  if (invalid.length > 0) {
    console.log(chalk.red(`Invalid platform codes: ${invalid.join(', ')}`));
    process.exit(1);
  }
  if (unsupported.length > 0) {
    console.log(chalk.red(`Platform codes not supported for type '${type}': ${unsupported.join(', ')}`));
    process.exit(1);
  }
  if (valid.length === 0) {
    console.log(chalk.red('No valid platform codes provided'));
    process.exit(1);
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
    let result: WorkflowExecutionResult;

    if (selectedPlatforms.length === 1) {
      // 单平台：继续走工作流，保持原有行为
      result = await workflowApi.executeWorkflow('QUICK_PUBLISH', {
        name,
        type,
        platformCode: selectedPlatforms[0],
        accountUsername: account,
        publishChannel: channel || 'CLOUD',
        content,
        scheduledAt,
      });

      spinner.succeed(chalk.green('Publish workflow executed!'));
      printWorkflowResult(result);
    } else {
      // 多平台：直接保存任务，由后端自动发布
      result = await saveMultiPlatformTask(client, {
        name: name!,
        type: type!,
        platformCodes: selectedPlatforms,
        accountUsername: account!,
        publishChannel: channel || 'CLOUD',
        content,
        scheduledAt,
      });

      spinner.succeed(chalk.green('Multi-platform task saved!'));
      printMultiPlatformResult(result);
    }
  } catch (error: any) {
    spinner.fail(chalk.red(`Publish failed: ${error.message}`));
    process.exit(1);
  }
}

async function saveMultiPlatformTask(
  client: any,
  opts: {
    name: string;
    type: string;
    platformCodes: string[];
    accountUsername: string;
    publishChannel: string;
    content: any;
    scheduledAt?: string;
  }
): Promise<WorkflowExecutionResult> {
  const accountApi = new AccountApi(client);
  const platformApi = new PlatformApi(client);

  const [accountList, platformList] = await Promise.all([
    accountApi.list(),
    platformApi.list(),
  ]);

  const account = accountList.find(a => a.username === opts.accountUsername);
  if (!account) {
    throw new Error(`Account not found: ${opts.accountUsername}`);
  }

  const primaryPlatform = platformList.find(p => p.code === opts.platformCodes[0]);

  const data = {
    ...opts.content,
    platformCodes: opts.platformCodes,
    onlineTime: opts.scheduledAt || opts.content.onlineTime || '',
  };

  const taskApi = new TaskApi(client);
  const task = await taskApi.create({
    name: opts.name,
    type: opts.type,
    data: JSON.stringify(data),
    isAutoPublish: true,
    maxRetryCount: 0,
    mediaAccountId: account.id,
    publishChannel: opts.publishChannel,
    ...(primaryPlatform ? { mediaPlatformId: primaryPlatform.id } : {}),
  });

  return {
    executionId: '',
    workflowType: 'DIRECT_SAVE',
    status: 'SUCCESS',
    result: {
      taskId: task.id,
      platformCount: opts.platformCodes.length,
      platformCodes: opts.platformCodes,
    },
    steps: [],
  };
}

function printWorkflowResult(result: WorkflowExecutionResult) {
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
}

function printMultiPlatformResult(result: WorkflowExecutionResult) {
  console.log(chalk.bold('\nResult:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  Task ID:       ${chalk.cyan(result.result.taskId)}`);
  console.log(`  Platforms:     ${chalk.cyan(result.result.platformCount)}`);
  console.log(`  PlatformCodes: ${chalk.cyan(result.result.platformCodes.join(', '))}`);
  console.log(`  Status:        ${chalk.yellow(result.status)}`);
  console.log(chalk.gray('─'.repeat(50)));
}
