import chalk from 'chalk';

interface RuntimeFlags {
  json: boolean;
  verbose: boolean;
}

const runtime: RuntimeFlags = { json: false, verbose: false };

export function setRuntimeFlags(flags: Partial<RuntimeFlags>): void {
  if (flags.json !== undefined) runtime.json = flags.json;
  if (flags.verbose !== undefined) runtime.verbose = flags.verbose;
}

export function getRuntimeFlags(): RuntimeFlags {
  return { ...runtime };
}

export function isJsonOutput(): boolean {
  return runtime.json;
}

/** 输出 JSON（统一 2 空格缩进） */
export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

/** 字符串显示宽度：CJK / 全角字符按 2 列计算，保证表格在中文下对齐 */
export function displayWidth(text: string): number {
  let width = 0;
  for (const char of String(text)) {
    const code = char.codePointAt(0) ?? 0;
    width += isWide(code) ? 2 : 1;
  }
  return width;
}

function isWide(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe19) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1f64f) ||
    (code >= 0x1f900 && code <= 0x1f9ff) ||
    (code >= 0x20000 && code <= 0x3fffd)
  );
}

function padDisplay(text: string, width: number): string {
  return text + ' '.repeat(Math.max(0, width - displayWidth(text)));
}

function truncateDisplay(text: string, maxWidth: number): string {
  if (displayWidth(text) <= maxWidth) return text;
  let out = '';
  let width = 0;
  for (const char of text) {
    const charWidth = displayWidth(char);
    if (width + charWidth > maxWidth - 1) break;
    out += char;
    width += charWidth;
  }
  return `${out}…`;
}

export interface TableColumn {
  header: string;
  /** 最大显示宽度（超出截断），不传则不截断 */
  maxWidth?: number;
  align?: 'left' | 'right';
}

/** 打印对齐的文本表格（无外框，适配窄终端） */
export function printTable(columns: TableColumn[], rows: Array<Array<string | number | null | undefined>>): void {
  const cells = rows.map((row) =>
    columns.map((column, index) => {
      const raw = row[index] === null || row[index] === undefined ? '' : String(row[index]);
      return column.maxWidth ? truncateDisplay(raw, column.maxWidth) : raw;
    }),
  );

  const widths = columns.map((column, index) =>
    Math.max(displayWidth(column.header), ...cells.map((row) => displayWidth(row[index] ?? ''))),
  );

  const line = (values: string[]) =>
    values
      .map((value, index) => {
        const padded = padDisplay(value, widths[index]);
        return columns[index]?.align === 'right' ? padded.trimStart().padStart(widths[index]) : padded;
      })
      .join('  ');

  console.log(chalk.bold(`  ${line(columns.map((column) => column.header))}`));
  console.log(chalk.gray(`  ${widths.map((width) => '─'.repeat(width)).join('  ')}`));
  for (const row of cells) {
    console.log(`  ${line(row)}`);
  }
}

/** 键值详情（键统一宽度，值可为多行） */
export function printKeyValues(entries: Array<[string, unknown]>): void {
  const visible = entries.filter(([, value]) => value !== undefined && value !== null && value !== '');
  const width = Math.max(...visible.map(([key]) => displayWidth(key)), 0);
  for (const [key, value] of visible) {
    const text = Array.isArray(value) ? value.join(', ') : String(value);
    const lines = text.split('\n');
    console.log(`  ${padDisplay(`${key}:`, width + 1)} ${lines[0]}`);
    for (const line of lines.slice(1)) {
      console.log(`  ${' '.repeat(width + 2)}${line}`);
    }
  }
}

export function printHeading(title: string): void {
  console.log(chalk.bold(`\n${title}`));
}

export function printDivider(width = 60): void {
  console.log(chalk.gray('─'.repeat(width)));
}

export function printInfo(message: string): void {
  console.log(message);
}

export function printSuccess(message: string): void {
  console.log(chalk.green(message));
}

export function printWarning(message: string): void {
  // JSON 模式下 stdout 必须保持可解析，提示信息统一走 stderr
  if (runtime.json) {
    console.error(chalk.yellow(message));
  } else {
    console.log(chalk.yellow(message));
  }
}

/** 用户取消破坏性操作：JSON 模式输出可解析结果 */
export function printCancelled(): void {
  if (runtime.json) {
    printJson({ cancelled: true });
    return;
  }
  console.log('已取消。');
}

/** 格式化引擎返回的时间（ISO / LocalDateTime）为易读形式 */
export function formatDateTime(value?: string | null): string | undefined {
  if (!value) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  return text.replace('T', ' ').replace(/\.\d+$/, '');
}

/** 解析引擎任务/实体的 platformCodes 字段（JSON 数组字符串） */
export function formatPlatformCodes(raw?: string | null): string {
  if (!raw) return '—';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length ? parsed.join(', ') : '—';
  } catch {
    // 非 JSON，按原文展示
  }
  return String(raw);
}

export function parseJsonArray(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function statusLabel(status?: string | null): string {
  return status ? String(status) : '—';
}
