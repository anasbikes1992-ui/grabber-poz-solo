import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';
import {
  DEFAULT_SOCIAL_CHANNELS,
  normalizeHandle,
  SOCIAL_CHANNEL_DEFS,
  type SocialChannelId,
  type SocialChannelsConfig,
} from '@/lib/social/channels';

export async function readSocialChannels(): Promise<SocialChannelsConfig> {
  const cfg = await readConfigJson();
  const raw = (cfg.socialChannels || {}) as SocialChannelsConfig;
  return { ...DEFAULT_SOCIAL_CHANNELS, ...raw };
}

export async function writeSocialChannels(patch: SocialChannelsConfig) {
  const current = await readSocialChannels();
  const next: SocialChannelsConfig = { ...current };

  for (const def of SOCIAL_CHANNEL_DEFS) {
    const incoming = patch[def.id];
    if (!incoming) continue;
    const prefix = def.handlePrefix === '+' ? '+' : def.handlePrefix === '' ? '' : '@';
    next[def.id] = {
      ...current[def.id],
      ...incoming,
      handle: incoming.handle !== undefined ? normalizeHandle(incoming.handle, prefix as '@' | '+' | '') : current[def.id]?.handle,
    };
  }

  await mergeConfigJson({ socialChannels: next });
  return next;
}

export function getChannelProfile(channels: SocialChannelsConfig, id: SocialChannelId) {
  return channels[id];
}
