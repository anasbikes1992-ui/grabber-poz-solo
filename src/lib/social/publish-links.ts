import type { SocialChannelId, SocialChannelsConfig } from '@/lib/social/channels';
import { profileUrlForChannel } from '@/lib/social/channels';

export type PublishPreset = {
  channelId: SocialChannelId;
  label: string;
  aspectRatio: string;
  action: 'open' | 'copy' | 'whatsapp';
  url?: string;
  copyText?: string;
};

export function buildPublishPresets(input: {
  channels: SocialChannelsConfig;
  campaignTitle: string;
  mediaUrl?: string;
  ctaText?: string;
}): PublishPreset[] {
  const shopUrl = process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  const cta = input.ctaText || `Shop now: ${shopUrl}/products`;
  const caption = `${input.campaignTitle}\n\n${cta}`.trim();

  const presets: PublishPreset[] = [];

  const wa = input.channels.whatsapp;
  const waPhone = wa?.phone || wa?.handle;
  if (waPhone) {
    const digits = waPhone.replace(/\D/g, '');
    presets.push({
      channelId: 'whatsapp',
      label: 'WhatsApp broadcast',
      aspectRatio: '9:16',
      action: 'whatsapp',
      url: `https://wa.me/${digits}?text=${encodeURIComponent(caption)}`,
      copyText: caption,
    });
  }

  for (const id of ['instagram', 'facebook', 'tiktok'] as SocialChannelId[]) {
    const url = profileUrlForChannel(id, input.channels[id]);
    if (!url) continue;
    const ratio = id === 'tiktok' ? '9:16' : id === 'facebook' ? '1:1' : '9:16';
    presets.push({
      channelId: id,
      label: id === 'instagram' ? 'IG Reels' : id === 'facebook' ? 'FB Feed' : 'TikTok',
      aspectRatio: ratio,
      action: 'copy',
      url,
      copyText: `${caption}${input.mediaUrl ? `\n\nMedia: ${input.mediaUrl}` : ''}`,
    });
  }

  return presets;
}
