import chalk from 'chalk';
import { appName, createApiClient } from '../config.js';
import { TaskApi } from '@gitcoffee/postbot-sdk';

export async function taskList(opts: {
  page?: number;
  size?: number;
  status?: string;
  json?: boolean;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const taskApi = new TaskApi(client);

  try {
    const result = await taskApi.list({
      page: opts.page || 1,
      size: opts.size || 20,
      status: opts.status,
    });

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold(`\nTasks (Page ${result.current}/${result.pages}, Total: ${result.total}):`));
    console.log(chalk.gray('─'.repeat(90)));
    console.log(chalk.bold('  ID    | Name                          | Platforms | Type     | Status    | Channel'));
    console.log(chalk.gray('─'.repeat(90)));

    for (const task of result.list) {
      const id = String(task.id).padEnd(6);
      const name = (task.name || 'N/A').substring(0, 29).padEnd(30);
      let platformCount = '1';
      if (task.platformCodes) {
        try {
          const codes = JSON.parse(task.platformCodes);
          if (Array.isArray(codes)) {
            platformCount = String(codes.length);
          }
        } catch {
          platformCount = '?';
        }
      }
      const platforms = platformCount.padEnd(10);
      const type = (task.type || 'N/A').padEnd(9);
      const status = (task.status || 'N/A').padEnd(10);
      const channel = task.publishChannel || 'N/A';
      console.log(`  ${id}| ${name}| ${platforms}| ${type}| ${status}| ${channel}`);
    }

    console.log(chalk.gray('─'.repeat(90)));
  } catch (error: any) {
    console.log(chalk.red(`Failed to list tasks: ${error.message}`));
    process.exit(1);
  }
}
