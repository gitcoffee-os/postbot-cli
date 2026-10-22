import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { PostbotClient } from '@gitcoffee/postbot-sdk';

export interface AppConfig {
  currentApp: 'postbot' | 'postar';
  accounts: {
    [key: string]: {
      username: string;
      token: string;
      expiresAt: string;
      baseUrl: string;
    };
  };
  developer: {
    clientId: string;
    clientSecret: string;
    iamBaseUrl: string;
    proxyAppId: string;
  };
}

const CONFIG_DIR = join(homedir(), '.config', 'postbot-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const APP_CONFIGS = {
  postbot: {
    baseUrl: process.env.POSTBOT_BASE_URL || 'https://api.exmay.com',
    baseApi: process.env.POSTBOT_API_URL || 'https://api.exmay.com/exmay/authority/api',
    appId: process.env.POSTBOT_APP_ID || 'postbot-app',
    proxyAppId: process.env.POSTBOT_PROXY_APP_ID || 'postbot-app',
  },
  postar: {
    baseUrl: process.env.POSTAR_BASE_URL || 'https://postar.exmay.com',
    baseApi: process.env.POSTAR_API_URL || 'https://postar.exmay.com/exmay/authority/api',
    appId: process.env.POSTAR_APP_ID || 'postar-app',
    proxyAppId: process.env.POSTAR_PROXY_APP_ID || 'postar-app',
  },
};

const DEFAULT_CONFIG: AppConfig = {
  currentApp: 'postbot',
  accounts: {},
  developer: {
    clientId: '',
    clientSecret: '',
    iamBaseUrl: 'https://api.exmay.com',
    proxyAppId: process.env.POSTBOT_PROXY_APP_ID || 'postbot-app',
  },
};

function cloneDefaultConfig(): AppConfig {
  return {
    currentApp: DEFAULT_CONFIG.currentApp,
    accounts: {},
    developer: { ...DEFAULT_CONFIG.developer },
  };
}

/** 返回配置副本，避免调用方修改默认配置对象造成跨调用污染。 */
export function getConfig(): AppConfig {
  if (!existsSync(CONFIG_FILE)) {
    return cloneDefaultConfig();
  }
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      currentApp: parsed.currentApp ?? DEFAULT_CONFIG.currentApp,
      accounts: parsed.accounts ?? {},
      developer: {
        ...DEFAULT_CONFIG.developer,
        ...(parsed.developer ?? {}),
      },
    };
  } catch {
    return cloneDefaultConfig();
  }
}

/** 配置文件路径（供 `postbot config --show` 与排障使用） */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function saveConfig(config: AppConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function getAppConfig(app?: 'postbot' | 'postar') {
  const config = appName(app);
  return APP_CONFIGS[config];
}

export function appName(app?: 'postbot' | 'postar'): 'postbot' | 'postar' {
  if (app) return app;
  const config = getConfig();
  return config.currentApp || 'postbot';
}

export function getCurrentToken(app?: 'postbot' | 'postar'): string | null {
  const config = getConfig();
  const appKey = appName(app);
  const account = config.accounts[appKey];
  if (!account) return null;

  if (new Date(account.expiresAt) < new Date()) {
    return null;
  }

  return account.token;
}

export function setCurrentToken(token: string, username: string, expiresInSeconds: number, app?: 'postbot' | 'postar'): void {
  const config = getConfig();
  const appKey = appName(app);
  const appConf = APP_CONFIGS[appKey];

  config.currentApp = appKey;
  config.accounts[appKey] = {
    username,
    token,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    baseUrl: appConf.baseUrl,
  };

  saveConfig(config);
}

export function setDefaultApp(app: 'postbot' | 'postar'): void {
  const config = getConfig();
  config.currentApp = app;
  saveConfig(config);
}

export function clearToken(app?: 'postbot' | 'postar'): void {
  const config = getConfig();
  const appKey = appName(app);
  delete config.accounts[appKey];
  saveConfig(config);
}

export function createApiClient(app?: 'postbot' | 'postar'): PostbotClient {
  const appKey = appName(app);
  const appConf = getAppConfig(appKey);
  return new PostbotClient({
    baseUrl: appConf.baseApi,
    appId: appConf.appId,
    token: getCurrentToken(appKey) ?? undefined,
  });
}
