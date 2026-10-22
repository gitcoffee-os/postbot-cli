#!/usr/bin/env node

import { basename } from 'node:path';
import { Command } from 'commander';
import {
  action,
  addGlobalOptions,
  getGlobalOptions,
  installRuntimeFlags,
} from './cli.js';
import { VERSION } from './version.js';
import { handleError } from './errors.js';
import { login } from './auth/login.js';
import { register } from './auth/register.js';
import { logout } from './auth/logout.js';
import { whoami } from './auth/whoami.js';
import { forgotPassword } from './auth/forgot-password.js';
import { quickPublish, type PublishOptions } from './publish/quick-publish.js';
import { batchPublish, type BatchPublishOptions } from './publish/batch-publish.js';
import { taskStatus, type TaskStatusOptions } from './status/task-status.js';
import { taskList, type TaskListOptions } from './task/list.js';
import { taskGet } from './task/get.js';
import { taskSave, type SaveTaskOptions } from './task/save.js';
import { taskUpdate, type TaskUpdateOptions } from './task/update.js';
import { taskDelete } from './task/delete.js';
import { taskBatchDelete } from './task/batch-delete.js';
import { taskBindContent } from './task/bind-content.js';
import { autopublishTrigger } from './autopublish/trigger.js';
import { autopublishStatus } from './autopublish/status.js';
import { autopublishJobs, type AutopublishJobsOptions } from './autopublish/jobs.js';
import { autopublishLog, type AutopublishLogOptions } from './autopublish/log.js';
import { platformList, type PlatformListOptions } from './platform/list.js';
import { platformGet } from './platform/get.js';
import { accountList, type AccountListOptions } from './account/list.js';
import { accountGet } from './account/get.js';
import { accountSave, type AccountSaveOptions } from './account/save.js';
import { accountUpdate, type AccountUpdateOptions } from './account/update.js';
import { accountRemove } from './account/remove.js';
import { accountBatchRemove } from './account/batch-remove.js';
import {
  fingerprintGet,
  fingerprintSave,
  fingerprintRemove,
  type FingerprintSaveOptions,
} from './account/fingerprint.js';
import { clientList, type ClientListOptions } from './client/list.js';
import { clientGet } from './client/get.js';
import { clientSave, type ClientSaveOptions } from './client/save.js';
import { clientUpdate, type ClientUpdateOptions } from './client/update.js';
import { clientRemove } from './client/remove.js';
import { clientBatchRemove } from './client/batch-remove.js';
import { sessionList, type SessionListOptions } from './session/list.js';
import { sessionGet, type SessionGetOptions } from './session/get.js';
import { notifySend, type NotifySendOptions } from './notify/send.js';
import { workflowList } from './workflow/list.js';
import { workflowStatus } from './workflow/status.js';
import { workflowRetry } from './workflow/retry.js';
import { workflowExecute, type WorkflowExecuteOptions } from './workflow/execute.js';
import { configCommand, type ConfigCommandOptions } from './config-command.js';

const program = new Command();
const invokedAs = basename(process.argv[1] ?? '').replace(/\.js$/, '');
program
  .name(invokedAs === 'postar' ? 'postar' : 'postbot')
  .description('PostBot / Postar CLI - 内容发布与媒体任务管理')
  .version(VERSION, '-v, --version', '显示版本')
  .option('--app <app>', '应用模式: postbot | postar（默认取配置 currentApp）')
  .option('--json', '以 JSON 格式输出（推荐用于 CI / 脚本）')
  .option('--verbose', '错误时输出堆栈')
  .option('-y, --yes', '跳过确认提示')
  .showHelpAfterError()
  .addHelpText(
    'after',
    `
示例:
  $ postbot login
  $ postbot platform list
  $ postbot account list --platform weixin
  $ postbot publish --platforms weixin,xiaohongshu --content-file ./content.json
  $ postbot publish --platforms weixin --content-file ./content.json --scheduled-at "2026-09-01 09:00:00"
  $ postbot status 123
  $ postbot task list --status FAILED --json
  $ postbot autopublish log --task 123 --failed

全局选项可写在子命令之后，例如:
  $ postbot task list --json --app postbot`,
  );

