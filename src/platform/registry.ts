/**
 * 支持的平台注册表
 *
 * 来源：
 * - apps/postbot/src/media/platform/index.ts
 * - packages/postbot-engine/publisher-cn/src/platform/index.ts
 * - packages/postbot-engine/publisher-en/src/platform/index.ts
 *
 * 内容类型：article / moment / video / audio
 */

export type ContentType = 'article' | 'moment' | 'video' | 'audio';

export interface PlatformMeta {
  code: string;
  name: string;
  contentTypes: ContentType[];
  locale: 'cn' | 'en';
}

export const CONTENT_TYPES: ContentType[] = ['article', 'moment', 'video', 'audio'];

// 中文平台（publisher-cn / apps/postbot）
const CN_PLATFORMS: PlatformMeta[] = [
  { code: 'weixin', name: '公众号', contentTypes: ['article', 'moment'], locale: 'cn' },
  { code: 'toutiao', name: '头条号 / 微头条', contentTypes: ['article', 'moment', 'video'], locale: 'cn' },
  { code: 'xiaohongshu', name: '小红书', contentTypes: ['article', 'moment', 'video'], locale: 'cn' },
  { code: 'zhihu', name: '知乎', contentTypes: ['article', 'moment', 'video'], locale: 'cn' },
  { code: 'weibo', name: '微博', contentTypes: ['article', 'moment', 'video'], locale: 'cn' },
  { code: 'baijiahao', name: '百家号', contentTypes: ['article', 'moment'], locale: 'cn' },
  { code: 'qq_om', name: '企鹅号', contentTypes: ['article', 'video'], locale: 'cn' },
  { code: 'weixin_channels', name: '视频号', contentTypes: ['article', 'moment', 'video'], locale: 'cn' },
  { code: 'douyin', name: '抖音', contentTypes: ['article', 'moment', 'video'], locale: 'cn' },
  { code: 'kuaishou', name: '快手', contentTypes: ['article', 'moment', 'video'], locale: 'cn' },
  { code: 'bilibili', name: '哔哩哔哩', contentTypes: ['article', 'moment', 'video'], locale: 'cn' },
  { code: 'douban', name: '豆瓣', contentTypes: ['article', 'moment'], locale: 'cn' },
  { code: 'jianshu', name: '简书', contentTypes: ['article'], locale: 'cn' },
  { code: 'zsxq', name: '知识星球', contentTypes: ['article', 'moment'], locale: 'cn' },
  { code: 'music163', name: '网易云音乐', contentTypes: ['audio'], locale: 'cn' },
  { code: 'qqmusic', name: 'QQ音乐', contentTypes: ['audio'], locale: 'cn' },
  { code: 'ximalaya', name: '喜马拉雅', contentTypes: ['audio'], locale: 'cn' },
  { code: 'qingting', name: '蜻蜓FM', contentTypes: ['audio'], locale: 'cn' },
  { code: 'lizhi', name: '荔枝FM', contentTypes: ['audio'], locale: 'cn' },
  { code: 'xiaoyuzhoufm', name: '小宇宙', contentTypes: ['audio'], locale: 'cn' },
];

