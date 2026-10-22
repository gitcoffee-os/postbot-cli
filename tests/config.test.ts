import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ files: new Map<string, string>() }));

vi.mock('node:fs', () => ({
  existsSync: (path: string) => state.files.has(path),
  readFileSync: (path: string) => {
    const value = state.files.get(path);
    if (value === undefined) throw new Error(`ENOENT: ${path}`);
    return value;
  },
  writeFileSync: (path: string, content: string) => {
    state.files.set(path, String(content));
  },
  mkdirSync: () => undefined,
}));

vi.mock('node:os', () => ({
  homedir: () => '/tmp/postbot-cli-test',
}));

const {
  appName,
  clearToken,
  getAppConfig,
  getConfig,
  getConfigPath,
  getCurrentToken,
  saveConfig,
  setCurrentToken,
  setDefaultApp,
} = await import('../src/config.js');

const CONFIG_FILE = '/tmp/postbot-cli-test/.config/postbot-cli/config.json';

describe('config', () => {
  beforeEach(() => {
    state.files.clear();
  });

  it('returns defaults when the config file does not exist', () => {
    const config = getConfig();
    expect(config.currentApp).toBe('postbot');
    expect(config.developer.iamBaseUrl).toBe('https://api.exmay.com');
    expect(config.accounts).toEqual({});
  });

  it('returns a fresh default object (no cross-call mutation)', () => {
    const first = getConfig();
    first.developer.clientId = 'mutated';
    expect(getConfig().developer.clientId).toBe('');
  });

  it('deep-merges a partial developer config', () => {
    state.files.set(CONFIG_FILE, JSON.stringify({ developer: { clientId: 'abc' } }));
    const config = getConfig();
    expect(config.developer.clientId).toBe('abc');
    expect(config.developer.iamBaseUrl).toBe('https://api.exmay.com');
    expect(config.currentApp).toBe('postbot');
  });

  it('resolves app names and app configs', () => {
    expect(appName('postar')).toBe('postar');
    expect(appName()).toBe('postbot');
    expect(getAppConfig('postbot').appId).toBe('postbot-app');
    expect(getAppConfig('postbot').baseUrl).toBe('https://api.exmay.com');
    expect(getAppConfig('postar').baseUrl).toBe('https://postar.exmay.com');
  });

  it('round-trips tokens and clears them', () => {
    setCurrentToken('token-1', 'alice', 3600, 'postbot');
    expect(getCurrentToken('postbot')).toBe('token-1');
    expect(JSON.parse(state.files.get(CONFIG_FILE)!).currentApp).toBe('postbot');

    clearToken('postbot');
    expect(getCurrentToken('postbot')).toBeNull();
  });

  it('treats expired tokens as missing', () => {
    setCurrentToken('token-1', 'alice', -10, 'postbot');
    expect(getCurrentToken('postbot')).toBeNull();
  });

  it('persists the default app', () => {
    setDefaultApp('postar');
    expect(getConfig().currentApp).toBe('postar');
  });

  it('exposes the config path', () => {
    expect(getConfigPath()).toBe(CONFIG_FILE);
  });

  it('saves explicit config', () => {
    const config = getConfig();
    config.developer.clientId = 'id-1';
    saveConfig(config);
    expect(JSON.parse(state.files.get(CONFIG_FILE)!).developer.clientId).toBe('id-1');
  });
});
