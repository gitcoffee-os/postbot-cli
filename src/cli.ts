import { Command } from 'commander';
import inquirer from 'inquirer';
import { isAppName, type AppName } from './constants.js';
import { getConfig } from './config.js';
import { handleError } from './errors.js';
import { setRuntimeFlags } from './output.js';

export interface GlobalOptions {
  app: AppName;
  json: boolean;
  verbose: boolean;
  yes: boolean;
}

/** 读取并校验全局选项（根命令与叶子命令都可使用） */
export function getGlobalOptions(command: Command): GlobalOptions {
  const opts = command.optsWithGlobals() as Record<string, unknown>;
  const app = opts.app === undefined ? getConfig().currentApp : opts.app;
  if (!isAppName(app)) {
    throw new Error(`Invalid app "${String(app)}": expected "postbot" or "postar"`);
  }
  return {
    app,
    json: Boolean(opts.json),
    verbose: Boolean(opts.verbose),
    yes: Boolean(opts.yes),
  };
}

/**
 * 为叶子命令补充全局选项，使 `postbot task list --json` 这类
 * 选项写在子命令之后的写法同样生效。
 */
export function addGlobalOptions(command: Command): Command {
  return command
    .option('--app <app>', '应用模式: postbot | postar')
    .option('--json', '以 JSON 格式输出')
    .option('--verbose', '错误时输出堆栈')
    .option('-y, --yes', '跳过确认提示');
}

/** 组件 action 的异步包装：统一捕获错误并设置退出码 */
export function action<Args extends unknown[]>(
  handler: (...args: Args) => Promise<void>,
): (...args: Args) => Promise<void> {
  return async (...args: Args) => {
    try {
      await handler(...args);
    } catch (error) {
      handleError(error);
    }
  };
}

/** 解析整数参数（非法时抛出可读错误） */
export function parseInteger(value: unknown, name: string, options: { min?: number } = {}): number {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new Error(`${name} 必须是整数，收到: ${String(value)}`);
  }
  if (options.min !== undefined && number < options.min) {
    throw new Error(`${name} 不能小于 ${options.min}`);
  }
  return number;
}

export function parseIdList(value: string, name = 'ID'): number[] {
  const ids = String(value)
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => parseInteger(item, name, { min: 1 }));
  if (ids.length === 0) {
    throw new Error(`至少需要一个 ${name}`);
  }
  return Array.from(new Set(ids));
}

/** 删除类操作确认；`--yes` 或非 TTY 环境下直接通过 */
export async function confirmAction(message: string, options: { yes?: boolean }): Promise<boolean> {
  if (options.yes) return true;
  if (!process.stdin.isTTY) {
    throw new Error(`${message} 当前为非交互环境，请加 --yes 或 --force 确认执行。`);
  }
  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: false,
    },
  ]);
  return confirmed;
}

/** 解析 JSON 字符串参数 */
export function parseJsonInput(value: string, name: string): unknown {
  try {
    return JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${name} 不是合法 JSON: ${message}`);
  }
}

/** 注册根命令的 preAction，记录运行标志供错误输出使用 */
export function installRuntimeFlags(program: Command): void {
  program.hook('preAction', (_thisCommand, actionCommand) => {
    // 先记录输出模式，保证 app 校验失败时 --json 仍能生效
    const raw = actionCommand.optsWithGlobals() as Record<string, unknown>;
    setRuntimeFlags({ json: Boolean(raw.json), verbose: Boolean(raw.verbose) });
    getGlobalOptions(actionCommand);
  });
}
