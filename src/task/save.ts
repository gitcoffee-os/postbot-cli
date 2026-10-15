import { readFileSync } from 'node:fs';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import {
  TaskApi,
  PlatformApi,
  Platform,
  AccountApi,
  Account,
  ClientApi,
  MediaClient,
  PostbotClient,
} from '@gitcoffee/postbot-sdk';
import { getContentTypeChoices, getPlatformChoices, validatePlatformCodes } from '../platform/registry.js';

export interface SaveTaskOptions {
  name?: string;
  type?: string;
  platforms?: string;
  account?: string;
  accountId?: string;
  contentFile?: string;
  channel?: string;
  /** 目标媒体客户端（id|name|clientKey）。DESKTOP 通道省略时自动解析在线桌面客户端 */
  client?: string;
  scheduledAt?: string;
  maxRetries?: string | number;
  json?: boolean;
  app?: 'postbot' | 'postar';
}

/**
 * 在线判定窗口：引擎 clientHeartbeatTimeoutSeconds=90s，加一个心跳间隔余量取 120s。
 * 引擎不提供 online 布尔字段，只能按 lastOnlineAt 新鲜度推断。
 */
const CLIENT_ONLINE_WINDOW_MS = 120_000;

function isClientOnline(c: MediaClient): boolean {
  if (!c.lastOnlineAt) return false;
  const t = new Date(c.lastOnlineAt).getTime();
  return Number.isFinite(t) && Date.now() - t < CLIENT_ONLINE_WINDOW_MS;
}

function describeClient(c: MediaClient): string {
  return `#${c.id} ${c.name} (${c.type}${isClientOnline(c) ? ', online' : ''})`;
}

/**
 * 解析任务绑定的 mediaClientId。
 *
 * - 显式 --client：按 id / name / clientKey 匹配（离线也允许，任务会等客户端上线后执行）；
 * - DESKTOP 通道缺省：引擎硬性要求 mediaClientId 非空——为空时 Job 编排被**静默跳过**
 *   （任务保存成功但不产生任何 Job），故自动解析在线 desktop 客户端，解析不到直接报错；
 * - 其余通道：无需绑定，返回 undefined。
 *
 * D3 归属校验：Job 按 task.userId 路由给同一账号的客户端认领，
 * 因此桌面端必须与 CLI 登录同一账号，否则任务永远停在 PENDING。
 */
async function resolveMediaClientId(
  apiClient: PostbotClient,
  channel: string | undefined,
  explicit?: string,
): Promise<number | undefined> {
  // 无需绑定的通道：直接跳过（避免多余的 client 列表请求）
  if (!explicit && channel !== 'DESKTOP') return undefined;

  const clientApi = new ClientApi(apiClient);
  let clients: MediaClient[];
  try {
    clients = await clientApi.list();
  } catch (error: any) {
    console.log(chalk.red(`Failed to list media clients: ${error.message}`));
    process.exit(1);
  }

  if (explicit) {
    const found = clients.find(
      (c) => String(c.id) === String(explicit) || c.name === explicit || c.clientKey === explicit,
    );
    if (!found) {
      console.log(chalk.red(`Client not found: ${explicit}`));
      console.log(chalk.gray(`Available: ${clients.map(describeClient).join('; ') || 'none'}`));
      process.exit(1);
    }
    return found.id;
  }

  const onlineDesktops = clients.filter(
    (c) => String(c.type || '').toLowerCase() === 'desktop' && isClientOnline(c),
  );
  if (onlineDesktops.length === 0) {
    console.log(chalk.red('No online desktop client under this account.'));
    console.log(
      chalk.gray(
        'D3 归属校验：桌面端必须与 CLI 登录同一账号（否则 Job 永远不会被认领）。' +
          '请确认桌面端已登录并心跳，或用 --client <id|name|key> 显式指定。',
      ),
    );
    if (clients.length > 0) {
      console.log(chalk.gray(`Known clients: ${clients.map(describeClient).join('; ')}`));
    }
    process.exit(1);
  }
  if (onlineDesktops.length === 1) return onlineDesktops[0].id;

  const { picked } = await inquirer.prompt([
    {
      type: 'list',
      name: 'picked',
      message: 'Multiple online desktop clients — select target:',
      choices: onlineDesktops.map((c) => ({ name: describeClient(c), value: c.id })),
    },
  ]);
  return picked;
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

  // DESKTOP 通道必须绑定 mediaClientId（引擎据此跳过校验；缺省会静默不编排 Job）
  const mediaClientId = await resolveMediaClientId(client, channel, opts.client);

  const payload: Record<string, any> = {
    name: name!,
    type: type!,
    data: JSON.stringify(data),
    isAutoPublish: true,
    mediaAccountId: selectedAccount.id,
    publishChannel: channel || 'CLOUD',
  };

  if (mediaClientId !== undefined) {
    payload.mediaClientId = mediaClientId;
  }

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
    if (mediaClientId !== undefined) {
      console.log(`  Client:        ${chalk.cyan(mediaClientId)}`);
    }
    console.log(`  Status:        ${chalk.yellow(task.status)}`);
    console.log(`  Auto Publish:  ${task.isAutoPublish ? 'Yes' : 'No'}`);
    console.log(chalk.gray('─'.repeat(50)));
  } catch (error: any) {
    saveSpinner.fail(chalk.red(`Failed to save task: ${error.message}`));
    process.exit(1);
  }
}
