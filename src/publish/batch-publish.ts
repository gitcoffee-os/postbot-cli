import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { loadResources } from '../resources.js';
import { prepareTask, createTask, type TaskBuildSpec } from '../task/build.js';
import { printJson, printKeyValues, printTable, printWarning } from '../output.js';

interface BatchTaskInput extends Record<string, any> {
  name?: string;
  type?: string;
  platforms?: string | string[];
  platformCodes?: string[];
  platformCode?: string;
  platform?: string;
  account?: string;
  accountUsername?: string;
  accountId?: number | string;
  channel?: string;
  publishChannel?: string;
  client?: string;
  content?: Record<string, any> | string;
  contentFile?: string;
  title?: string;
  scheduledAt?: string;
  onlineTime?: string;
  maxRetryCount?: number;
  maxRetries?: number;
  contentId?: string;
  config?: string;
  autoPublish?: boolean;
  draft?: boolean;
}

interface BatchFile {
  defaults?: BatchTaskInput;
  tasks?: BatchTaskInput[];
}

export interface BatchPublishOptions {
  file?: string;
  channel?: string;
  dryRun?: boolean;
  failFast?: boolean;
  json?: boolean;
  app?: string;
}

interface BatchResult {
  index: number;
  name?: string;
  platforms?: string[];
  success: boolean;
  taskId?: number;
  status?: string;
  warnings?: string[];
  error?: string;
}

export async function batchPublish(opts: BatchPublishOptions, global: GlobalOptions): Promise<void> {
  if (!opts.file) {
    throw new Error('缺少 --file <path>');
  }

  const filePath = resolve(opts.file);
  const baseDir = dirname(filePath);
  const parsed = parseBatchFile(filePath);
  const defaults = parsed.defaults ?? {};
  const tasks = parsed.tasks ?? [];

  if (tasks.length === 0) {
    throw new Error(`批量文件中没有任务: ${filePath}`);
  }

  const client = createApiClient(appName(global.app));
  const bundle = await loadResources(client, { withClients: true });

  const results: BatchResult[] = [];
  const preparedPayloads: Array<{ index: number; payload: unknown; platforms: string[] }> = [];

  const spinner = global.json || opts.dryRun ? null : ora(`处理 ${tasks.length} 个任务...`).start();

  for (let index = 0; index < tasks.length; index += 1) {
    const raw = { ...defaults, ...tasks[index] };
    const label = raw.name || `#${index + 1}`;
    if (spinner) spinner.text = `处理 ${index + 1}/${tasks.length}: ${label}`;

    try {
      const spec = toBuildSpec(raw, baseDir, opts.channel);
      const prepared = await prepareTask(client, spec, bundle);

      if (opts.dryRun) {
        preparedPayloads.push({
          index: index + 1,
          payload: prepared.payload,
          platforms: prepared.platformCodes,
        });
        results.push({
          index: index + 1,
          name: raw.name,
          platforms: prepared.platformCodes,
          success: true,
          status: 'DRY_RUN',
          warnings: prepared.warnings,
        });
        continue;
      }

      const task = await createTask(client, prepared);
      results.push({
        index: index + 1,
        name: task.name,
        platforms: prepared.platformCodes,
        success: true,
        taskId: task.id,
        status: task.status,
        warnings: prepared.warnings,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ index: index + 1, name: raw.name, success: false, error: message });
      if (opts.failFast) {
        spinner?.fail(`任务 ${index + 1} 失败，已停止`);
        break;
      }
    }
  }

  spinner?.stop();

  if (opts.dryRun) {
    const failed = results.filter((result) => !result.success);
    if (global.json) {
      printJson({ dryRun: true, tasks: preparedPayloads, failed });
      if (failed.length > 0) process.exitCode = 1;
      return;
    }
    console.log(chalk.bold(`\nDry run: ${preparedPayloads.length} 个任务（未保存）`));
    for (const item of preparedPayloads) {
      console.log(chalk.gray(`\n#${item.index} ${item.platforms.join(', ')}`));
      console.log(JSON.stringify(item.payload, null, 2));
    }
    printResultSummary(results);
    if (failed.length > 0) process.exitCode = 1;
    return;
  }

  if (global.json) {
    printJson(results);
    if (results.some((result) => !result.success)) process.exitCode = 1;
    return;
  }

  printResultTable(results);
  printResultSummary(results);

  const failed = results.filter((result) => !result.success).length;
  if (failed > 0) {
    process.exitCode = 1;
  }
}

function parseBatchFile(path: string): BatchFile {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`无法读取批量文件 ${path}: ${message}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`批量文件不是合法 JSON: ${message}`);
  }

  if (Array.isArray(data)) return { tasks: data as BatchTaskInput[] };
  if (data && typeof data === 'object') {
    const file = data as BatchFile;
    if (Array.isArray(file.tasks)) return file;
  }
  throw new Error('批量文件格式应为数组，或 {"defaults": {...}, "tasks": [...]}');
}

function toBuildSpec(input: BatchTaskInput, baseDir: string, defaultChannel?: string): TaskBuildSpec {
  const platforms =
    input.platforms ??
    input.platformCodes ??
    input.platformCode ??
    input.platform;

  let content = input.content;
  let contentJson: string | undefined;
  if (typeof content === 'string') {
    contentJson = content;
    content = undefined;
  }

  return {
    name: input.name,
    type: input.type,
    platforms,
    account: input.account ?? input.accountUsername,
    accountId: input.accountId,
    client: input.client ?? (input.mediaClientId !== undefined ? String(input.mediaClientId) : undefined),
    channel: input.channel ?? input.publishChannel ?? defaultChannel,
    content,
    contentJson,
    contentFile: input.contentFile,
    title: input.title,
    scheduledAt: input.scheduledAt ?? input.onlineTime,
    maxRetries: input.maxRetryCount ?? input.maxRetries,
    contentId: input.contentId,
    config: input.config,
    autoPublish: input.autoPublish,
    draft: input.draft,
    baseDir,
  };
}

function printResultTable(results: BatchResult[]): void {
  printTable(
    [
      { header: '#', align: 'right' },
      { header: '任务', maxWidth: 24 },
      { header: '平台', maxWidth: 32 },
      { header: '状态' },
      { header: '任务 ID', align: 'right' },
      { header: '错误', maxWidth: 40 },
    ],
    results.map((result) => [
      result.index,
      result.name,
      result.platforms?.join(', '),
      result.success ? result.status ?? 'OK' : 'FAILED',
      result.taskId,
      result.error,
    ]),
  );
}

function printResultSummary(results: BatchResult[]): void {
  const success = results.filter((result) => result.success).length;
  const failed = results.length - success;
  console.log('');
  printKeyValues([
    ['成功', success],
    ['失败', failed],
    ['总数', results.length],
  ]);
  for (const result of results) {
    for (const warning of result.warnings ?? []) {
      printWarning(`#${result.index} ${warning}`);
    }
  }
}
