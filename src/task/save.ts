import inquirer from 'inquirer';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { loadResources, type ResourceBundle } from '../resources.js';
import { getContentTypeChoices, getPlatform, getPlatformChoices, normalizePlatformCode } from '../platform/registry.js';
import { prepareTask, createTask, type TaskBuildSpec } from './build.js';
import { printTaskDetail, printWarnings } from './format.js';
import { normalizeContentType, type ContentType } from '../constants.js';
import { printJson, printSuccess } from '../output.js';

export interface SaveTaskOptions {
  name?: string;
  type?: string;
  platforms?: string;
  platform?: string;
  account?: string;
  accountId?: string;
  contentFile?: string;
  contentJson?: string;
  title?: string;
  channel?: string;
  client?: string;
  scheduledAt?: string;
  maxRetries?: string;
  contentId?: string;
  config?: string;
  draft?: boolean;
  autoPublish?: boolean;
  allowMissingAccounts?: boolean;
}

export async function taskSave(opts: SaveTaskOptions, global: GlobalOptions): Promise<void> {
  const client = createApiClient(appName(global.app));

  let { name, type, platforms, contentFile, contentJson, channel } = opts;

  const interactive = Boolean(process.stdin.isTTY && !global.json);

  if (!interactive) {
    const missing: string[] = [];
    if (!platforms && !opts.platform) missing.push('--platforms <codes>');
    if (!contentFile && !contentJson) missing.push('--content-file <path> 或 --content <json>');
    if (missing.length > 0) {
      throw new Error(`缺少必要参数: ${missing.join('，')}（非交互环境请显式传入）`);
    }
  }

  let bundle: ResourceBundle | undefined;

  const needsPrompt =
    interactive &&
    (!name || !type || (!platforms && !opts.platform) || (!contentFile && !contentJson) || !channel);
  if (needsPrompt) {
    bundle = await loadResources(client, { withClients: true });

    {
      const answers = await inquirer.prompt<{
        name?: string;
        type?: ContentType;
        platforms?: string[];
        contentFile?: string;
        channel?: string;
      }>(
        [
          {
            type: 'input',
            name: 'name',
            message: '任务名称:',
            when: !name,
          },
          {
            type: 'list',
            name: 'type',
            message: '内容类型:',
            default: 'article',
            choices: getContentTypeChoices(),
            when: !type,
          },
          {
            type: 'checkbox',
            name: 'platforms',
            message: '目标平台:',
            choices: (current: { type?: ContentType }) =>
              platformChoices(bundle!, current.type ?? normalizeContentType(type)),
            validate: (value: string[]) => value.length > 0 || '请至少选择一个平台',
            when: !platforms && !opts.platform,
          },
          {
            type: 'input',
            name: 'contentFile',
            message: '内容 JSON 文件路径:',
            when: !contentFile && !contentJson,
          },
          {
            type: 'list',
            name: 'channel',
            message: '发布通道:',
            default: 'CLOUD',
            choices: ['CLOUD', 'BROWSER_EXTENSION', 'BROWSER_EXTENSION_EPHEMERAL', 'DESKTOP'],
            when: !channel,
          },
        ] as never,
      );

      name = name || answers.name;
      type = type || answers.type;
      platforms = platforms || answers.platforms?.join(',');
      contentFile = contentFile || answers.contentFile;
      channel = channel || answers.channel;
    }
  }

  const spec: TaskBuildSpec = {
    name,
    type,
    platforms,
    platform: opts.platform,
    account: opts.account,
    accountId: opts.accountId,
    client: opts.client,
    channel,
    contentFile,
    contentJson,
    title: opts.title,
    scheduledAt: opts.scheduledAt,
    maxRetries: opts.maxRetries,
    contentId: opts.contentId,
    config: opts.config,
    draft: opts.draft,
    autoPublish: opts.autoPublish,
    allowMissingAccounts: opts.allowMissingAccounts,
  };

  const prepared = await prepareTask(client, spec, bundle);
  printWarnings(prepared.warnings);

  const spinner = global.json ? null : ora('正在保存任务...').start();
  try {
    const task = await createTask(client, prepared);
    spinner?.succeed(`任务已保存（ID ${task.id}）`);

    if (global.json) {
      printJson(task);
      return;
    }

    printTaskDetail(task, {
      platformCodes: prepared.platformCodes,
      clientId: prepared.client?.id,
    });

    if (prepared.autoPublish) {
      const platformCount = prepared.platformCodes.length;
      printSuccess(
        `已编排 ${platformCount} 个平台的发布 Job。` +
          (task.status === 'SCHEDULED' ? ' 定时时间到达后自动执行。' : ' 引擎将尽快调度。'),
      );
      console.log(`  查看状态: postbot status ${task.id}`);
    } else {
      printSuccess('已保存为草稿（DRAFT），不会触发发布。');
      console.log(`  手动发布: postbot task update ${task.id} --auto-publish --status PENDING`);
    }
  } catch (error) {
    spinner?.fail('保存任务失败');
    throw error;
  }
}

export function platformChoices(bundle: ResourceBundle, type?: ContentType) {
  const platforms = bundle.platforms
    .filter((platform) => {
      const meta = getPlatform(platform.code);
      // 静态注册表未知的平台保留；已知平台按内容类型过滤
      return !meta || !type || meta.contentTypes.includes(type);
    })
    .sort((a, b) => Number(a.sort ?? 9999) - Number(b.sort ?? 9999) || String(a.code).localeCompare(String(b.code)))
    .map((platform) => ({
      name: `${platform.name || platform.code} (${normalizePlatformCode(platform.code)})`,
      value: normalizePlatformCode(platform.code),
    }));

  if (platforms.length > 0) return platforms;

  return getPlatformChoices(type);
}
