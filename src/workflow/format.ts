import chalk from 'chalk';
import type { WorkflowExecutionResult } from '@gitcoffee/postbot-sdk';
import { printHeading, printJson, printKeyValues, printTable } from '../output.js';

export function printWorkflowResult(
  result: WorkflowExecutionResult,
  options: { output?: boolean } = {},
): void {
  printHeading('工作流执行结果');
  printKeyValues([
    ['Execution ID', result.executionId],
    ['Workflow', result.workflowType],
    ['状态', result.status],
    ['错误', result.errorMessage],
  ]);

  if (result.steps?.length) {
    printHeading('步骤');
    printTable(
      [
        { header: '步骤', maxWidth: 34 },
        { header: '状态', maxWidth: 12 },
        { header: '消息', maxWidth: 60 },
      ],
      result.steps.map((step) => [step.stepName, step.status, step.message]),
    );

    if (options.output) {
      for (const step of result.steps) {
        if (step.output === undefined) continue;
        console.log(chalk.gray(`\n[${step.stepName}] output:`));
        printJson(step.output);
      }
    }
  }

  printHeading('Result');
  printJson(result.result ?? {});
}
