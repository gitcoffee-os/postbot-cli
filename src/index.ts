#!/usr/bin/env node

import { Command } from 'commander';
import { login } from './auth/login.js';
import { register } from './auth/register.js';
import { logout } from './auth/logout.js';
import { whoami } from './auth/whoami.js';
import { quickPublish } from './publish/quick-publish.js';
import { batchPublish } from './publish/batch-publish.js';
import { taskStatus } from './status/task-status.js';
import { workflowStatus } from './workflow/status.js';
import { workflowRetry } from './workflow/retry.js';
import { taskList } from './task/list.js';
import { taskGet } from './task/get.js';
import { taskSave } from './task/save.js';
import { platformList } from './platform/list.js';
import { accountList } from './account/list.js';
import { clientList } from './client/list.js';
import { configCommand } from './config-command.js';
import { appName } from './config.js';

const program = new Command();

program
  .name('postbot')
  .description('PostBot & Postar CLI - Content publishing and task management')
  .version('0.1.0')
  .option('--app <app>', 'Application mode (postbot|postar)', 'postbot')
  .option('--json', 'Output in JSON format')
  .option('--verbose', 'Verbose output');

program.on('option:app', (value: string) => {
  if (value !== 'postbot' && value !== 'postar') {
    console.error('Invalid app: must be postbot or postar');
    process.exit(1);
  }
});

const getApp = () => program.opts().app as 'postbot' | 'postar';
const isJson = () => program.opts().json;

// === Auth Commands ===
program
  .command('login')
  .description('Login to account')
  .option('-u, --username <username>', 'Username')
  .option('-p, --password <password>', 'Password')
  .action((opts) => login({ ...opts, app: getApp() }));

program
  .command('register')
  .description('Register new account')
  .option('-u, --username <username>', 'Username')
  .option('-p, --password <password>', 'Password')
  .option('-n, --nickname <nickname>', 'Nickname')
  .option('-m, --mobile <mobile>', 'Mobile phone number')
  .action((opts) => register({ ...opts, app: getApp() }));

program
  .command('logout')
  .description('Logout from account')
  .action(() => logout({ app: getApp() }));

program
  .command('whoami')
  .description('Show current user info')
  .action(() => whoami({ app: getApp() }));

// === Config Commands ===
program
  .command('config')
  .description('Show or set developer configuration')
  .option('--client-id <id>', 'Set OAuth2 client ID')
  .option('--client-secret <secret>', 'Set OAuth2 client secret')
  .option('--iam-base-url <url>', 'Set IAM base URL')
  .option('--show', 'Show current configuration')
  .action((opts) => configCommand(opts));

// === Publish Commands ===
program
  .command('publish')
  .description('Quick publish (one-click create + publish)')
  .option('--name <name>', 'Task name')
  .option('--type <type>', 'Content type (article|moment|video|audio)')
  .option('--platform <code>', 'Platform code (single, deprecated, use --platforms)')
  .option('--platforms <codes>', 'Comma-separated platform codes (multi-platform supported)')
  .option('--account <username>', 'Account username')
  .option('--content-file <path>', 'Content file path (JSON)')
  .option('--channel <channel>', 'Publish channel (CLOUD|BROWSER_EXTENSION|DESKTOP)')
  .option('--scheduled-at <datetime>', 'Scheduled publish time')
  .action((opts) => quickPublish({ ...opts, app: getApp() }));

program
  .command('batch-publish')
  .description('Batch publish from JSON file')
  .requiredOption('--file <path>', 'Tasks JSON file path')
  .option('--channel <channel>', 'Publish channel')
  .action((opts) => batchPublish({ ...opts, app: getApp() }));

// === Status Commands ===
program
  .command('status <taskId>')
  .description('Query task publish status')
  .action((taskId) => taskStatus({ taskId, app: getApp() }));

// === Workflow Commands ===
const workflowCmd = program.command('workflow').description('Workflow management');

workflowCmd
  .command('status <executionId>')
  .description('Query workflow execution status')
  .action((executionId) => workflowStatus({ executionId, app: getApp() }));

workflowCmd
  .command('retry <executionId>')
  .description('Retry failed workflow execution')
  .action((executionId) => workflowRetry({ executionId, app: getApp() }));

// === Task Commands ===
const taskCmd = program.command('task').description('Task management');

taskCmd
  .command('list')
  .description('List tasks')
  .option('--page <page>', 'Page number', '1')
  .option('--size <size>', 'Page size', '20')
  .option('--status <status>', 'Filter by status')
  .action((opts) => taskList({ ...opts, page: Number(opts.page), size: Number(opts.size), json: isJson(), app: getApp() }));

taskCmd
  .command('get <taskId>')
  .description('Get task details')
  .action((taskId) => taskGet({ taskId, json: isJson(), app: getApp() }));

taskCmd
  .command('save')
  .description('Save a task (supports multi-platform)')
  .option('--name <name>', 'Task name')
  .option('--type <type>', 'Content type (article|moment|video|audio)')
  .option('--platforms <codes>', 'Comma-separated platform codes')
  .option('--account <username>', 'Primary account username')
  .option('--account-id <id>', 'Primary account ID (alternative to --account)')
  .option('--content-file <path>', 'Content file path (JSON)')
  .option('--channel <channel>', 'Publish channel (CLOUD|BROWSER_EXTENSION|DESKTOP)')
  .option('--scheduled-at <datetime>', 'Scheduled publish time (ISO 8601)')
  .action((opts) => taskSave({ ...opts, json: isJson(), app: getApp() }));

// === Platform Commands ===
program
  .command('platform list')
  .description('List supported platforms')
  .action(() => platformList({ json: isJson(), app: getApp() }));

// === Account Commands ===
program
  .command('account list')
  .description('List bound media accounts')
  .action(() => accountList({ json: isJson(), app: getApp() }));

// === Client Commands ===
program
  .command('client list')
  .description('List registered clients')
  .action(() => clientList({ json: isJson(), app: getApp() }));

program.parse();
