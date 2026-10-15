import chalk from 'chalk';
import { appName, createApiClient } from '../config.js';
import { TaskApi } from '@gitcoffee/postbot-sdk';

export async function taskUpdate(opts: {
  taskId?: string;
  name?: string;
  status?: string;
  scheduledAt?: string;
  maxRetries?: string;
  json?: boolean;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const taskApi = new TaskApi(client);

  if (!opts.taskId) {
    console.log(chalk.red('Task ID is required'));
    process.exit(1);
  }

  const taskId = Number(opts.taskId);

  try {
    const existing = await taskApi.get(taskId);

    // 引擎 /update 为「整实体重建 + 覆盖」语义：请求缺省的 type / publishChannel / status
    // 会被 fillPublishParams 归一成非空默认值（article / CLOUD / PENDING|DRAFT）并落库，
    // 部分字段更新会静默破坏 DESKTOP 任务。因此先 GET 现有全量，仅覆盖显式指定的值。
    const updateData: Record<string, any> = {
      name: opts.name ?? existing.name,
      type: existing.type,
      data: existing.data,
      mediaPlatformId: existing.mediaPlatformId,
      mediaAccountId: existing.mediaAccountId,
      mediaClientId: existing.mediaClientId,
      contentId: (existing as any).contentId,
      isAutoPublish: existing.isAutoPublish,
      publishChannel: existing.publishChannel,
      scheduledAt: opts.scheduledAt ?? existing.scheduledAt,
      maxRetryCount: opts.maxRetries !== undefined ? Number(opts.maxRetries) : existing.maxRetryCount,
      status: opts.status ?? existing.status,
      config: (existing as any).config,
    };

    // platformCodes 须以顶层数组回传（与 data.platformCodes 合并去重），
    // 否则仅存在于任务列、不在 data 内的平台会在重算时丢失
    if (existing.platformCodes) {
      try {
        updateData.platformCodes = JSON.parse(existing.platformCodes);
      } catch {
        // 忽略非法存量值，交给引擎按 data.platformCodes 重算
      }
    }

    const hasOverride =
      opts.name !== undefined || opts.status !== undefined ||
      opts.scheduledAt !== undefined || opts.maxRetries !== undefined;
    if (!hasOverride) {
      console.log(chalk.yellow('No fields to update. Use --name, --status, --scheduled-at, or --max-retries.'));
      process.exit(1);
    }

    // 引擎 /update 返回体不带 data（ExmayResult.success()），展示用本地值
    await taskApi.update(taskId, updateData);

    if (opts.json) {
      console.log(JSON.stringify({ id: taskId, ...updateData }, null, 2));
      return;
    }

    console.log(chalk.green(`Task ${taskId} updated successfully.`));
    console.log(`  Name:     ${chalk.cyan(String(updateData.name ?? ''))}`);
    console.log(`  Status:   ${chalk.yellow(String(updateData.status ?? ''))}`);
    console.log(`  Channel:  ${chalk.cyan(String(updateData.publishChannel ?? ''))}`);
  } catch (error: any) {
    console.log(chalk.red(`Failed to update task: ${error.message}`));
    process.exit(1);
  }
}
