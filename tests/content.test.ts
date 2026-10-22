import { describe, expect, it } from 'vitest';
import {
  buildTaskData,
  loadContent,
  normalizeOnlineTime,
  toEngineLocalDateTime,
  validateContentForType,
} from '../src/content.js';

describe('normalizeOnlineTime', () => {
  it('accepts engine local formats', () => {
    expect(normalizeOnlineTime('2026-09-01 09:30:00')).toBe('2026-09-01 09:30:00');
    expect(normalizeOnlineTime('2026-09-01T09:30:00')).toBe('2026-09-01 09:30:00');
    expect(normalizeOnlineTime('2026-09-01 09:30')).toBe('2026-09-01 09:30:00');
    expect(normalizeOnlineTime('2026-09-01')).toBe('2026-09-01 00:00:00');
  });

  it('keeps millisecond timestamps and converts second timestamps', () => {
    expect(normalizeOnlineTime('1767225600000')).toBe('1767225600000');
    expect(normalizeOnlineTime('1767225600')).toBe('1767225600000');
  });

  it('treats empty input as immediate', () => {
    expect(normalizeOnlineTime('')).toBe('');
    expect(normalizeOnlineTime(undefined)).toBe('');
  });

  it('rejects invalid values with a helpful message', () => {
    expect(() => normalizeOnlineTime('next tuesday')).toThrow(/无法识别的发布时间/);
    expect(() => normalizeOnlineTime('12345')).toThrow(/无法识别的时间戳/);
  });
});

describe('toEngineLocalDateTime', () => {
  it('converts engine display formats to Jackson LocalDateTime', () => {
    expect(toEngineLocalDateTime('2026-09-01 09:30:00')).toBe('2026-09-01T09:30:00');
    expect(toEngineLocalDateTime('2026-09-01T09:30:00')).toBe('2026-09-01T09:30:00');
    expect(toEngineLocalDateTime('2026-09-01')).toBe('2026-09-01T00:00:00');
  });

  it('converts timestamps to local ISO', () => {
    expect(toEngineLocalDateTime('1767225600000')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });
});

describe('loadContent', () => {
  it('parses inline JSON and applies title override', () => {
    const content = loadContent({
      contentJson: '{"title":"old","content":"body","platformCodes":["xhs"]}',
      title: 'new',
    });
    expect(content.title).toBe('new');
    expect(content.content).toBe('body');
    expect(content.platformCodes).toEqual(['xiaohongshu']);
  });

  it('rejects arrays and invalid JSON', () => {
    expect(() => loadContent({ contentJson: '[]' })).toThrow(/JSON 对象/);
    expect(() => loadContent({ contentJson: '{' })).toThrow(/不是合法 JSON/);
  });
});

describe('buildTaskData', () => {
  it('writes canonical platform codes and normalized schedule', () => {
    const data = buildTaskData({
      content: { title: 'hello' },
      platformCodes: ['xhs', 'channels'],
      scheduledAt: '2026-09-01 09:00',
    });
    expect(data.platformCodes).toEqual(['xiaohongshu', 'weixin_channels']);
    expect(data.onlineTime).toBe('2026-09-01 09:00:00');
  });

  it('normalizes existing onlineTime when scheduledAt is omitted', () => {
    const data = buildTaskData({
      content: { onlineTime: '2026-09-01T09:00:00' },
      platformCodes: ['weixin'],
    });
    expect(data.onlineTime).toBe('2026-09-01 09:00:00');
  });
});

describe('validateContentForType', () => {
  it('requires media for video/audio when auto publishing', () => {
    expect(() => validateContentForType({}, 'video', { autoPublish: true })).toThrow(/videoData/);
    expect(() => validateContentForType({}, 'audio', { autoPublish: true })).toThrow(/audioData/);
  });

  it('allows incomplete drafts but reports problems', () => {
    expect(validateContentForType({}, 'video', { autoPublish: false })).toHaveLength(1);
  });

  it('accepts media references', () => {
    expect(() =>
      validateContentForType({ videoData: { objectUrl: 'https://x/y.mp4' } }, 'video', {
        autoPublish: true,
      }),
    ).not.toThrow();
  });
});
