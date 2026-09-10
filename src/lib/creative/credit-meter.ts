/**
 * Creative render credit meter (GRW-05) — stored in business_config.config_json.
 */
import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';

export type CreativeCredits = {
  balance: number;
  used: number;
  /** Soft monthly counter; UI can reset via API */
  periodLabel?: string;
};

const DEFAULT_BALANCE = 100;

export async function getCreativeCredits(): Promise<CreativeCredits> {
  const cfg = await readConfigJson();
  const raw = (cfg.creativeCredits || {}) as Partial<CreativeCredits>;
  const balance = typeof raw.balance === 'number' ? raw.balance : DEFAULT_BALANCE;
  const used = typeof raw.used === 'number' ? raw.used : 0;
  return {
    balance,
    used,
    periodLabel: raw.periodLabel || new Date().toISOString().slice(0, 7),
  };
}

/** Throws if balance is exhausted (non-stub paid renders). */
export async function assertCreativeCreditAvailable(): Promise<CreativeCredits> {
  const credits = await getCreativeCredits();
  if (credits.balance <= 0) {
    throw new Error('Creative credits exhausted — top up balance in Creative dashboard');
  }
  return credits;
}

/** Decrement one credit after a successful FAL/Replicate (non-stub) render. */
export async function consumeCreativeCredit(provider: string): Promise<CreativeCredits> {
  const billable = provider === 'FAL' || provider === 'REPLICATE';
  if (!billable) return getCreativeCredits();

  const prev = await getCreativeCredits();
  if (prev.balance <= 0) {
    throw new Error('Creative credits exhausted');
  }
  const next: CreativeCredits = {
    balance: prev.balance - 1,
    used: prev.used + 1,
    periodLabel: prev.periodLabel,
  };
  await mergeConfigJson({ creativeCredits: next });
  return next;
}

export async function setCreativeCredits(patch: Partial<CreativeCredits>): Promise<CreativeCredits> {
  const prev = await getCreativeCredits();
  const next: CreativeCredits = {
    balance: typeof patch.balance === 'number' ? Math.max(0, patch.balance) : prev.balance,
    used: typeof patch.used === 'number' ? Math.max(0, patch.used) : prev.used,
    periodLabel: patch.periodLabel ?? prev.periodLabel,
  };
  await mergeConfigJson({ creativeCredits: next });
  return next;
}
