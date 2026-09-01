import type { RepairIntakePayload } from './types';
import { getRepairServiceBySlug } from './services';

export type RepairEstimatePreview = {
  label: string;
  priceType: 'FIXED_START' | 'RANGE' | 'INSPECTION_REQUIRED';
  amountLkr?: number;
  rangeMinLkr?: number;
  rangeMaxLkr?: number;
  diagnosticFeeLkr: number;
  travelFeeLkr: number;
  disclaimer: string;
};

export function buildRepairEstimatePreview(input: Pick<
  RepairIntakePayload,
  'serviceSlug' | 'mode' | 'brand' | 'model'
>): RepairEstimatePreview {
  const service = getRepairServiceBySlug(input.serviceSlug);
  const diagnosticFeeLkr = 1500;
  const travelFeeLkr = input.mode === 'HOME_VISIT' ? 2000 : 0;

  if (!service || service.defaultPriceType === 'INSPECTION_REQUIRED') {
    return {
      label: 'Inspection required',
      priceType: 'INSPECTION_REQUIRED',
      diagnosticFeeLkr,
      travelFeeLkr,
      disclaimer:
        'We will confirm the final quote after diagnosis. Diagnostic fee applies if you proceed with repair.',
    };
  }

  if (service.defaultPriceType === 'RANGE' && service.startingPriceLkr) {
    return {
      label: `From ${input.brand} ${input.model}`.trim(),
      priceType: 'RANGE',
      rangeMinLkr: service.startingPriceLkr,
      rangeMaxLkr: Math.round(service.startingPriceLkr * 1.6),
      diagnosticFeeLkr: 0,
      travelFeeLkr,
      disclaimer: 'Final price depends on parts availability and device condition.',
    };
  }

  return {
    label: service.name,
    priceType: 'FIXED_START',
    amountLkr: service.startingPriceLkr,
    diagnosticFeeLkr: 0,
    travelFeeLkr,
    disclaimer: 'Starting price for supported models. We confirm before chargeable work begins.',
  };
}

export function formatTicketCode(seq: number) {
  const year = new Date().getFullYear();
  return `REP-${year}-${String(seq).padStart(5, '0')}`;
}
