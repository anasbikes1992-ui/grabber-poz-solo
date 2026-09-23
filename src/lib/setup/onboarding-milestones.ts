/**
 * Onboarding milestones — live progress detection for /setup guided flow.
 * M7-S1: wizardSteps wrap the same milestones (no new completion rules).
 */
import { sql, eq } from 'drizzle-orm';
import { db, products, orders, branches, users } from '@/db';
import { readConfigJson, readBusinessProfile, readIntegrationsPublic } from '@/lib/config/business-settings';
import { readStorefrontConfig } from '@/lib/config/storefront-config';
import { listAutomationRules } from '@/lib/automation/rules-store';
import { VERTICAL_PRESETS, type VerticalPresetId } from '@/lib/config/vertical-presets';
import { hasDatabaseUrl as hasDbUrl } from '@/lib/db/connection';

export type OnboardingMilestone = {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
  required: boolean;
  order: number;
  action?: 'seed' | 'preset_seed' | 'link';
};

/** Productized wizard steps (M7) — groups of milestone ids; completion still milestone-gated. */
export type OnboardingWizardStepDef = {
  id: string;
  title: string;
  description: string;
  order: number;
  required: boolean;
  milestoneIds: string[];
  href: string;
};

export type OnboardingWizardStep = OnboardingWizardStepDef & {
  done: boolean;
  milestoneDoneCount: number;
  milestoneTotal: number;
};

export type OnboardingProgress = {
  milestones: OnboardingMilestone[];
  wizardSteps: OnboardingWizardStep[];
  currentStepId: string | null;
  completed: number;
  total: number;
  requiredCompleted: number;
  requiredTotal: number;
  percent: number;
  nextMilestoneId: string | null;
  preset: VerticalPresetId | null;
  presetLabel: string | null;
  seeded: boolean;
  seededPreset: string | null;
  dbConnected: boolean;
  completedAt: string | null;
  goLiveReady: boolean;
};

/**
 * Ordered owner wizard (M7-S1 shell). Maps onto live milestones — do not invent
 * completion flags that bypass database / branch / owner gates.
 */
export const ONBOARDING_WIZARD_STEPS: OnboardingWizardStepDef[] = [
  {
    id: 'welcome',
    title: 'Welcome & database',
    description: 'Confirm DATABASE_URL and health before go-live work.',
    order: 1,
    required: true,
    milestoneIds: ['database'],
    href: '/api/health',
  },
  {
    id: 'business',
    title: 'Business & vertical',
    description: 'Choose a vertical preset and confirm store profile.',
    order: 2,
    required: true,
    milestoneIds: ['preset', 'profile'],
    href: '/setup#presets',
  },
  {
    id: 'operations',
    title: 'Owner & branch',
    description: 'Rotate TEMP$ owner PIN and ensure at least one branch.',
    order: 3,
    required: true,
    milestoneIds: ['operations'],
    href: '/settings/staff',
  },
  {
    id: 'catalog',
    title: 'Launch catalog',
    description: 'Seed products, registers, and chart of accounts for the preset.',
    order: 4,
    required: true,
    milestoneIds: ['seed'],
    href: '/setup',
  },
  {
    id: 'channels',
    title: 'Storefront & WhatsApp',
    description: 'Optional: homepage CMS and messaging credentials.',
    order: 5,
    required: false,
    milestoneIds: ['storefront', 'integrations'],
    href: '/store/builder',
  },
  {
    id: 'automation',
    title: 'Automation',
    description: 'Optional: order/repair/stock WhatsApp rules.',
    order: 6,
    required: false,
    milestoneIds: ['automation'],
    href: '/settings/automation',
  },
  {
    id: 'first_sale',
    title: 'First sale & certify',
    description: 'Optional: record one sale, then complete onboarding.',
    order: 7,
    required: false,
    milestoneIds: ['first_sale'],
    href: '/pos',
  },
];

