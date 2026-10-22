import inquirer from 'inquirer';
import {
  AccountApi,
  ClientApi,
  PlatformApi,
  type Account,
  type MediaClient,
  type Platform,
  type PostbotClient,
} from '@gitcoffee/postbot-sdk';
import {
  CLIENT_ONLINE_WINDOW_MS,
  type ContentType,
  type PublishChannel,
} from './constants.js';
import { displayWidth } from './output.js';
import { getPlatform, normalizePlatformCode } from './platform/registry.js';

export interface ResourceBundle {
  platforms: Platform[];
  accounts: Account[];
  clients: MediaClient[];
  platformByCode: Map<string, Platform>;
}

export interface LoadResourceOptions {
  withClients?: boolean;
  withAccounts?: boolean;
  withPlatforms?: boolean;
}

/** 一次性加载平台 / 账号 / 客户端（按需并发） */
export async function loadResources(
  client: PostbotClient,
  options: LoadResourceOptions = {},
): Promise<ResourceBundle> {
  const { withClients = false, withAccounts = true, withPlatforms = true } = options;

  const [platforms, accounts, clients] = await Promise.all([
    withPlatforms ? new PlatformApi(client).list() : Promise.resolve([] as Platform[]),
    withAccounts ? new AccountApi(client).list() : Promise.resolve([] as Account[]),
    withClients ? new ClientApi(client).list() : Promise.resolve([] as MediaClient[]),
  ]);

  const platformByCode = new Map<string, Platform>();
  for (const platform of platforms) {
    if (platform?.code) {
      platformByCode.set(normalizePlatformCode(platform.code), platform);
    }
  }

  return { platforms, accounts, clients, platformByCode };
}

export function findPlatform(bundle: ResourceBundle, code: string): Platform | undefined {
  return bundle.platformByCode.get(normalizePlatformCode(code));
}

export function findAccountByUsername(bundle: ResourceBundle, username: string): Account | undefined {
  return bundle.accounts.find((account) => account.username === username);
}

export function findAccountById(bundle: ResourceBundle, id: number): Account | undefined {
  return bundle.accounts.find((account) => Number(account.id) === id);
}

export function accountsForPlatform(bundle: ResourceBundle, platform: Platform): Account[] {
  return bundle.accounts.filter((account) => Number(account.mediaPlatformId) === Number(platform.id));
}

/** 按平台 ID 或平台 code 解析平台实体 */
export function resolvePlatformRef(bundle: ResourceBundle, ref: string | number): Platform {
  const raw = String(ref).trim();
  const platform = /^\d+$/.test(raw)
    ? bundle.platforms.find((item) => Number(item.id) === Number(raw))
    : findPlatform(bundle, raw);
  if (!platform) {
    throw new Error(
      `平台不存在: ${raw}。可用平台: ${bundle.platforms.map((item) => item.code).join(', ') || '（无）'}`,
    );
  }
  return platform;
}

/** 账号可用性优先级：ok > renew > expired > unbound */
const ACCOUNT_STATUS_WEIGHT: Record<string, number> = {
  ok: 0,
  renew: 1,
  expired: 2,
  unbound: 3,
};

function pickBestAccount(accounts: Account[]): Account | undefined {
  return [...accounts].sort((a, b) => {
    const weightA = ACCOUNT_STATUS_WEIGHT[String(a.status ?? '').toLowerCase()] ?? 4;
    const weightB = ACCOUNT_STATUS_WEIGHT[String(b.status ?? '').toLowerCase()] ?? 4;
    return weightA - weightB || Number(a.id) - Number(b.id);
  })[0];
}

export interface PreflightOptions {
  /** 自动发布时必须为每个目标平台找到账号；草稿可以没有账号 */
  requireAccounts: boolean;
  /** 内容类型，用于静态注册表的能力提示 */
  type?: string;
}

export interface PreflightResult {
  /** 每个平台选中的账号（用于主账号推断） */
  accountByPlatform: Map<string, Account>;
  warnings: string[];
}

/**
 * 保存任务前的平台 / 账号校验。
 *
 * 引擎按 `platformCodes` 逐个创建 Job，并且**按平台 ID 自动选择该用户在该平台的账号**；
 * 平台不存在或账号缺失时 Job 会被跳过 / 直接标记 FAILED。因此在 CLI 侧提前校验，
 * 避免"任务保存成功但什么都没发"。
 */
