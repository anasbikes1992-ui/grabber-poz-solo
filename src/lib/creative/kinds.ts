/** Creative Engine project kinds — encoded in project title prefix. */
export type CreativeKind = 'CAMPAIGN' | 'PDF' | 'VIDEO' | 'UGC';

const PREFIX: Record<CreativeKind, string> = {
  CAMPAIGN: '[CAMPAIGN]',
  PDF: '[PDF]',
  VIDEO: '[VIDEO]',
  UGC: '[UGC]',
};

export function titleWithKind(kind: CreativeKind, title: string): string {
  const clean = stripKindPrefix(title);
  return `${PREFIX[kind]} ${clean}`.trim();
}

export function stripKindPrefix(title: string): string {
  return title.replace(/^\[(CAMPAIGN|PDF|VIDEO|UGC)\]\s*/i, '').trim();
}

export function parseCreativeKind(title: string): CreativeKind {
  const m = title.match(/^\[(CAMPAIGN|PDF|VIDEO|UGC)\]/i);
  if (!m) return 'CAMPAIGN';
  return m[1].toUpperCase() as CreativeKind;
}

export const CREATIVE_NAV = [
  { href: '/creative/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/creative/products', label: 'Products', icon: 'Package' },
  { href: '/creative/templates', label: 'Templates', icon: 'LayoutTemplate' },
  { href: '/creative/pdf', label: 'PDF Studio', icon: 'FileText' },
  { href: '/creative/videos', label: 'Video Studio', icon: 'Video' },
  { href: '/creative/ugc-ads', label: 'UGC Ads', icon: 'Megaphone' },
  { href: '/creative/campaigns', label: 'Campaigns', icon: 'Sparkles' },
  { href: '/creative/brand-kit', label: 'Brand Kit', icon: 'Palette' },
  { href: '/creative/assets', label: 'Assets', icon: 'FolderOpen' },
] as const;
