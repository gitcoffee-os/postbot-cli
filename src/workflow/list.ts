import { WorkflowApi } from '@gitcoffee-os/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { printJson, printTable } from '../output.js';

export async function workflowList(global: GlobalOptions): Promise<void> {
  const client = createApiClient(appName(global.app));
  const definitions = await new WorkflowApi(client).listDefinitions();

  if (global.json) {
    printJson(definitions);
    return;
  }

  console.log(`\n可用工作流（${definitions.length} 个）`);
  printTable([{ header: 'Workflow Type', maxWidth: 60 }], definitions.map((name) => [name]));
}
