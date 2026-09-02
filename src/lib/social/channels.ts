/** Social channel registry — handles, tracking, and creative export specs. */

export type SocialChannelId =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'whatsapp'
  | 'youtube'
  | 'google';

export type SocialChannelProfile = {
  handle?: string;
  profileUrl?: string;
  pageId?: string;
  adAccountId?: string;
  enabled?: boolean;
  phone?: string;
};

export type SocialChannelsConfig = Partial<Record<SocialChannelId, SocialChannelProfile>>;

export type ChannelExportSpec = {
  aspectRatio: '9:16' | '1:1' | '16:9';
  label: string;
  maxSeconds?: number;
};

export type SocialChannelDef = {
  id: SocialChannelId;
  label: string;
  handlePrefix: string;
  handlePlaceholder: string;
  profileUrlPlaceholder: string;
  exports: ChannelExportSpec[];
  trackingKeys: ('metaPixelId' | 'tiktokPixelId' | 'ga4Id' | 'gtmId')[];
};

export const SOCIAL_CHANNEL_DEFS: SocialChannelDef[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    handlePrefix: '@',
    handlePlaceholder: 'grabberstore',
    profileUrlPlaceholder: 'https://facebook.com/grabberstore',
    exports: [
      { aspectRatio: '1:1', label: 'Feed post' },
      { aspectRatio: '9:16', label: 'Stories / Reels' },
      { aspectRatio: '16:9', label: 'Link ad' },
    ],
    trackingKeys: ['metaPixelId'],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handlePrefix: '@',
    handlePlaceholder: 'grabberstore',
    profileUrlPlaceholder: 'https://instagram.com/grabberstore',
    exports: [
      { aspectRatio: '1:1', label: 'Feed' },
      { aspectRatio: '9:16', label: 'Reels / Stories', maxSeconds: 90 },
    ],
    trackingKeys: ['metaPixelId'],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    handlePrefix: '@',
    handlePlaceholder: 'grabberstore',
    profileUrlPlaceholder: 'https://tiktok.com/@grabberstore',
    exports: [{ aspectRatio: '9:16', label: 'TikTok video', maxSeconds: 60 }],
    trackingKeys: ['tiktokPixelId'],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    handlePrefix: '+',
    handlePlaceholder: '94771234567',
    profileUrlPlaceholder: 'https://wa.me/94771234567',
    exports: [{ aspectRatio: '9:16', label: 'Status / broadcast' }],
    trackingKeys: [],
  },
  {
    id: 'youtube',
    label: 'YouTube',
    handlePrefix: '@',
    handlePlaceholder: 'grabberstore',
    profileUrlPlaceholder: 'https://youtube.com/@grabberstore',
    exports: [{ aspectRatio: '16:9', label: 'Short / promo' }],
    trackingKeys: ['ga4Id'],
  },
  {
    id: 'google',
    label: 'Google Business',
    handlePrefix: '',
    handlePlaceholder: 'Grabber Store Colombo',
    profileUrlPlaceholder: 'https://maps.google.com/?cid=...',
    exports: [],
    trackingKeys: ['ga4Id', 'gtmId'],
  },
];

export function normalizeHandle(raw: string, prefix: '@' | '+' | '' = '@'): string {
  const t = raw.trim();
  if (!t) return '';
  if (prefix === '+') return t.replace(/\D/g, '');
  return t.replace(/^@+/, '').replace(/\s+/g, '');
}

export function displayHandle(profile: SocialChannelProfile | undefined, prefix: '@' | '+' | '' = '@'): string {
  const h = profile?.handle?.trim();
  if (!h) return 'Not set';
  if (prefix === '+') return `+${h.replace(/\D/g, '')}`;
  if (prefix === '') return h;
  return `@${normalizeHandle(h)}`;
}

export function profileUrlForChannel(
  channelId: SocialChannelId,
  profile: SocialChannelProfile | undefined,
): string | null {
  if (profile?.profileUrl?.trim()) return profile.profileUrl.trim();
  const handle = normalizeHandle(profile?.handle || '', channelId === 'whatsapp' ? '+' : '@');
  if (!handle) return null;
  switch (channelId) {
    case 'facebook':
      return `https://facebook.com/${handle}`;
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'tiktok':
      return `https://tiktok.com/@${handle}`;
    case 'whatsapp':
      return `https://wa.me/${handle.replace(/\D/g, '')}`;
    case 'youtube':
      return `https://youtube.com/@${handle}`;
    default:
      return null;
  }
}

export const DEFAULT_SOCIAL_CHANNELS: SocialChannelsConfig = {
  facebook: { enabled: true },
  instagram: { enabled: true },
  tiktok: { enabled: true },
  whatsapp: { enabled: true },
  youtube: { enabled: false },
  google: { enabled: false },
};
