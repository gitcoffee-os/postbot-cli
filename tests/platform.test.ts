import { describe, expect, it } from 'vitest';
import {
  getPlatform,
  normalizePlatformCode,
  normalizePlatformCodes,
  parsePlatformCodesInput,
  validatePlatformCodes,
} from '../src/platform/registry.js';

describe('platform registry', () => {
  it('normalizes engine aliases to canonical codes', () => {
    expect(normalizePlatformCode('xhs')).toBe('xiaohongshu');
    expect(normalizePlatformCode('channels')).toBe('weixin_channels');
    expect(normalizePlatformCode('wechat_channels')).toBe('weixin_channels');
    expect(normalizePlatformCode('weixinmp')).toBe('weixin');
    expect(normalizePlatformCode('wechat_mp')).toBe('weixin');
    expect(normalizePlatformCode('xianyu')).toBe('xianyu');
    expect(normalizePlatformCode('goofish')).toBe('xianyu');
  });

  it('keeps canonical codes unchanged and trims/lowercases', () => {
    expect(normalizePlatformCode('  XiaoHongShu ')).toBe('xiaohongshu');
    expect(normalizePlatformCode('weixin_channels')).toBe('weixin_channels');
  });

  it('deduplicates aliases while preserving order', () => {
    expect(normalizePlatformCodes(['xhs', 'xiaohongshu', 'weixin', 'wx'])).toEqual([
      'xiaohongshu',
      'weixin',
      'wx',
    ]);
  });

  it('parses comma-separated, Chinese comma and JSON array input', () => {
    expect(parsePlatformCodesInput('weixin, xhs，douyin')).toEqual([
      'weixin',
      'xiaohongshu',
      'douyin',
    ]);
    expect(parsePlatformCodesInput('["xhs","channels"]')).toEqual([
      'xiaohongshu',
      'weixin_channels',
    ]);
  });

  it('exposes xianyu/goofish as a moment platform', () => {
    expect(getPlatform('goofish')?.code).toBe('xianyu');
    expect(getPlatform('xianyu')?.contentTypes).toContain('moment');
  });

  it('reports unsupported content types and unknown codes', () => {
    const result = validatePlatformCodes(['weixin', 'unknown', 'jianshu'], 'audio');
    expect(result.invalid).toEqual(['unknown']);
    expect(result.unsupported).toEqual(['weixin', 'jianshu']);
    expect(result.valid).toEqual([]);
  });
});