export function buildWizardSteps(milestones: OnboardingMilestone[]): {
  wizardSteps: OnboardingWizardStep[];
  currentStepId: string | null;
} {
  const byId = new Map(milestones.map((m) => [m.id, m]));
  const wizardSteps: OnboardingWizardStep[] = ONBOARDING_WIZARD_STEPS.map((def) => {
    const refs = def.milestoneIds.map((id) => byId.get(id)).filter(Boolean) as OnboardingMilestone[];
    const milestoneTotal = Math.max(def.milestoneIds.length, 1);
    const milestoneDoneCount = refs.filter((m) => m.done).length;
    const done = refs.length > 0 && refs.every((m) => m.done);
    return { ...def, done, milestoneDoneCount, milestoneTotal };
  });
  const current =
    wizardSteps.find((s) => s.required && !s.done) || wizardSteps.find((s) => !s.done) || null;
  return { wizardSteps, currentStepId: current?.id ?? null };
}

async function isDbConnected(): Promise<boolean> {
  if (!hasDbUrl()) return false;
  try {
    await db.execute(sql`SELECT 1 AS ok`);
    return true;
  } catch {
    return false;
  }
}

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  const dbConnected = await isDbConnected();
  const config: Record<string, unknown> = dbConnected
    ? ((await readConfigJson().catch(() => ({}))) as Record<string, unknown>)
    : {};
  const presetId = (config.verticalPreset as VerticalPresetId) || null;
  const preset = presetId ? VERTICAL_PRESETS[presetId] : null;
  const seededPreset = (config.seedPreset as string) || null;
  const seededAt = config.seededAt as string | undefined;

  let productCount = 0;
  let orderCount = 0;
  let branchCount = 0;
  let ownerReady = false;
  let profileName = '';
  if (dbConnected) {
    try {
      const [pc] = await db.select({ c: sql<number>`count(*)::int` }).from(products);
      productCount = Number(pc?.c ?? 0);
      const [oc] = await db.select({ c: sql<number>`count(*)::int` }).from(orders);
      orderCount = Number(oc?.c ?? 0);
      const [bc] = await db.select({ c: sql<number>`count(*)::int` }).from(branches);
      branchCount = Number(bc?.c ?? 0);
      const ownerRows = await db.select({ hashedPin: users.hashedPin }).from(users).where(eq(users.role, 'OWNER')).limit(10);
      ownerReady = ownerRows.some((u) => Boolean(u.hashedPin && !u.hashedPin.startsWith('TEMP$')));
      const profile = await readBusinessProfile();
      profileName = profile?.name?.trim() || '';
    } catch {
      /* degraded */
    }
  }

  const integrations: Record<string, unknown> = dbConnected
    ? ((await readIntegrationsPublic().catch(() => ({}))) as Record<string, unknown>)
    : {};
  const whatsappEnv = Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
  const whatsappConfigured = whatsappEnv || Boolean(integrations.whatsappPhoneId);

  let storefrontCustomized = false;
  if (dbConnected) {
    try {
      const sf = await readStorefrontConfig();
      storefrontCustomized = Boolean(
        config.storefrontSavedAt ||
          (config.storefront && (config.storefront as { blocks?: unknown[] }).blocks?.length),
      );
      if (!storefrontCustomized && sf.blocks.length > 0) {
        storefrontCustomized = Boolean(config.storefront);
      }
    } catch {
      storefrontCustomized = Boolean(config.storefront);
    }
  }

  let automationConfigured = false;
  if (dbConnected) {
    try {
      const rules = await listAutomationRules();
      automationConfigured = Boolean(
        config.automationConfiguredAt || (config.automationRules as unknown[] | undefined)?.length || rules.some((r) => r.active),
      );
    } catch {
      automationConfigured = Boolean(config.automationRules);
    }
  }

  const milestones: OnboardingMilestone[] = [
    {
      id: 'database',
      title: 'Connect database',
      description: dbConnected
        ? 'DATABASE_URL is connected.'
        : 'Add pooler DATABASE_URL on Vercel and redeploy.',
      href: '/api/health',
      done: dbConnected,
      required: true,
      order: 1,
      action: 'link',
    },
    {
      id: 'preset',
      title: 'Choose business vertical',
      description: preset
        ? `Active preset: ${preset.label}.`
        : 'Pick Fashion, Mobile Repair, Restaurant, Grocery, or Hybrid.',
      href: '/setup#presets',
      done: Boolean(presetId),
      required: true,
      order: 2,
      action: 'link',
    },
    {
      id: 'seed',
      title: 'Load starter catalog',
      description: seededAt
        ? `Seeded ${seededPreset || 'demo'} catalog (${productCount} products).`
        : 'Seed sample products, branches, and chart of accounts for your vertical.',
      href: '/api/seed',
      done: productCount > 0,
      required: true,
      order: 3,
      action: 'preset_seed',
    },
    {
      id: 'profile',
      title: 'Business profile',
      description: profileName
        ? `Store: ${profileName}. Receipt header and currency configured.`
        : 'Store name, receipt header, currency, timezone.',
      href: '/settings',
      done: Boolean(profileName),
      required: true,
      order: 4,
      action: 'link',
    },
    {
      id: 'operations',
      title: 'Operational bootstrap',
      description: branchCount > 0 && ownerReady ? 'A branch exists and the owner credential is rotated.' : 'Create a branch and rotate the temporary owner credential.',
      href: '/settings/staff',
      done: branchCount > 0 && ownerReady,
      required: true,
      order: 5,
      action: 'link',
    },
    {
      id: 'integrations',
      title: 'WhatsApp & payments',
      description: whatsappConfigured
        ? 'WhatsApp Cloud API credentials detected.'
        : 'Set WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN on Vercel.',
      href: '/whatsapp',
      done: whatsappConfigured,
      required: false,
      order: 6,
      action: 'link',
    },
    {
      id: 'storefront',
      title: 'Storefront CMS',
      description: storefrontCustomized
        ? 'Homepage blocks and theme saved.'
        : 'Hero, banners, featured products, WhatsApp CTA.',
      href: '/store/builder',
      done: storefrontCustomized,
      required: false,
      order: 7,
      action: 'link',
    },
    {
      id: 'automation',
      title: 'Automation rules',
      description: automationConfigured
        ? 'Order/repair/stock automation rules active.'
        : 'Order WhatsApp, low stock alerts, repair ready messages.',
      href: '/settings/automation',
      done: automationConfigured,
      required: false,
      order: 8,
      action: 'link',
    },
    {
      id: 'first_sale',
      title: 'First transaction',
      description: orderCount > 0 ? `${orderCount} order(s) recorded.` : 'Complete one POS or storefront sale.',
      href: '/pos',
      done: orderCount > 0,
      required: false,
      order: 9,
      action: 'link',
    },
  ];

  const required = milestones.filter((m) => m.required);
  const completed = milestones.filter((m) => m.done).length;
  const requiredCompleted = required.filter((m) => m.done).length;
  const next = milestones.find((m) => m.required && !m.done) || milestones.find((m) => !m.done);
  const { wizardSteps, currentStepId } = buildWizardSteps(milestones);

  const completedAt = (config.onboardingCompletedAt as string) || null;
  const goLiveReady = dbConnected && requiredCompleted === required.length;

  return {
    milestones,
    wizardSteps,
    currentStepId,
    completed,
    total: milestones.length,
    requiredCompleted,
    requiredTotal: required.length,
    percent: Math.round((requiredCompleted / Math.max(required.length, 1)) * 100),
    nextMilestoneId: next?.id ?? null,
    preset: presetId,
    presetLabel: preset?.label ?? null,
    seeded: productCount > 0,
    seededPreset,
    dbConnected,
    completedAt,
    goLiveReady,
  };
}

export async function completeOnboarding() {
  const progress = await getOnboardingProgress();
  if (!progress.goLiveReady) {
    throw Object.assign(new Error(`Required onboarding milestones incomplete: ${progress.requiredTotal - progress.requiredCompleted} remaining`), { status: 409 });
  }
  const { mergeConfigJson } = await import('@/lib/config/business-settings');
  const completedAt = new Date().toISOString();
  await mergeConfigJson({ onboardingCompletedAt: completedAt });
  return { ...progress, completedAt, goLiveReady: true };
}

/** Persist onboarding markers after seed or preset apply. */
export async function markSeedComplete(preset: string) {
  const { mergeConfigJson } = await import('@/lib/config/business-settings');
  await mergeConfigJson({
    seededAt: new Date().toISOString(),
    seedPreset: preset,
  });
}

export async function markPresetApplied(presetId: VerticalPresetId) {
  const { mergeConfigJson } = await import('@/lib/config/business-settings');
  await mergeConfigJson({
    verticalPreset: presetId,
    presetAppliedAt: new Date().toISOString(),
  });
}
