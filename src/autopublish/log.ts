import chalk from 'chalk';
import { appName, createApiClient } from '../config.js';
import { AutoPublishApi } from '@gitcoffee/postbot-sdk';

export async function autopublishLog(opts: {
  json?: boolean;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const api = new AutoPublishApi(client);

  try {
    const logs = await api.listLogs();

    if (opts.json) {
      console.log(JSON.stringify(logs, null, 2));
      return;
    }

    console.log(chalk.bold(`\nAuto-Publish Logs (${logs.length} entries):`));
    console.log(chalk.gray('─'.repeat(90)));
    console.log(chalk.bold('  ID    | TaskID | Platform    | Status    | Worker              | Started'));
    console.log(chalk.gray('─'.repeat(90)));

    for (const log of logs) {
      const id = String(log.id).padEnd(6);
      const taskId = String(log.taskId).padEnd(7);
      const platform = (log.platformCode || 'N/A').padEnd(12);
      const status = (log.status || 'N/A').padEnd(10);
      const worker = (log.workerNode || 'N/A').substring(0, 19).padEnd(20);
      const started = log.startedAt || 'N/A';
      console.log(`  ${id}| ${taskId}| ${platform}| ${status}| ${worker}| ${started}`);
    }

    console.log(chalk.gray('─'.repeat(90)));
  } catch (error: any) {
    console.log(chalk.red(`Failed to list logs: ${error.message}`));
    process.exit(1);
  }
}