installRuntimeFlags(program);

/** 创建带全局选项的叶子命令 */
function leaf(parent: Command, declaration: string, description: string): Command {
  return addGlobalOptions(parent.command(declaration).description(description));
}

// === 认证 ===
leaf(program, 'login', '登录（未配置开发者凭证时使用直接登录）')
  .option('-u, --username <username>', '用户名 / 手机号')
  .option('-p, --password <password>', '密码')
  .option('--no-register', '用户不存在时不自动注册')
  .option('--show-token', 'JSON 输出中包含 token（默认隐藏）')
  .action(
    action(async (opts: { username?: string; password?: string; register?: boolean; showToken?: boolean }, cmd: Command) => {
      await login(opts, getGlobalOptions(cmd));
    }),
  );

leaf(program, 'register', '注册账号（需要开发者凭证）')
  .option('-u, --username <username>', '用户名 / 手机号')
  .option('-p, --password <password>', '密码')
  .option('-n, --nickname <nickname>', '昵称')
  .option('-m, --mobile <mobile>', '手机号')
  .option('--show-token', 'JSON 输出中包含 token（默认隐藏）')
  .action(
    action(async (opts: { username?: string; password?: string; nickname?: string; mobile?: string; showToken?: boolean }, cmd: Command) => {
      await register(opts, getGlobalOptions(cmd));
    }),
  );

leaf(program, 'forgot-password', '重置密码（需要开发者凭证，无需登录）')
  .option('-u, --username <username>', '用户名')
  .option('-p, --password <password>', '新密码')
  .action(
    action(async (opts: { username?: string; password?: string }, cmd: Command) => {
      await forgotPassword(opts, getGlobalOptions(cmd));
    }),
  );

leaf(program, 'logout', '退出登录（仅清理本地 token）').action(
  action(async (_opts: unknown, cmd: Command) => {
    await logout(getGlobalOptions(cmd));
  }),
);

leaf(program, 'whoami', '显示当前登录用户').action(
  action(async (_opts: unknown, cmd: Command) => {
    await whoami(getGlobalOptions(cmd));
  }),
);

// === 配置 ===
leaf(program, 'config', '查看或修改 CLI 配置')
  .option('--client-id <id>', '设置 OAuth2 client ID')
  .option('--client-secret <secret>', '设置 OAuth2 client secret')
  .option('--iam-base-url <url>', '设置 IAM base URL')
  .option('--default-app <app>', '设置默认应用 postbot|postar')
  .option('--show', '显示当前配置')
  .option('--show-secret', '显示完整 client secret')
  .action(
    action(async (opts: ConfigCommandOptions, cmd: Command) => {
      await configCommand(opts, getGlobalOptions(cmd));
    }),
  );

// === 发布 ===
leaf(program, 'publish', '创建并自动发布任务（多平台）')
  .alias('pub')
  .option('--name <name>', '任务名称（默认取内容标题）')
  .option('--type <type>', '内容类型 article|moment|video|audio', 'article')
  .option('--platform <code>', '单平台（已废弃，请用 --platforms）')
  .option('--platforms <codes>', '目标平台，逗号分隔，如 weixin,xiaohongshu')
  .option('--account <username>', '主账号用户名（可选；引擎按目标平台自动选账号）')
  .option('--account-id <id>', '主账号 ID（可选）')
  .option('--client <client>', '绑定客户端 id|name|clientKey（DESKTOP 未指定时自动选择在线桌面端）')
  .option('--channel <channel>', '发布通道 CLOUD|BROWSER_EXTENSION|BROWSER_EXTENSION_EPHEMERAL|DESKTOP', 'CLOUD')
  .option('--content-file <path>', '内容 JSON 文件')
  .option('--content <json>', '内联内容 JSON')
  .option('--title <title>', '覆盖 data.title')
  .option('--scheduled-at <datetime>', '定时发布（支持 "2026-09-01 09:00:00" / ISO 8601 / 毫秒时间戳）')
  .option('--max-retries <count>', '最大重试次数（缺省用引擎默认值）')
  .option('--content-id <id>', '上游内容 ID')
  .option('--config <json>', '任务扩展配置 JSON')
  .option('--draft', '仅保存草稿，不自动发布')
  .option('--allow-missing-accounts', '跳过“目标平台必须有账号”的预检')
  .option('--wait', '等待发布结束（按任务聚合状态轮询）')
  .option('--timeout <seconds>', '等待超时秒数', '600')
  .option('--interval <seconds>', '轮询间隔秒数', '3')
  .action(
    action(async (opts: PublishOptions, cmd: Command) => {
      await quickPublish(opts, getGlobalOptions(cmd));
    }),
  );

