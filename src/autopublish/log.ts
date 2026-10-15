import chalk from 'chalk';
import { appName, createApiClient } from '../config.js';
import { AutoPublishApi } from '@gitcoffee/postbot-sdk';

export async function autopublishLog(opts: {
  taskId?: string;
  json?: boolean;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const api = new AutoPublishApi(client);

  try {
    let logs = await api.listLogs();
    const filtered = opts.taskId
      ? logs.filter((l) => String(l.taskId) === String(opts.taskId))
      : null;

    if (opts.json) {
      console.log(JSON.stringify(filtered ?? logs, null, 2));
      return;
    }

    logs = filtered ?? logs;

    if (filtered) {
      // 按任务过滤时走明细视图：直接展示每条执行的错误信息（定位失败原因无需再查接口）
      console.log(chalk.bold(`\nAuto-Publish Logs for Task ${opts.taskId} (${logs.length} entries):`));
      for (const log of logs) {
        console.log(chalk.gray('─'.repeat(90)));
        console.log(
          `  Log #${log.id} | ${log.platformCode || 'N/A'} | ${chalk.yellow(log.status || 'N/A')} | worker: ${log.workerNode || 'N/A'}`,
        );
        console.log(`  Started: ${log.startedAt || 'N/A'}${log.finishedAt ? ` → ${log.finishedAt}` : ''}`);
        if (log.errorMsg) {
          console.log(`  Error:   ${chalk.red(log.errorMsg)}`);
        }
      }
      console.log(chalk.gray('─'.repeat(90)));
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
