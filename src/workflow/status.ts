import { WorkflowApi } from '@gitcoffee-os/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { printJson } from '../output.js';
import { printWorkflowResult } from './format.js';

export async function workflowStatus(
  executionId: string,
  opts: { output?: boolean },
  global: GlobalOptions,
): Promise<void> {
  if (!executionId) throw new Error('缺少 executionId');

  const client = createApiClient(appName(global.app));
  const result = await new WorkflowApi(client).getExecutionStatus(executionId);

  if (global.json) {
    printJson(result);
    return;
  }
  printWorkflowResult(result, { output: opts.output });
}
