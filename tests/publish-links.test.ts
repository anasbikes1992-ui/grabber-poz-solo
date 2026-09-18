import { describe, expect, it } from 'vitest';
import { buildPublishPresets } from '@/lib/social/publish-links';

describe('buildPublishPresets', () => {
  it('builds whatsapp + ig presets when handles exist', () => {
    const presets = buildPublishPresets({
      channels: {
        whatsapp: { phone: '+94771234567' },
        instagram: { handle: 'grabber.lk' },
      },
      campaignTitle: 'Spring drop',
    });
    expect(presets.some((p) => p.channelId === 'whatsapp')).toBe(true);
    expect(presets.some((p) => p.channelId === 'instagram')).toBe(true);
  });
});
