import chalk from 'chalk';
import { getConfig, saveConfig } from './config.js';

export async function configCommand(opts: {
  clientId?: string;
  clientSecret?: string;
  iamBaseUrl?: string;
  show?: boolean;
}) {
  if (opts.show || (!opts.clientId && !opts.clientSecret && !opts.iamBaseUrl)) {
    const config = getConfig();
    console.log(chalk.bold('\nCurrent Configuration:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  IAM Base URL:    ${chalk.cyan(config.developer.iamBaseUrl || '(not set)')}`);
    console.log(`  Client ID:       ${chalk.cyan(config.developer.clientId || '(not set)')}`);
    console.log(`  Client Secret:   ${chalk.cyan(config.developer.clientSecret ? '••••••••' : '(not set)')}`);
    console.log(`  Proxy App ID:    ${chalk.cyan(config.developer.proxyAppId || '(not set)')}`);
    console.log(chalk.gray('─'.repeat(50)));

    if (!config.developer.clientId || !config.developer.clientSecret) {
      console.log(chalk.yellow('\nDeveloper credentials not configured.'));
      console.log(chalk.gray('Run: postbot config --client-id <id> --client-secret <secret>'));
    }
    return;
  }

  const config = getConfig();

  if (opts.clientId) {
    config.developer.clientId = opts.clientId;
  }
  if (opts.clientSecret) {
    config.developer.clientSecret = opts.clientSecret;
  }
  if (opts.iamBaseUrl) {
    config.developer.iamBaseUrl = opts.iamBaseUrl;
  }

  saveConfig(config);
  console.log(chalk.green('Configuration saved.'));
}
