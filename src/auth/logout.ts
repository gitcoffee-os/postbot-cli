import chalk from 'chalk';
import { clearToken, appName } from '../config.js';

export async function logout(opts: { app?: 'postbot' | 'postar' }) {
  const appKey = appName(opts.app);
  clearToken(appKey);
  console.log(chalk.green(`Logged out from ${appKey}`));
}
