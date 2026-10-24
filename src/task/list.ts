import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { TaskApi, type Task } from '@gitcoffee-os/postbot-sdk';
import { formatDateTime, formatPlatformCodes, printJson, printTable } from '../output.js';
import { normalizePlatformCode } from '../platform/registry.js';

export interface TaskListOptions {
  page?: string;
  size?: string;
  status?: string;
  platform?: string;
  search?: string;
  all?: boolean;
}

/**
 * 任务列表。
 *
 * 引擎 `/task/list` 只支持分页，`status` 过滤不在服务端实现；
 * 因此带筛选条件时先取 `/task/listing` 全量，再在 CLI 侧过滤/分页。
 */
export async function taskList(opts: TaskListOptions, global: GlobalOptions): Promise<void> {
  const client = createApiClient(appName(global.app));
  const taskApi = new TaskApi(client);

  const page = Number(opts.page ?? 1);
  const size = Number(opts.size ?? 20);
  if (!Number.isInteger(page) || page < 1) throw new Error('--page 必须是 >= 1 的整数');
  if (!Number.isInteger(size) || size < 1 || size > 200) throw new Error('--size 必须是 1-200 的整数');

  const hasFilter = Boolean(opts.status || opts.platform || opts.search);
  let tasks: Task[];
  let total: number;

  if (opts.all || hasFilter) {
    tasks = await taskApi.listAll();
    if (opts.status) {
      const status = opts.status.toUpperCase();
      tasks = tasks.filter((task) => String(task.status ?? '').toUpperCase() === status);
    }
    if (opts.platform) {
      const platform = normalizePlatformCode(opts.platform);
      tasks = tasks.filter((task) => {
        try {
          const codes = JSON.parse(task.platformCodes ?? '[]');
          return (
            Array.isArray(codes) &&
            codes.some((code) => normalizePlatformCode(String(code)) === platform)
          );
        } catch {
          return false;
        }
      });
    }
    if (opts.search) {
      const keyword = opts.search.toLowerCase();
      tasks = tasks.filter(
        (task) =>
          String(task.name ?? '').toLowerCase().includes(keyword) ||
          String(task.id).includes(keyword),
      );
    }
    total = tasks.length;
  } else {
    const result = await taskApi.list({ page, size });
    tasks = result.list;
    total = result.total;
  }

  const paginated = opts.all || hasFilter
    ? paginate(tasks, opts.all ? 1 : page, opts.all ? Math.max(tasks.length, 1) : size)
    : tasks;

  const payload = {
    list: paginated,
    total,
    current: opts.all ? 1 : page,
    size: opts.all ? Math.max(total, 1) : size,
    pages: opts.all ? 1 : Math.max(1, Math.ceil(total / size)),
  };

  if (global.json) {
    printJson(payload);
    return;
  }

  if (paginated.length === 0) {
    console.log('暂无任务。');
    return;
  }

  console.log(
    `\n任务（第 ${payload.current}/${payload.pages} 页，共 ${payload.total} 条）`,
  );
  printTable(
    [
      { header: 'ID', align: 'right' },
      { header: '名称', maxWidth: 28 },
      { header: '平台', maxWidth: 34 },
      { header: '类型', maxWidth: 8 },
      { header: '状态', maxWidth: 16 },
      { header: '通道', maxWidth: 16 },
      { header: '定时', maxWidth: 19 },
    ],
    paginated.map((task) => [
      task.id,
      task.name,
      formatPlatformCodes(task.platformCodes),
      task.type,
      task.status,
      task.publishChannel,
      formatDateTime(task.scheduledAt),
    ]),
  );
}

function paginate<T>(items: T[], page: number, size: number): T[] {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}