leaf(program, 'batch-publish', '从 JSON 批量创建/发布任务')
  .requiredOption('--file <path>', '批量任务 JSON 文件')
  .option('--channel <channel>', '默认发布通道')
  .option('--dry-run', '只打印组装后的请求，不保存')
  .option('--fail-fast', '遇到第一个错误即停止')
  .action(
    action(async (opts: BatchPublishOptions, cmd: Command) => {
      await batchPublish(opts, getGlobalOptions(cmd));
    }),
  );

leaf(program, 'status <taskId>', '查询任务发布状态（聚合状态 + 最新 Job + 最近日志）')
  .option('--no-logs', '不显示最近执行日志')
  .option('--log-limit <count>', '显示的日志条数', '5')
  .action(
    action(async (taskId: string, opts: TaskStatusOptions, cmd: Command) => {
      await taskStatus(taskId, opts, getGlobalOptions(cmd));
    }),
  );

// === Workflow ===
const workflowCmd = program.command('workflow').description('工作流管理');
leaf(workflowCmd, 'list', '列出可用工作流类型').action(
  action(async (_opts: unknown, cmd: Command) => {
    await workflowList(getGlobalOptions(cmd));
  }),
);
leaf(workflowCmd, 'execute <workflowType>', '执行工作流')
  .option('--input <json>', '输入 JSON 对象')
  .option('--input-file <path>', '输入 JSON 文件')
  .option('--task-id <id>', '快捷注入 input.taskId')
  .option('--output', '打印每个步骤的 output')
  .action(
    action(async (workflowType: string, opts: WorkflowExecuteOptions, cmd: Command) => {
      await workflowExecute(workflowType, opts, getGlobalOptions(cmd));
    }),
  );
leaf(workflowCmd, 'status <executionId>', '查询工作流执行状态')
  .option('--output', '打印每个步骤的 output')
  .action(
    action(async (executionId: string, opts: { output?: boolean }, cmd: Command) => {
      await workflowStatus(executionId, opts, getGlobalOptions(cmd));
    }),
  );
leaf(workflowCmd, 'retry <executionId>', '重试失败的工作流执行')
  .option('--output', '打印每个步骤的 output')
  .action(
    action(async (executionId: string, opts: { output?: boolean }, cmd: Command) => {
      await workflowRetry(executionId, opts, getGlobalOptions(cmd));
    }),
  );

// === 任务 ===
const taskCmd = program.command('task').description('媒体任务管理');

leaf(taskCmd, 'list', '任务列表（支持本地状态/平台筛选）')
  .option('--page <page>', '页码', '1')
  .option('--size <size>', '每页条数', '20')
  .option('--status <status>', '按状态筛选，如 DRAFT/PENDING/SCHEDULED/SUCCESS/FAILED')
  .option('--platform <code>', '按平台筛选')
  .option('--search <keyword>', '按任务名称或 ID 搜索')
  .option('--all', '返回全部任务（忽略分页）')
  .action(
    action(async (opts: TaskListOptions, cmd: Command) => {
      await taskList(opts, getGlobalOptions(cmd));
    }),
  );

leaf(taskCmd, 'get <taskId>', '查看任务详情').action(
  action(async (taskId: string, _opts: unknown, cmd: Command) => {
    await taskGet(taskId, getGlobalOptions(cmd));
  }),
);

