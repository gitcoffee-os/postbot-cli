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
import { workflowList } from './workflow/list.js';
import { taskList } from './task/list.js';
import { taskGet } from './task/get.js';
import { taskSave } from './task/save.js';
import { taskUpdate } from './task/update.js';
import { taskDelete } from './task/delete.js';
import { taskBatchDelete } from './task/batch-delete.js';
import { autopublishTrigger } from './autopublish/trigger.js';
import { autopublishStatus } from './autopublish/status.js';
import { autopublishLog } from './autopublish/log.js';
import { platformList } from './platform/list.js';
import { accountList } from './account/list.js';
import { clientList } from './client/list.js';
import { configCommand } from './config-command.js';
import { appName } from './config.js';

const program = new Command();

program
  .name('postbot')
  .description('PostBot CLI - Content publishing and task management')
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
  .option('--max-retries <count>', 'Max retry count for auto-publish (omit to use engine default)')
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
  .action((taskId) => taskStatus({ taskId, app: getApp(), json: isJson() }));

// === Workflow Commands ===
const workflowCmd = program.command('workflow').description('Workflow management');

workflowCmd
  .command('list')
  .description('List available workflow types')
  .action(() => workflowList({ json: isJson(), app: getApp() }));

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
  .option('--max-retries <count>', 'Max retry count for auto-publish (omit to use engine default)')
  .action((opts) => taskSave({ ...opts, json: isJson(), app: getApp() }));

taskCmd
  .command('update <taskId>')
  .description('Update an existing task')
  .option('--name <name>', 'New task name')
  .option('--status <status>', 'New status')
  .option('--scheduled-at <datetime>', 'New scheduled publish time')
  .option('--max-retries <count>', 'Max retry count')
  .action((taskId, opts) => taskUpdate({ ...opts, taskId, json: isJson(), app: getApp() }));

taskCmd
  .command('delete <taskId>')
  .description('Delete a task')
  .option('-f, --force', 'Skip confirmation')
  .action((taskId, opts) => taskDelete({ ...opts, taskId, json: isJson(), app: getApp() }));

taskCmd
  .command('batch-delete')
  .description('Batch delete tasks (comma-separated IDs)')
  .requiredOption('--ids <ids>', 'Comma-separated task IDs')
  .option('-f, --force', 'Skip confirmation')
  .action((opts) => taskBatchDelete({ ...opts, json: isJson(), app: getApp() }));

// === Auto-Publish Commands ===
const autopublishCmd = program.command('autopublish').description('Auto-publish management');

autopublishCmd
  .command('trigger <taskId>')
  .description('Manually trigger auto-publish for a task')
  .action((taskId) => autopublishTrigger({ taskId, app: getApp() }));

autopublishCmd
  .command('status <taskId>')
  .description('Query latest publish status for a task')
  .action((taskId) => autopublishStatus({ taskId, json: isJson(), app: getApp() }));

autopublishCmd
  .command('log')
  .description('List auto-publish execution logs')
  .action(() => autopublishLog({ json: isJson(), app: getApp() }));

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