export function preflightTargets(
  bundle: ResourceBundle,
  platformCodes: string[],
  options: PreflightOptions,
): PreflightResult {
  const warnings: string[] = [];
  const normalized = platformCodes.map(normalizePlatformCode).filter(Boolean);
  const missingPlatforms: string[] = [];
  const missingAccounts: string[] = [];
  const accountByPlatform = new Map<string, Account>();

  for (const code of normalized) {
    const platform = findPlatform(bundle, code);
    if (!platform) {
      missingPlatforms.push(code);
      continue;
    }

    const rawCode = String(platform.code ?? '').toLowerCase();
    if (rawCode && rawCode !== code) {
      warnings.push(
        `引擎平台字典中的 ${rawCode} 仍是旧编号；CLI 会按标准码 ${code} 保存，` +
          '若发布 Job 未创建，请先将平台字典 code 更新为标准码。',
      );
    }

    const accounts = accountsForPlatform(bundle, platform);
    const account = pickBestAccount(accounts);
    if (!account) {
      if (options.requireAccounts) {
        missingAccounts.push(`${code}（平台 ID ${platform.id}）`);
      }
      continue;
    }

    accountByPlatform.set(code, account);

    const status = String(account.status ?? '').toLowerCase();
    if (status === 'expired') {
      warnings.push(`平台 ${code} 的账号 ${account.username} 登录已过期，发布大概率失败`);
    } else if (status === 'unbound') {
      warnings.push(`平台 ${code} 的账号 ${account.username} 未绑定会话，无法发布`);
    } else if (status === 'renew') {
      warnings.push(`平台 ${code} 的账号 ${account.username} 会话即将过期，建议先续期`);
    }

    if (options.type) {
      const meta = getPlatform(code);
      if (meta && !meta.contentTypes.includes(options.type as ContentType)) {
        warnings.push(`静态注册表中 ${code} 不支持内容类型 ${options.type}（以引擎实际发布器为准）`);
      }
    }
  }

  if (missingPlatforms.length > 0) {
    const available = bundle.platforms
      .map((platform) => platform.code)
      .filter(Boolean)
      .sort();
    const preview = available.slice(0, 30).join(', ') + (available.length > 30 ? ', ...' : '');
    throw new Error(
      `引擎中不存在平台: ${missingPlatforms.join(', ')}。` +
        `请先执行 \`postbot platform list\` 查看已配置平台。可用平台: ${preview || '（空）'}`,
    );
  }

  if (missingAccounts.length > 0) {
    throw new Error(
      `以下平台没有可用账号，自动发布会直接失败: ${missingAccounts.join('; ')}。` +
        `请先执行 \`postbot account list\` 检查绑定情况，或使用 --draft 仅保存草稿。`,
    );
  }

  return { accountByPlatform, warnings };
}

export interface ResolveAccountOptions {
  /** 账号用户名 */
  account?: string;
  /** 账号 ID */
  accountId?: number | string;
}

/** 按 --account / --account-id 解析主账号 */
export function resolveAccount(
  bundle: ResourceBundle,
  options: ResolveAccountOptions,
): Account | undefined {
  if (options.accountId !== undefined && options.accountId !== '') {
    const id = Number(options.accountId);
    if (!Number.isInteger(id)) throw new Error(`--account-id 必须是整数: ${String(options.accountId)}`);
    const account = findAccountById(bundle, id);
    if (!account) throw new Error(`账号不存在: ID ${id}`);
    return account;
  }

  if (options.account) {
    const account = findAccountByUsername(bundle, options.account);
    if (!account) {
      throw new Error(
        `账号不存在: ${options.account}。可用账号: ${bundle.accounts.map((item) => item.username).join(', ') || '（无）'}`,
      );
    }
    return account;
  }

  return undefined;
}

export function isClientOnline(client: Pick<MediaClient, 'lastOnlineAt'>): boolean {
  if (!client.lastOnlineAt) return false;
  const time = new Date(client.lastOnlineAt).getTime();
  return Number.isFinite(time) && Date.now() - time < CLIENT_ONLINE_WINDOW_MS;
}

export function describeClient(client: MediaClient): string {
  const online = isClientOnline(client) ? ', online' : ', offline';
  return `#${client.id} ${client.name} (${client.type}${online})`;
}

export interface ResolveClientOptions {
  channel: PublishChannel;
  /** --client 的原始值（id | name | clientKey） */
  explicit?: string;
}

export interface ResolveClientResult {
  client?: MediaClient;
  warnings: string[];
}

