import { describe, expect, it } from 'vitest';
import type { PostbotClient } from '@gitcoffee-os/postbot-sdk';
import { prepareTask } from '../src/task/build.js';
import type { ResourceBundle } from '../src/resources.js';
import type { Platform } from '@gitcoffee-os/postbot-sdk';

const weixin: Platform = {
  id: 1,
  name: '公众号',
  code: 'weixin',
  type: 'media',
  status: 'ok',
  sort: 10,
};

const xhs: Platform = {
  id: 2,
  name: '小红书',
  code: 'xiaohongshu',
  type: 'media',
  status: 'ok',
  sort: 20,
};

const now = new Date().toISOString();

function bundle(overrides: Partial<ResourceBundle> = {}): ResourceBundle {
  const platforms = [weixin, xhs];
  return {
    platforms,
    accounts: [
      { id: 10, username: 'wx-user', name: 'wx', status: 'ok', mediaPlatformId: 1 },
      { id: 20, username: 'xhs-user', name: 'xhs', status: 'ok', mediaPlatformId: 2 },
    ],
    clients: [],
    platformByCode: new Map(platforms.map((platform) => [platform.code, platform])),
    ...overrides,
  };
}

const fakeClient = {} as PostbotClient;

describe('prepareTask', () => {
  it('builds a multi-platform auto-publish payload', async () => {
    const prepared = await prepareTask(
      fakeClient,
      {
        name: 'demo',
        platforms: 'weixin,xhs',
        contentJson: '{"title":"Hi","content":"body"}',
      },
      bundle(),
    );

    expect(prepared.platformCodes).toEqual(['weixin', 'xiaohongshu']);
    expect(prepared.payload.name).toBe('demo');
    expect(prepared.payload.isAutoPublish).toBe(true);
    expect(prepared.payload.publishChannel).toBe('CLOUD');
    expect(prepared.payload.mediaAccountId).toBe(10);
    expect(prepared.payload.mediaPlatformId).toBe(1);
    expect(prepared.payload.mediaClientId).toBeUndefined();
    expect(prepared.data.title).toBe('Hi');
    expect(prepared.data.platformCodes).toEqual(['weixin', 'xiaohongshu']);
  });

  it('creates drafts without requiring accounts', async () => {
    const prepared = await prepareTask(
      fakeClient,
      {
        platforms: 'weixin',
        contentJson: '{"title":"Draft"}',
        draft: true,
      },
      bundle({ accounts: [] }),
    );

    expect(prepared.autoPublish).toBe(false);
    expect(prepared.payload.isAutoPublish).toBe(false);
  });

  it('fails when an auto-publish target has no account', async () => {
    await expect(
      prepareTask(
        fakeClient,
        { platforms: 'weixin', contentJson: '{"title":"Hi"}' },
        bundle({ accounts: [] }),
      ),
    ).rejects.toThrow(/没有可用账号/);
  });

  it('fails when the platform is not configured in the engine', async () => {
    await expect(
      prepareTask(
        fakeClient,
        { platforms: 'weibo', contentJson: '{"title":"Hi"}' },
        bundle(),
      ),
    ).rejects.toThrow(/不存在平台/);
  });

  it('binds an online desktop client for DESKTOP channel', async () => {
    const prepared = await prepareTask(
      fakeClient,
      {
        platforms: 'weixin',
        contentJson: '{"title":"Hi"}',
        channel: 'DESKTOP',
      },
      bundle({
        clients: [
          {
            id: 99,
            name: 'mac',
            type: 'desktop',
            clientKey: 'key-1',
            lastOnlineAt: now,
          },
        ],
      }),
    );

    expect(prepared.payload.publishChannel).toBe('DESKTOP');
    expect(prepared.payload.mediaClientId).toBe(99);
  });

  it('rejects DESKTOP without an online desktop client', async () => {
    await expect(
      prepareTask(
        fakeClient,
        {
          platforms: 'weixin',
          contentJson: '{"title":"Hi"}',
          channel: 'DESKTOP',
        },
        bundle(),
      ),
    ).rejects.toThrow(/没有在线的桌面端客户端/);
  });

  it('normalizes schedules and warns about past times', async () => {
    const prepared = await prepareTask(
      fakeClient,
      {
        platforms: 'weixin',
        contentJson: '{"title":"Hi"}',
        scheduledAt: '2020-01-01 00:00:00',
      },
      bundle(),
    );
    expect(prepared.data.onlineTime).toBe('2020-01-01 00:00:00');
    expect(prepared.warnings.join('\n')).toMatch(/已过去/);
  });
});
