/**
 * VERT-C03 — Pluggable cost model per shop (config_json.engines).
 */
export type CostModel = 'SKU' | 'RECIPE' | 'SERVICE_BOM' | 'PARTS';

export type EngineConfig = {
  costModel: CostModel;
  attributionEnabled: boolean;
  commissionDefaultPct: number;
};

export const DEFAULT_ENGINES: EngineConfig = {
  costModel: 'SKU',
  attributionEnabled: true,
  commissionDefaultPct: 10,
};

export function parseEngines(cfg: Record<string, unknown> | null | undefined): EngineConfig {
  const raw = (cfg?.engines as Record<string, unknown>) || {};
  const model = String(raw.costModel || DEFAULT_ENGINES.costModel).toUpperCase();
  const allowed: CostModel[] = ['SKU', 'RECIPE', 'SERVICE_BOM', 'PARTS'];
  return {
    costModel: (allowed.includes(model as CostModel) ? model : 'SKU') as CostModel,
    attributionEnabled: raw.attributionEnabled !== false,
    commissionDefaultPct: Math.max(0, Math.min(100, Number(raw.commissionDefaultPct ?? DEFAULT_ENGINES.commissionDefaultPct))),
  };
}

/** Map vertical preset → suggested cost model */
export function costModelForVertical(vertical: string | null | undefined): CostModel {
  const v = String(vertical || '').toLowerCase();
  if (v.includes('restaurant') || v.includes('cafe') || v.includes('café')) return 'RECIPE';
  if (v.includes('salon') || v.includes('beauty') || v.includes('barber')) return 'SERVICE_BOM';
  if (v.includes('repair') || v.includes('mobile') || v.includes('electronics')) return 'PARTS';
  return 'SKU';
}