leaf(taskCmd, 'save', '保存任务（默认自动发布；--draft 保存草稿）')
  .option('--name <name>', '任务名称')
  .option('--type <type>', '内容类型 article|moment|video|audio')
  .option('--platform <code>', '单平台（已废弃，请用 --platforms）')
  .option('--platforms <codes>', '目标平台，逗号分隔')
  .option('--account <username>', '主账号用户名')
  .option('--account-id <id>', '主账号 ID')
  .option('--client <client>', '绑定客户端 id|name|clientKey')
  .option('--channel <channel>', '发布通道 CLOUD|BROWSER_EXTENSION|BROWSER_EXTENSION_EPHEMERAL|DESKTOP')
  .option('--content-file <path>', '内容 JSON 文件')
  .option('--content <json>', '内联内容 JSON')
  .option('--title <title>', '覆盖 data.title')
  .option('--scheduled-at <datetime>', '定时发布时间')
  .option('--max-retries <count>', '最大重试次数')
  .option('--content-id <id>', '上游内容 ID')
  .option('--config <json>', '任务扩展配置 JSON')
  .option('--draft', '仅保存草稿（isAutoPublish=false）')
  .option('--allow-missing-accounts', '跳过账号预检')
  .action(
    action(async (opts: SaveTaskOptions, cmd: Command) => {
      await taskSave(opts, getGlobalOptions(cmd));
    }),
  );

leaf(taskCmd, 'update <taskId>', '更新任务（GET 合并后整体回传，避免引擎重置字段）')
  .option('--name <name>', '新名称')
  .option('--type <type>', '新内容类型')
  .option('--status <status>', '新状态（DRAFT/PENDING/SCHEDULED/...）')
  .option('--platform <code>', '单平台（已废弃）')
  .option('--platforms <codes>', '新目标平台，逗号分隔')
  .option('--account <username>', '新主账号用户名')
  .option('--account-id <id>', '新主账号 ID')
  .option('--client <client>', '新客户端 id|name|clientKey')
  .option('--channel <channel>', '新发布通道')
  .option('--content-file <path>', '替换内容 JSON 文件')
  .option('--content <json>', '替换内容（内联 JSON）')
  .option('--title <title>', '覆盖 data.title')
  .option('--scheduled-at <datetime>', '新定时时间（注意：不会重排已有 Job）')
  .option('--max-retries <count>', '新最大重试次数')
  .option('--content-id <id>', '新内容 ID')
  .option('--config <json>', '新扩展配置')
  .option('--auto-publish', '开启自动发布（会重算状态）')
  .option('--draft', '转为草稿（isAutoPublish=false）')
  .action(
    action(async (taskId: string, opts: TaskUpdateOptions, cmd: Command) => {
      await taskUpdate(taskId, opts, getGlobalOptions(cmd));
    }),
  );

leaf(taskCmd, 'delete <taskId>', '删除任务')
  .option('-f, --force', '跳过确认')
  .action(
    action(async (taskId: string, opts: { force?: boolean }, cmd: Command) => {
      await taskDelete(taskId, opts, getGlobalOptions(cmd));
    }),
  );

leaf(taskCmd, 'batch-delete', '批量删除任务')
  .requiredOption('--ids <ids>', '逗号分隔的任务 ID')
  .option('-f, --force', '跳过确认')
  .action(
    action(async (opts: { ids?: string; force?: boolean }, cmd: Command) => {
      await taskBatchDelete(opts, getGlobalOptions(cmd));
    }),
  );

leaf(taskCmd, 'bind-content <taskId> <contentId>', '幂等绑定上游内容 ID（已有值不覆盖）').action(
  action(async (taskId: string, contentId: string, _opts: unknown, cmd: Command) => {
    await taskBindContent(taskId, contentId, getGlobalOptions(cmd));
  }),
);

// === 自动发布 ===
const autopublishCmd = program.command('autopublish').alias('ap').description('自动发布任务 / Job / 日志');

