/**
 * 支持的平台注册表。
 *
 * 平台编号（code）以 exmay-postbot-engine 的 `exmay_postbot_media_platform.code`
 * 为准，并与 PostBot 前端 / publisher-cn / publisher-en / publisher-industry 的
 * 注册 key 保持一致。
 *
 * 引擎在保存任务时会把历史短码归一化：
 * - xhs            → xiaohongshu
 * - channels       → weixin_channels
 * - wechat_channels→ weixin_channels
 * - weixinmp       → weixin
 * - wechat_mp      → weixin
 *
 * 本 CLI 额外接受 `goofish` → `xianyu`（闲鱼），并统一输出引擎标准码。
 */

import type { ContentType } from '../constants.js';

export type { ContentType };

export interface PlatformMeta {
  code: string;
  name: string;
  contentTypes: ContentType[];
  locale: 'cn' | 'en' | 'industry';
  /** 历史短码 / 常见别名（不含自身） */
  aliases?: string[];
}

export const CONTENT_TYPES: ContentType[] = ['article', 'moment', 'video', 'audio'];

/** 中文平台（publisher-cn / apps/postbot） */
const CN_PLATFORMS: PlatformMeta[] = [
  { code: 'weixin', name: '公众号', contentTypes: ['article', 'moment'], locale: 'cn', aliases: ['weixinmp', 'wechat_mp'] },
  { code: 'toutiao', name: '头条号 / 微头条', contentTypes: ['article', 'moment', 'video'], locale: 'cn' },
  { code: 'xiaohongshu', name: '小红书', contentTypes: ['article', 'moment', 'video'], locale: 'cn', aliases: ['xhs'] },
  { code: 'zhihu', name: '知乎', contentTypes: ['article', 'moment', 'video'], locale: 'cn' },
  { code: 'weibo', name: '微博', contentTypes: ['article', 'moment', 'video'], locale: 'cn' },
  { code: 'baijiahao', name: '百家号', contentTypes: ['article', 'moment'], locale: 'cn' },
  { code: 'qq_om', name: '企鹅号', contentTypes: ['article', 'video'], locale: 'cn' },
  { code: 'weixin_channels', name: '视频号', contentTypes: ['article', 'moment', 'video'], locale: 'cn', aliases: ['channels', 'wechat_channels'] },
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

/** 英文平台（publisher-en） */
const EN_PLATFORMS: PlatformMeta[] = [
  { code: 'facebook', name: 'Facebook', contentTypes: ['moment'], locale: 'en' },
  { code: 'youtube', name: 'YouTube', contentTypes: ['video'], locale: 'en' },
  { code: 'tiktok', name: 'TikTok', contentTypes: ['moment', 'video'], locale: 'en' },
  { code: 'instagram', name: 'Instagram', contentTypes: ['moment', 'video'], locale: 'en' },
  { code: 'whatsapp', name: 'WhatsApp', contentTypes: ['moment'], locale: 'en' },
  { code: 'linkedin', name: 'LinkedIn', contentTypes: ['article', 'moment'], locale: 'en' },
  { code: 'telegram', name: 'Telegram', contentTypes: ['moment'], locale: 'en' },
  { code: 'x', name: 'X', contentTypes: ['moment', 'video'], locale: 'en', aliases: ['twitter'] },
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
  { code: 'threads', name: 'Threads', contentTypes: ['moment'], locale: 'en' },
  { code: 'bluesky', name: 'Bluesky', contentTypes: ['moment'], locale: 'en' },
];

/** 行业平台（publisher-industry） */
const INDUSTRY_PLATFORMS: PlatformMeta[] = [
  { code: 'xianyu', name: '闲鱼', contentTypes: ['moment'], locale: 'industry', aliases: ['goofish', 'idlefish'] },
];

export const ALL_PLATFORMS: PlatformMeta[] = [...CN_PLATFORMS, ...EN_PLATFORMS, ...INDUSTRY_PLATFORMS];

const PLATFORM_BY_CODE = new Map(ALL_PLATFORMS.map((p) => [p.code, p]));

/** 引擎归一化别名 + CLI 补充别名，统一映射为引擎标准码 */
const PLATFORM_ALIASES = new Map<string, string>();
for (const platform of ALL_PLATFORMS) {
  for (const alias of platform.aliases ?? []) {
    PLATFORM_ALIASES.set(alias.toLowerCase(), platform.code);
  }
}

const ENGINE_ALIASES: Record<string, string> = {
  xhs: 'xiaohongshu',
  channels: 'weixin_channels',
  wechat_channels: 'weixin_channels',
  weixinmp: 'weixin',
  wechat_mp: 'weixin',
  goofish: 'xianyu',
  idlefish: 'xianyu',
};
for (const [alias, code] of Object.entries(ENGINE_ALIASES)) {
  PLATFORM_ALIASES.set(alias, code);
}

/**
 * 归一化平台编号：去空格、转小写、展开别名。
 * 未知编号原样返回（去掉首尾空格），由调用方结合引擎平台列表校验。
 */
export function normalizePlatformCode(code: string): string {
  const trimmed = String(code ?? '').trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  return PLATFORM_ALIASES.get(lower) ?? lower;
}

/** 批量归一化并去重（保留首次出现顺序） */
export function normalizePlatformCodes(codes: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of codes) {
    const code = normalizePlatformCode(raw);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    result.push(code);
  }
  return result;
}

/** 解析逗号分隔的平台编号（兼容中文逗号、空格与 JSON 数组字符串） */
export function parsePlatformCodesInput(input?: string | string[]): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return normalizePlatformCodes(input.map(String));

  const trimmed = input.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return normalizePlatformCodes(parsed.map(String));
    } catch {
      // 非合法 JSON 数组，退回分隔符解析
    }
  }
  return normalizePlatformCodes(trimmed.split(/[,，\s]+/));
}

export function getPlatformsByType(type?: ContentType): PlatformMeta[] {
  if (!type) return ALL_PLATFORMS;
  return ALL_PLATFORMS.filter((p) => p.contentTypes.includes(type));
}

export function getPlatform(code: string): PlatformMeta | undefined {
  return PLATFORM_BY_CODE.get(normalizePlatformCode(code));
}

export function isValidPlatformCode(code: string): boolean {
  return PLATFORM_BY_CODE.has(normalizePlatformCode(code));
}

export function isPlatformSupported(code: string, type: ContentType): boolean {
  const platform = getPlatform(code);
  return platform ? platform.contentTypes.includes(type) : false;
}

export function getContentTypeChoices(): ContentType[] {
  return CONTENT_TYPES;
}

export function getPlatformChoices(type?: ContentType): Array<{ name: string; value: string }> {
  return getPlatformsByType(type).map((p) => ({
    name: `${p.name} (${p.code})`,
    value: p.code,
  }));
}

/** 静态注册表校验：返回归一化后的合法 / 未知 / 类型不匹配编号 */
export function validatePlatformCodes(
  codes: string[],
  type?: ContentType,
): { valid: string[]; invalid: string[]; unsupported: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const unsupported: string[] = [];

  for (const raw of codes) {
    const code = normalizePlatformCode(raw);
    if (!code) continue;
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
