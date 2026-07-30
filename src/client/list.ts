import chalk from 'chalk';
import { appName, createApiClient } from '../config.js';
import { ClientApi } from '@gitcoffee/postbot-sdk';

export async function clientList(opts: {
  json?: boolean;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const clientApi = new ClientApi(client);

  try {
    const clients = await clientApi.list();

    if (opts.json) {
      console.log(JSON.stringify(clients, null, 2));
      return;
    }

    console.log(chalk.bold(`\nClients (${clients.length}):`));
    console.log(chalk.gray('─'.repeat(70)));
    console.log(chalk.bold('  ID    | Name              | Type      | Key                 | Last Online'));
    console.log(chalk.gray('─'.repeat(70)));

    for (const c of clients) {
      const id = String(c.id).padEnd(6);
      const name = (c.name || 'N/A').substring(0, 17).padEnd(18);
      const type = (c.type || 'N/A').padEnd(10);
      const key = (c.clientKey || 'N/A').substring(0, 20).padEnd(21);
      const lastOnline = c.lastOnlineAt || 'N/A';
      console.log(`  ${id}| ${name}| ${type}| ${key}| ${lastOnline}`);
    }

    console.log(chalk.gray('─'.repeat(70)));
  } catch (error: any) {
    console.log(chalk.red(`Failed to list clients: ${error.message}`));
    process.exit(1);
  }
}