leaf(autopublishCmd, 'trigger <taskId>', '立即触发自动发布（忽略定时时间）').action(
  action(async (taskId: string, _opts: unknown, cmd: Command) => {
    await autopublishTrigger(taskId, getGlobalOptions(cmd));
  }),
);

leaf(autopublishCmd, 'status <taskId>', '查询任务最新 Job').action(
  action(async (taskId: string, _opts: unknown, cmd: Command) => {
    await autopublishStatus(taskId, getGlobalOptions(cmd));
  }),
);

leaf(autopublishCmd, 'jobs', '查询调度 Job 列表')
  .option('--task <taskId>', '按任务筛选')
  .option('--status <status>', '按状态筛选')
  .option('--platform <code>', '按平台筛选')
  .option('--limit <count>', '最多返回条数')
  .action(
    action(async (opts: AutopublishJobsOptions, cmd: Command) => {
      await autopublishJobs(opts, getGlobalOptions(cmd));
    }),
  );

leaf(autopublishCmd, 'log', '查询执行日志')
  .option('--task <taskId>', '按任务筛选（输出明细）')
  .option('--status <status>', '按状态筛选')
  .option('--platform <code>', '按平台筛选')
  .option('--limit <count>', '最多返回条数')
  .option('--failed', '只看失败 / 可重试失败')
  .option('--full', '输出完整 fullLog')
  .action(
    action(async (opts: AutopublishLogOptions, cmd: Command) => {
      await autopublishLog(opts, getGlobalOptions(cmd));
    }),
  );

// 顶层便捷命令：postbot logs == postbot autopublish log
leaf(program, 'logs', '查询执行日志（autopublish log 的快捷方式）')
  .option('--task <taskId>', '按任务筛选（输出明细）')
  .option('--status <status>', '按状态筛选')
  .option('--platform <code>', '按平台筛选')
  .option('--limit <count>', '最多返回条数')
  .option('--failed', '只看失败 / 可重试失败')
  .option('--full', '输出完整 fullLog')
  .action(
    action(async (opts: AutopublishLogOptions, cmd: Command) => {
      await autopublishLog(opts, getGlobalOptions(cmd));
    }),
  );

// === 平台 ===
const platformCmd = program.command('platform').description('媒体平台字典');
leaf(platformCmd, 'list', '列出引擎中配置的平台')
  .option('--type <type>', '按平台类型筛选（如 media）')
  .option('--status <status>', '按状态筛选（如 ok）')
  .option('--search <keyword>', '按 code / 名称 / 描述搜索')
  .action(
    action(async (opts: PlatformListOptions, cmd: Command) => {
      await platformList(opts, getGlobalOptions(cmd));
    }),
  );
leaf(platformCmd, 'get <idOrCode>', '查看平台详情（含发布通道配置）').action(
  action(async (ref: string, _opts: unknown, cmd: Command) => {
    await platformGet(ref, getGlobalOptions(cmd));
  }),
);

// === 账号 ===
const accountCmd = program.command('account').alias('acc').description('媒体账号与浏览器指纹');
leaf(accountCmd, 'list', '账号列表')
  .option('--platform <codeOrId>', '按平台筛选')
  .option('--status <status>', 'ok|renew|expired|unbound')
  .option('--search <keyword>', '按用户名 / 名称 / 平台账号 ID 搜索')
  .option('--page <page>', '页码', '1')
  .option('--size <size>', '每页条数', '20')
  .option('--all', '返回全部')
  .action(
    action(async (opts: AccountListOptions, cmd: Command) => {
      await accountList(opts, getGlobalOptions(cmd));
    }),
  );

leaf(accountCmd, 'get <accountId>', '账号详情').action(
  action(async (accountId: string, _opts: unknown, cmd: Command) => {
    await accountGet(accountId, getGlobalOptions(cmd));
  }),
);

