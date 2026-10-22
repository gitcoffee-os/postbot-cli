import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { TaskApi } from '@gitcoffee/postbot-sdk';
import { printJson, printSuccess } from '../output.js';

/**
 * 幂等绑定内容 ID。
 * 引擎行为：task.contentId 已非空时返回既有值，不覆盖；为空时先到先得写入。
 */
export async function taskBindContent(
  taskId: string,
  contentId: string,
  global: GlobalOptions,
): Promise<void> {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`任务 ID 非法: ${taskId}`);
  if (!contentId || !contentId.trim()) throw new Error('contentId 不能为空');

  const client = createApiClient(appName(global.app));
  const bound = await new TaskApi(client).bindContent(id, contentId.trim());

  if (global.json) {
    printJson({ taskId: id, contentId: bound });
    return;
  }
  if (bound && bound !== contentId.trim()) {
    console.log(`任务已绑定其他内容 ID，保持原值: ${bound}`);
    return;
  }
  printSuccess(`任务 ${id} 已绑定内容 ID: ${bound ?? contentId.trim()}`);
}
