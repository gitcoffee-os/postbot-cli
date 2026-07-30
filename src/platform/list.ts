import chalk from 'chalk';
import { appName, createApiClient } from '../config.js';
import { PlatformApi } from '@gitcoffee/postbot-sdk';

export async function platformList(opts: {
  json?: boolean;
  app?: 'postbot' | 'postar';
}) {
  const appKey = appName(opts.app);
  const client = createApiClient(appKey);
  const platformApi = new PlatformApi(client);

  try {
    const platforms = await platformApi.list();

    if (opts.json) {
      console.log(JSON.stringify(platforms, null, 2));
      return;
    }

    console.log(chalk.bold(`\nPlatforms (${platforms.length}):`));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.bold('  ID    | Code          | Name'));
    console.log(chalk.gray('─'.repeat(60)));

    for (const p of platforms) {
      const id = String(p.id).padEnd(6);
      const code = (p.code || 'N/A').padEnd(14);
      const name = p.name || 'N/A';
      console.log(`  ${id}| ${code}| ${name}`);
    }

    console.log(chalk.gray('─'.repeat(60)));
  } catch (error: any) {
    console.log(chalk.red(`Failed to list platforms: ${error.message}`));
    process.exit(1);
  }
}
