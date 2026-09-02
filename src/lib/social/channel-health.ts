import { resolveMarketingPixels } from '@/lib/config/resolve-marketing';
import { hasMetaConversionsApiToken } from '@/lib/config/resolve-marketing';
import { readSocialChannels } from '@/lib/social/channel-config';
import { displayHandle, profileUrlForChannel, SOCIAL_CHANNEL_DEFS, type SocialChannelId } from '@/lib/social/channels';
import { hasGpuWorker } from '@/lib/creative/gpu-worker-client';
import { hasCreativeMediaPipeline } from '@/lib/creative/media-provider';

export type ChannelHealthStatus = 'connected' | 'partial' | 'missing';

export type ChannelHealthRow = {
  id: SocialChannelId;
  label: string;
  handle: string;
  profileUrl: string | null;
  status: ChannelHealthStatus;
  tracking: { key: string; configured: boolean }[];
  notes: string[];
};

export type SocialDashboardHealth = {
  channels: ChannelHealthRow[];
  whatsappApi: boolean;
  metaCapi: boolean;
  gpuWorker: boolean;
  mediaPipeline: boolean;
};

function whatsappEnvReady(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN?.trim() && (process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID));
}

export async function buildSocialHealth(): Promise<SocialDashboardHealth> {
  const [channels, pixels] = await Promise.all([readSocialChannels(), resolveMarketingPixels()]);

  const pixelMap: Record<string, boolean> = {
    metaPixelId: Boolean(pixels.metaPixelId),
    tiktokPixelId: Boolean(pixels.tiktokPixelId),
    ga4Id: Boolean(pixels.ga4Id),
    gtmId: Boolean(pixels.gtmId),
  };

  const channelRows: ChannelHealthRow[] = SOCIAL_CHANNEL_DEFS.map((def) => {
    const profile = channels[def.id];
    const prefix = def.handlePrefix === '+' ? '+' : def.handlePrefix === '' ? '' : '@';
    const handleSet = Boolean(profile?.handle?.trim());
    const tracking = def.trackingKeys.map((key) => ({
      key,
      configured: pixelMap[key] ?? false,
    }));
    const trackingOk = def.trackingKeys.length === 0 || tracking.some((t) => t.configured);

    let status: ChannelHealthStatus = 'missing';
    const notes: string[] = [];
    if (handleSet && trackingOk) status = 'connected';
    else if (handleSet || trackingOk) {
      status = 'partial';
      if (!handleSet) notes.push('Set handle');
      if (!trackingOk && def.trackingKeys.length) notes.push('Configure pixel / analytics');
    } else {
      notes.push('Add handle + tracking');
    }

    if (def.id === 'whatsapp' && !whatsappEnvReady()) {
      status = handleSet ? 'partial' : 'missing';
      notes.push('WHATSAPP_TOKEN not configured');
    }

    return {
      id: def.id,
      label: def.label,
      handle: displayHandle(profile, prefix as '@' | '+' | ''),
      profileUrl: profileUrlForChannel(def.id, profile),
      status,
      tracking,
      notes,
    };
  });

  return {
    channels: channelRows,
    whatsappApi: whatsappEnvReady(),
    metaCapi: hasMetaConversionsApiToken(),
    gpuWorker: hasGpuWorker(),
    mediaPipeline: hasCreativeMediaPipeline(),
  };
}
