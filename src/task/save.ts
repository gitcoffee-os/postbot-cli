import { readFileSync } from 'node:fs';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import { TaskApi, PlatformApi, Platform, AccountApi, Account } from '@gitcoffee/postbot-sdk';
import { getContentTypeChoices, getPlatformChoices, validatePlatformCodes } from '../platform/registry.js';

export interface SaveTaskOptions {
  name?: string;
  type?: string;
  platforms?: string;
  account?: string;
  accountId?: string;
  contentFile?: string;
  channel?: string;
  scheduledAt?: string;
  maxRetries?: string | number;
  json?: boolean;
  app?: 'postbot' | 'postar';
}

export async function taskSave(opts: SaveTaskOptions) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const taskApi = new TaskApi(client);

  let { name, type, platforms, account, accountId, contentFile, channel, scheduledAt, maxRetries } = opts;

  const spinner = ora('Loading platforms and accounts...').start();
  let platformList: Platform[] = [];
  let accountList: Account[] = [];
  try {
    const platformApi = new PlatformApi(client);
    const accountApi = new AccountApi(client);
    [platformList, accountList] = await Promise.all([platformApi.list(), accountApi.list()]);
    spinner.stop();
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to load data: ${error.message}`));
    process.exit(1);
  }

  if (!name || !type || !platforms || (!account && !accountId) || !contentFile) {
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
        when: !platforms,
      },
      {
        type: 'list',
        name: 'account',
        message: 'Primary account username:',
        choices: accountList.map(a => ({ name: `${a.username} (${a.name || 'N/A'})`, value: a.username })),
        when: !account && !accountId,
      },
      {
        type: 'input',
        name: 'contentFile',
        message: 'Content file path (JSON):',
        when: !contentFile,
      },
      {
        type: 'list',
        name: 'channel',
        message: 'Publish channel:',
        choices: ['CLOUD', 'BROWSER_EXTENSION', 'DESKTOP'],
        default: 'CLOUD',
        when: !channel,
      },
      {
        type: 'input',
        name: 'scheduledAt',
        message: 'Scheduled publish time (ISO 8601, optional):',
        when: !scheduledAt,
      },
    ] as any);

    name = name || answers.name;
    type = type || answers.type;
    platforms = platforms || answers.platforms?.join(',');
    account = account || answers.account;
    contentFile = contentFile || answers.contentFile;
    channel = channel || answers.channel;
    scheduledAt = scheduledAt || answers.scheduledAt;
  }

  if (!platforms || platforms.length === 0) {
    console.log(chalk.red('At least one platform is required'));
    process.exit(1);
  }

  let selectedAccount: Account | undefined;
  if (accountId) {
    selectedAccount = accountList.find(a => String(a.id) === String(accountId));
    if (!selectedAccount) {
      console.log(chalk.red(`Account not found by ID: ${accountId}`));
      process.exit(1);
    }
  } else {
    selectedAccount = accountList.find(a => a.username === account);
    if (!selectedAccount) {
      console.log(chalk.red(`Account not found: ${account}`));
      process.exit(1);
    }
  }

  let content: Record<string, any>;
  try {
    const raw = readFileSync(contentFile!, 'utf-8');
    content = JSON.parse(raw);
  } catch (error: any) {
    console.log(chalk.red(`Failed to read content file: ${error.message}`));
    process.exit(1);
  }

  const platformCodes = platforms.split(',').map(c => c.trim()).filter(Boolean);
  const { valid, invalid, unsupported } = validatePlatformCodes(platformCodes, type as any);
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

  const primaryPlatform = platformList.find(p => p.code === platformCodes[0]);

  const data = {
    ...content,
    platformCodes,
    onlineTime: scheduledAt || content.onlineTime || '',
  };

  const payload: Record<string, any> = {
    name: name!,
    type: type!,
    data: JSON.stringify(data),
    isAutoPublish: true,
    mediaAccountId: selectedAccount.id,
    publishChannel: channel || 'CLOUD',
  };

  if (primaryPlatform) {
    payload.mediaPlatformId = primaryPlatform.id;
  }

  if (maxRetries !== undefined) {
    payload.maxRetryCount = Number(maxRetries);
  }

  const saveSpinner = ora('Saving task...').start();
  try {
    const task = await taskApi.create(payload);
    saveSpinner.succeed(chalk.green('Task saved!'));

    if (opts.json) {
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    console.log(chalk.bold('\nTask Detail:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  ID:            ${chalk.cyan(task.id)}`);
    console.log(`  Name:          ${chalk.cyan(task.name)}`);
    console.log(`  Type:          ${chalk.cyan(task.type)}`);
    console.log(`  Platforms:     ${chalk.cyan(platformCodes.join(', '))}`);
    console.log(`  Primary Acc:   ${chalk.cyan(task.mediaAccountId)}`);
    console.log(`  Channel:       ${chalk.cyan(task.publishChannel || 'N/A')}`);
    console.log(`  Status:        ${chalk.yellow(task.status)}`);
    console.log(`  Auto Publish:  ${task.isAutoPublish ? 'Yes' : 'No'}`);
    console.log(chalk.gray('─'.repeat(50)));
  } catch (error: any) {
    saveSpinner.fail(chalk.red(`Failed to save task: ${error.message}`));
    process.exit(1);
  }
}
