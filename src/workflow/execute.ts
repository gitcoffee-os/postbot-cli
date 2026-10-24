import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WorkflowApi } from '@gitcoffee-os/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import { parseJsonInput, type GlobalOptions } from '../cli.js';
import { printJson } from '../output.js';
import { printWorkflowResult } from './format.js';

export interface WorkflowExecuteOptions {
  input?: string;
  inputFile?: string;
  taskId?: string;
  output?: boolean;
}

export async function workflowExecute(
  workflowType: string,
  opts: WorkflowExecuteOptions,
  global: GlobalOptions,
): Promise<void> {
  if (!workflowType) throw new Error('缺少 workflowType');
  if (opts.input && opts.inputFile) throw new Error('--input 与 --input-file 不能同时使用');

  let input: Record<string, any> = {};
  if (opts.input !== undefined) {
    const parsed = parseJsonInput(opts.input, '--input');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('--input 必须是 JSON 对象');
    }
    input = parsed as Record<string, any>;
  } else if (opts.inputFile) {
    const path = resolve(opts.inputFile);
    let text: string;
    try {
      text = readFileSync(path, 'utf-8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`无法读取输入文件 ${path}: ${message}`);
    }
    const parsed = parseJsonInput(text, path);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${path} 必须是 JSON 对象`);
    }
    input = parsed as Record<string, any>;
  }

  if (opts.taskId !== undefined) {
    const taskId = Number(opts.taskId);
    if (!Number.isInteger(taskId) || taskId < 1) throw new Error('--task-id 必须是正整数');
    input.taskId = taskId;
  }

  if (Object.keys(input).length === 0) {
    throw new Error('缺少工作流输入：请使用 --input <json>、--input-file <path> 或 --task-id <id>');
  }

  const client = createApiClient(appName(global.app));
  const result = await new WorkflowApi(client).executeWorkflow(workflowType, input);

  if (global.json) {
    printJson(result);
    return;
  }
  printWorkflowResult(result, { output: opts.output });
}
