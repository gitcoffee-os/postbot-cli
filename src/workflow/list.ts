import chalk from 'chalk';
import { appName, createApiClient } from '../config.js';
import { WorkflowApi } from '@gitcoffee/postbot-sdk';

export async function workflowList(opts: {
  json?: boolean;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const workflowApi = new WorkflowApi(client);

  try {
    const definitions = await workflowApi.listDefinitions();

    if (opts.json) {
      console.log(JSON.stringify(definitions, null, 2));
      return;
    }

    console.log(chalk.bold('\nAvailable Workflow Types:'));
    console.log(chalk.gray('─'.repeat(40)));
    for (const def of definitions) {
      console.log(`  ${chalk.cyan(def)}`);
    }
    console.log(chalk.gray('─'.repeat(40)));
  } catch (error: any) {
    console.log(chalk.red(`Failed to list workflows: ${error.message}`));
    process.exit(1);
  }
}