leaf(accountCmd, 'save', '创建账号')
  .option('--username <username>', '平台账号用户名（必填）')
  .option('--name <name>', '显示名称（默认同 username）')
  .option('--platform <codeOrId>', '平台 code 或 ID（必填）')
  .option('--account-id <id>', '平台侧账号 ID')
  .option('--profile <text>', '简介')
  .option('--avatar <url>', '头像 URL')
  .option('--homepage <url>', '主页 URL')
  .option('--url <url>', '账号 URL')
  .option('--session <bizId>', '绑定 SessionBot 会话业务 ID')
  .action(
    action(async (opts: AccountSaveOptions, cmd: Command) => {
      await accountSave(opts, getGlobalOptions(cmd));
    }),
  );

leaf(accountCmd, 'update <accountId>', '更新账号')
  .option('--username <username>', '平台账号用户名')
  .option('--name <name>', '显示名称')
  .option('--platform <codeOrId>', '平台 code 或 ID')
  .option('--account-id <id>', '平台侧账号 ID')
  .option('--profile <text>', '简介')
  .option('--avatar <url>', '头像 URL')
  .option('--homepage <url>', '主页 URL')
  .option('--url <url>', '账号 URL')
  .option('--session <bizId>', '绑定 SessionBot 会话业务 ID')
  .action(
    action(async (accountId: string, opts: AccountUpdateOptions, cmd: Command) => {
      await accountUpdate(accountId, opts, getGlobalOptions(cmd));
    }),
  );

leaf(accountCmd, 'remove <accountId>', '删除账号（不删除会话）')
  .option('-f, --force', '跳过确认')
  .action(
    action(async (accountId: string, opts: { force?: boolean }, cmd: Command) => {
      await accountRemove(accountId, opts, getGlobalOptions(cmd));
    }),
  );

leaf(accountCmd, 'batch-remove', '批量删除账号')
  .requiredOption('--ids <ids>', '逗号分隔的账号 ID')
  .option('-f, --force', '跳过确认')
  .action(
    action(async (opts: { ids?: string; force?: boolean }, cmd: Command) => {
      await accountBatchRemove(opts, getGlobalOptions(cmd));
    }),
  );

const fingerprintCmd = accountCmd.command('fingerprint').description('账号浏览器指纹（UA / 时区 / 视口等）');
leaf(fingerprintCmd, 'get <accountId>', '查看指纹（未设置时回落到自动解析）').action(
  action(async (accountId: string, _opts: unknown, cmd: Command) => {
    await fingerprintGet(accountId, getGlobalOptions(cmd));
  }),
);
leaf(fingerprintCmd, 'save <accountId>', '创建或更新指纹（版本自动 +1）')
  .option('--ua <ua>', 'User-Agent')
  .option('--locale <locale>', '语言，如 zh-CN')
  .option('--timezone <timezone>', '时区，如 Asia/Shanghai')
  .option('--viewport-width <px>', '视口宽度')
  .option('--viewport-height <px>', '视口高度')
  .option('--device-scale-factor <ratio>', '设备像素比')
  .option('--hardware-concurrency <count>', '逻辑 CPU 核数')
  .option('--color-scheme <scheme>', 'light|dark')
  .option('--os <os>', '操作系统，如 macOS')
  .option('--platform <platform>', 'platform，如 mac')
  .action(
    action(async (accountId: string, opts: FingerprintSaveOptions, cmd: Command) => {
      await fingerprintSave(accountId, opts, getGlobalOptions(cmd));
    }),
  );
leaf(fingerprintCmd, 'remove <accountId>', '删除指纹')
  .option('-f, --force', '跳过确认')
  .action(
    action(async (accountId: string, opts: { force?: boolean }, cmd: Command) => {
      await fingerprintRemove(accountId, opts, getGlobalOptions(cmd));
    }),
  );

// === 客户端 ===
const clientCmd = program.command('client').description('媒体客户端（浏览器扩展 / 桌面端 / 云端）');
leaf(clientCmd, 'list', '客户端列表')
  .option('--type <type>', 'browser_extension|browser_extension_ephemeral|desktop|cloud')
  .option('--online', '只看在线（120 秒内的心跳）')
  .option('--platform <codeOrId>', '按平台筛选')
  .action(
    action(async (opts: ClientListOptions, cmd: Command) => {
      await clientList(opts, getGlobalOptions(cmd));
    }),
  );

