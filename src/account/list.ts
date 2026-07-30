import chalk from 'chalk';
import { appName, createApiClient } from '../config.js';
import { AccountApi } from '@gitcoffee/postbot-sdk';

export async function accountList(opts: {
  json?: boolean;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const accountApi = new AccountApi(client);

  try {
    const accounts = await accountApi.list();

    if (opts.json) {
      console.log(JSON.stringify(accounts, null, 2));
      return;
    }

    console.log(chalk.bold(`\nAccounts (${accounts.length}):`));
    console.log(chalk.gray('─'.repeat(70)));
    console.log(chalk.bold('  ID    | Username          | Name              | Platform'));
    console.log(chalk.gray('─'.repeat(70)));

    for (const a of accounts) {
      const id = String(a.id).padEnd(6);
      const username = (a.username || 'N/A').substring(0, 18).padEnd(19);
      const name = (a.name || 'N/A').substring(0, 17).padEnd(18);
      const platform = String(a.mediaPlatformId || 'N/A');
      console.log(`  ${id}| ${username}| ${name}| ${platform}`);
    }

    console.log(chalk.gray('─'.repeat(70)));
  } catch (error: any) {
    console.log(chalk.red(`Failed to list accounts: ${error.message}`));
    process.exit(1);
  }
}