/**
 * 解析任务绑定的 mediaClientId。
 *
 * - DESKTOP 通道：引擎硬性要求 mediaClientId 非空，否则 canAutoPublish 返回 false，
 *   任务保存成功但**不会产生任何 Job**。未显式指定时自动选择在线 desktop 客户端。
 * - BROWSER_EXTENSION：可选绑定；显式指定时必须是对应类型客户端。
 * - CLOUD / BROWSER_EXTENSION_EPHEMERAL：不接受客户端绑定（引擎会按客户端类型
 *   覆盖发布通道，传入会造成通道路由与预期不一致）。
 */
export async function resolveClientForChannel(
  bundle: ResourceBundle,
  options: ResolveClientOptions,
): Promise<ResolveClientResult> {
  const warnings: string[] = [];
  const { channel, explicit } = options;

  const needsClient = channel === 'DESKTOP' || channel === 'BROWSER_EXTENSION';
  if (!needsClient) {
    if (explicit) {
      throw new Error(`--client 仅适用于 DESKTOP / BROWSER_EXTENSION 通道，当前通道为 ${channel}`);
    }
    return { warnings };
  }

  const clients = bundle.clients;
  if (explicit) {
    const found = clients.find(
      (client) =>
        String(client.id) === String(explicit) ||
        client.name === explicit ||
        client.clientKey === explicit,
    );
    if (!found) {
      throw new Error(
        `客户端不存在: ${explicit}。可用客户端: ${clients.map(describeClient).join('; ') || '（无）'}`,
      );
    }
    assertClientType(channel, found);
    if (!isClientOnline(found)) {
      warnings.push(
        `客户端 ${describeClient(found)} 当前离线；任务会等待其上线后认领执行。`,
      );
    }
    return { client: found, warnings };
  }

  if (channel !== 'DESKTOP') {
    // 浏览器扩展通道不强制绑定：扩展按通道认领该用户的任务
    return { warnings };
  }

  const onlineDesktops = clients.filter(
    (client) => String(client.type ?? '').toLowerCase() === 'desktop' && isClientOnline(client),
  );

  if (onlineDesktops.length === 0) {
    const known = clients.filter((client) => String(client.type ?? '').toLowerCase() === 'desktop');
    throw new Error(
      '当前账号下没有在线的桌面端客户端。DESKTOP 通道必须绑定 mediaClientId，' +
        '否则引擎不会创建发布 Job。请确认桌面端已登录同一账号并保持在线，' +
        '或使用 --client <id|name|clientKey> 显式指定。' +
        (known.length > 0 ? ` 已知桌面端: ${known.map(describeClient).join('; ')}` : ''),
    );
  }

  if (onlineDesktops.length === 1) {
    return { client: onlineDesktops[0], warnings };
  }

  if (!process.stdin.isTTY) {
    throw new Error(
      `存在多个在线桌面端，无法自动选择: ${onlineDesktops.map(describeClient).join('; ')}。` +
        '请使用 --client <id|name|clientKey> 指定。',
    );
  }

  const { picked } = await inquirer.prompt<{ picked: number }>([
    {
      type: 'list',
      name: 'picked',
      message: '检测到多个在线桌面端，请选择发布客户端:',
      choices: onlineDesktops.map((client) => ({ name: describeClient(client), value: client.id })),
    },
  ]);

  return { client: onlineDesktops.find((client) => Number(client.id) === Number(picked)), warnings };
}

function assertClientType(channel: PublishChannel, client: MediaClient): void {
  const type = String(client.type ?? '').toLowerCase();
  if (channel === 'DESKTOP' && type !== 'desktop') {
    throw new Error(`DESKTOP 通道需要 desktop 客户端，但 #${client.id} 的类型是 ${client.type}`);
  }
  if (channel === 'BROWSER_EXTENSION' && type !== 'browser_extension') {
    throw new Error(
      `BROWSER_EXTENSION 通道需要 browser_extension 客户端，但 #${client.id} 的类型是 ${client.type}`,
    );
  }
}

/** 解析客户端 ID（用于 client get/update/remove） */
export function resolveClientId(bundle: ResourceBundle, idOrName: string): MediaClient {
  const client = bundle.clients.find(
    (item) =>
      String(item.id) === String(idOrName) ||
      item.clientKey === idOrName ||
      item.name === idOrName,
  );
  if (!client) {
    throw new Error(
      `客户端不存在: ${idOrName}。可用客户端: ${bundle.clients.map(describeClient).join('; ') || '（无）'}`,
    );
  }
  return client;
}

export function truncate(text: string, width: number): string {
  return displayWidth(text) > width ? `${text.slice(0, Math.max(0, width - 1))}…` : text;
}