// 英文平台（publisher-en）
const EN_PLATFORMS: PlatformMeta[] = [
  { code: 'facebook', name: 'Facebook', contentTypes: ['moment'], locale: 'en' },
  { code: 'youtube', name: 'YouTube', contentTypes: ['video'], locale: 'en' },
  { code: 'tiktok', name: 'TikTok', contentTypes: ['moment', 'video'], locale: 'en' },
  { code: 'instagram', name: 'Instagram', contentTypes: ['moment', 'video'], locale: 'en' },
  { code: 'whatsapp', name: 'WhatsApp', contentTypes: ['moment'], locale: 'en' },
  { code: 'linkedin', name: 'LinkedIn', contentTypes: ['article', 'moment'], locale: 'en' },
  { code: 'telegram', name: 'Telegram', contentTypes: ['moment'], locale: 'en' },
  { code: 'x', name: 'X', contentTypes: ['moment', 'video'], locale: 'en' },
  { code: 'pinterest', name: 'Pinterest', contentTypes: ['moment'], locale: 'en' },
  { code: 'reddit', name: 'Reddit', contentTypes: ['moment'], locale: 'en' },
  { code: 'discord', name: 'Discord', contentTypes: ['moment'], locale: 'en' },
  { code: 'wordpress', name: 'WordPress', contentTypes: ['article'], locale: 'en' },
  { code: 'github', name: 'GitHub', contentTypes: ['article'], locale: 'en' },
  { code: 'medium', name: 'Medium', contentTypes: ['article'], locale: 'en' },
  { code: 'substack', name: 'Substack', contentTypes: ['article'], locale: 'en' },
  { code: 'devto', name: 'Dev.to', contentTypes: ['article'], locale: 'en' },
  { code: 'spotify', name: 'Spotify', contentTypes: ['audio'], locale: 'en' },
  { code: 'hashnode', name: 'Hashnode', contentTypes: ['article'], locale: 'en' },
  { code: 'blogger', name: 'Blogger', contentTypes: ['article'], locale: 'en' },
  { code: 'ghost', name: 'Ghost', contentTypes: ['article'], locale: 'en' },
  { code: 'vimeo', name: 'Vimeo', contentTypes: ['video'], locale: 'en' },
  { code: 'dailymotion', name: 'Dailymotion', contentTypes: ['video'], locale: 'en' },
  { code: 'twitch', name: 'Twitch', contentTypes: ['video'], locale: 'en' },
  { code: 'apple_music', name: 'Apple Music', contentTypes: ['audio'], locale: 'en' },
  { code: 'soundcloud', name: 'SoundCloud', contentTypes: ['audio'], locale: 'en' },
  { code: 'audiomack', name: 'Audiomack', contentTypes: ['audio'], locale: 'en' },
  { code: 'deezer', name: 'Deezer', contentTypes: ['audio'], locale: 'en' },
  { code: 'tidal', name: 'Tidal', contentTypes: ['audio'], locale: 'en' },
  { code: 'facebook_reels', name: 'Facebook Reels', contentTypes: ['video'], locale: 'en' },
  { code: 'instagram_reels', name: 'Instagram Reels', contentTypes: ['video'], locale: 'en' },
  { code: 'pinterest_video', name: 'Pinterest Video', contentTypes: ['video'], locale: 'en' },
  { code: 'x_video', name: 'X Video', contentTypes: ['video'], locale: 'en' },
];

export const ALL_PLATFORMS: PlatformMeta[] = [...CN_PLATFORMS, ...EN_PLATFORMS];

export function getPlatformsByType(type?: ContentType): PlatformMeta[] {
  if (!type) return ALL_PLATFORMS;
  return ALL_PLATFORMS.filter(p => p.contentTypes.includes(type));
}

export function getPlatform(code: string): PlatformMeta | undefined {
  return ALL_PLATFORMS.find(p => p.code === code);
}

export function isValidPlatformCode(code: string): boolean {
  return ALL_PLATFORMS.some(p => p.code === code);
}

export function isPlatformSupported(code: string, type: ContentType): boolean {
  const platform = getPlatform(code);
  return platform ? platform.contentTypes.includes(type) : false;
}

export function getContentTypeChoices(): ContentType[] {
  return CONTENT_TYPES;
}

export function getPlatformChoices(type?: ContentType): Array<{ name: string; value: string }> {
  return getPlatformsByType(type).map(p => ({
    name: `${p.name} (${p.code})`,
    value: p.code,
  }));
}

export function validatePlatformCodes(codes: string[], type?: ContentType): { valid: string[]; invalid: string[]; unsupported: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const unsupported: string[] = [];

  for (const code of codes) {
    const platform = getPlatform(code);
    if (!platform) {
      invalid.push(code);
    } else if (type && !platform.contentTypes.includes(type)) {
      unsupported.push(code);
    } else {
      valid.push(code);
    }
  }

  return { valid, invalid, unsupported };
}