leaf(clientCmd, 'get <clientId>', '客户端详情').action(
  action(async (clientId: string, _opts: unknown, cmd: Command) => {
    await clientGet(clientId, getGlobalOptions(cmd));
  }),
);

leaf(clientCmd, 'save', '注册客户端（通常由客户端自动上报）')
  .option('--name <name>', '客户端名称（必填）')
  .option('--type <type>', '客户端类型（必填）')
  .option('--client-key <key>', '客户端唯一标识（必填）')
  .option('--platform <codeOrId>', '平台 code 或 ID')
  .option('--account-id <id>', '媒体账号 ID')
  .option('--session <id>', 'SessionBot 会话数据库 ID')
  .action(
    action(async (opts: ClientSaveOptions, cmd: Command) => {
      await clientSave(opts, getGlobalOptions(cmd));
    }),
  );

leaf(clientCmd, 'update <clientId>', '更新客户端')
  .option('--name <name>', '名称')
  .option('--type <type>', '类型')
  .option('--client-key <key>', 'Client Key')
  .option('--platform <codeOrId>', '平台 code 或 ID')
  .option('--account-id <id>', '媒体账号 ID')
  .option('--session <id>', 'SessionBot 会话数据库 ID')
  .option('--online', '把最后在线时间更新为当前时间')
  .action(
    action(async (clientId: string, opts: ClientUpdateOptions, cmd: Command) => {
      await clientUpdate(clientId, opts, getGlobalOptions(cmd));
    }),
  );

leaf(clientCmd, 'remove <clientId>', '删除客户端')
  .option('-f, --force', '跳过确认')
  .action(
    action(async (clientId: string, opts: { force?: boolean }, cmd: Command) => {
      await clientRemove(clientId, opts, getGlobalOptions(cmd));
    }),
  );

leaf(clientCmd, 'batch-remove', '批量删除客户端')
  .requiredOption('--ids <ids>', '逗号分隔的客户端 ID')
  .option('-f, --force', '跳过确认')
  .action(
    action(async (opts: { ids?: string; force?: boolean }, cmd: Command) => {
      await clientBatchRemove(opts, getGlobalOptions(cmd));
    }),
  );

// === SessionBot 会话（只读） ===
const sessionCmd = program.command('session').description('SessionBot 会话（只读）');
leaf(sessionCmd, 'list', '会话列表')
  .option('--search <keyword>', '按 bizId / 别名 / 域名搜索')
  .option('--domain <domain>', '按域名筛选')
  .action(
    action(async (opts: SessionListOptions, cmd: Command) => {
      await sessionList(opts, getGlobalOptions(cmd));
    }),
  );
leaf(sessionCmd, 'get <bizId>', '按业务 ID 查看会话')
  .option('--cookies', '以表格展示 Cookie 名称/域名（值请用 --json）')
  .action(
    action(async (bizId: string, opts: SessionGetOptions, cmd: Command) => {
      await sessionGet(bizId, opts, getGlobalOptions(cmd));
    }),
  );

// === 通知 ===
leaf(program, 'notify', '发送通用通知（POST /postbot/notify）')
  .option('--event <event>', '事件名称（必填），如 userProxyRenewal')
  .option('--info <json>', '事件详情 JSON 对象')
  .option('--info-file <path>', '事件详情 JSON 文件')
  .option('--client-id <id>', 'Client-Id 请求头')
  .action(
    action(async (opts: NotifySendOptions, cmd: Command) => {
      await notifySend(opts, getGlobalOptions(cmd));
    }),
  );

// 根命令无子命令时显示帮助（`postar` 会追加 --app，argv 长度不再可靠）
program.action(() => {
  program.help();
});

if (process.argv.length <= 2) {
  program.help();
}

program.parseAsync(process.argv).catch((error) => {
  handleError(error);
});
