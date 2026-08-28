import { readFileSync } from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import { TaskApi, AccountApi, PlatformApi } from '@gitcoffee/postbot-sdk';
import { validatePlatformCodes } from '../platform/registry.js';

interface BatchTaskInput {
  name: string;
  type?: string;
  platformCodes?: string[];
  platformCode?: string;
  accountUsername?: string;
  accountId?: number;
  content: Record<string, any>;
  publishChannel?: string;
  scheduledAt?: string;
}

export async function batchPublish(opts: {
  file?: string;
  channel?: string;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const taskApi = new TaskApi(client);

  if (!opts.file) {
    console.log(chalk.red('File is required: --file <path>'));
    process.exit(1);
  }

  let tasks: BatchTaskInput[];
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

  const spinner = ora(`Loading accounts and platforms...`).start();
  const [accountList, platformList] = await Promise.all([
    new AccountApi(client).list(),
    new PlatformApi(client).list(),
  ]);
  spinner.stop();

  const results: Array<{ index: number; success: boolean; taskId?: number; error?: string }> = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const index = i + 1;
    const taskSpinner = ora(`Processing task ${index}/${tasks.length}: ${task.name || 'Unnamed'}`).start();

    try {
      const payload = await buildTaskPayload(task, accountList, platformList, opts.channel);
      const saved = await taskApi.create(payload);
      results.push({ index, success: true, taskId: saved.id });
      taskSpinner.succeed(chalk.green(`Task ${index} saved (ID: ${saved.id})`));
    } catch (error: any) {
      results.push({ index, success: false, error: error.message });
      taskSpinner.fail(chalk.red(`Task ${index} failed: ${error.message}`));
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  console.log(chalk.bold('\nResult:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  Success: ${chalk.green(successCount)}`);
  console.log(`  Failed:  ${chalk.red(failCount)}`);
  console.log(`  Total:   ${results.length}`);
  console.log(chalk.gray('─'.repeat(50)));

  if (failCount > 0) {
    process.exit(1);
  }
}

async function buildTaskPayload(
  task: BatchTaskInput,
  accountList: Array<{ id: number; username?: string }>,
  platformList: Array<{ id: number; code: string }>,
  defaultChannel?: string
): Promise<Record<string, any>> {
  if (!task.name) {
    throw new Error('Task name is required');
  }

  const platformCodes = task.platformCodes
    || (task.platformCode ? [task.platformCode] : []);

  if (platformCodes.length === 0) {
    throw new Error('platformCodes or platformCode is required');
  }

  const { valid, invalid, unsupported } = validatePlatformCodes(platformCodes, task.type as any);
  if (invalid.length > 0) {
    throw new Error(`Invalid platform codes: ${invalid.join(', ')}`);
  }
  if (unsupported.length > 0) {
    throw new Error(`Platform codes not supported for type '${task.type}': ${unsupported.join(', ')}`);
  }
  if (valid.length === 0) {
    throw new Error('No valid platform codes provided');
  }

  let accountId = task.accountId;
  if (!accountId && task.accountUsername) {
    const account = accountList.find(a => a.username === task.accountUsername);
    if (!account) {
      throw new Error(`Account not found: ${task.accountUsername}`);
    }
    accountId = account.id;
  }

  if (!accountId) {
    throw new Error('accountId or accountUsername is required');
  }

  const primaryPlatform = platformList.find(p => p.code === platformCodes[0]);

  const data = {
    ...task.content,
    platformCodes,
    onlineTime: task.scheduledAt || task.content?.onlineTime || '',
  };

  return {
    name: task.name,
    type: task.type || 'article',
    data: JSON.stringify(data),
    isAutoPublish: true,
    maxRetryCount: 0,
    mediaAccountId: accountId,
    publishChannel: task.publishChannel || defaultChannel || 'CLOUD',
    ...(primaryPlatform ? { mediaPlatformId: primaryPlatform.id } : {}),
  };
}
