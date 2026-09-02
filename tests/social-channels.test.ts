import { describe, it, expect } from 'vitest';
import {
  normalizeHandle,
  displayHandle,
  profileUrlForChannel,
  SOCIAL_CHANNEL_DEFS,
} from '../src/lib/social/channels';

describe('social channel handles', () => {
  it('normalizes @handles', () => {
    expect(normalizeHandle('@GrabberStore')).toBe('GrabberStore');
    expect(displayHandle({ handle: 'GrabberStore' })).toBe('@GrabberStore');
  });

  it('normalizes WhatsApp phone numbers', () => {
    expect(normalizeHandle('+94 77 123 4567', '+')).toBe('94771234567');
    expect(displayHandle({ handle: '94771234567' }, '+')).toBe('+94771234567');
  });

  it('builds profile URLs from handles', () => {
    expect(profileUrlForChannel('instagram', { handle: 'grabberstore' })).toBe(
      'https://instagram.com/grabberstore',
    );
    expect(profileUrlForChannel('tiktok', { handle: '@grabberstore' })).toBe(
      'https://tiktok.com/@grabberstore',
    );
  });

  it('defines export specs for major channels', () => {
    const ig = SOCIAL_CHANNEL_DEFS.find((c) => c.id === 'instagram');
    expect(ig?.exports.some((e) => e.aspectRatio === '9:16')).toBe(true);
  });
});
