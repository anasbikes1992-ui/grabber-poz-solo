import type { RepairCategoryId } from './device-tree';

export type PartQuality = 'OEM_ORIGINAL' | 'GRADE_A_COMPATIBLE';

export type RepairCatalogEntry = {
  brand: string;
  deviceModel: string;
  repairCategory: RepairCategoryId;
  partQuality: PartQuality;
  estimatedCostLkr: number;
  estimatedMinutes: number;
  warrantyDays: number;
};

/** Base OEM pricing matrix — premium models cost more. DB table mirrors this for overrides. */
const PREMIUM_MODELS = /Pro Max|Ultra|Fold|MacBook Pro 16/i;

function basePriceForCategory(category: RepairCategoryId, premium: boolean): { oem: number; gradeA: number; mins: number; warrantyOem: number; warrantyGrade: number } {
  const mult = premium ? 1.35 : 1;
  switch (category) {
    case 'SCREEN':
      return { oem: Math.round(45000 * mult), gradeA: Math.round(28000 * mult), mins: 90, warrantyOem: 90, warrantyGrade: 30 };
    case 'BATTERY':
      return { oem: Math.round(12000 * mult), gradeA: Math.round(7500 * mult), mins: 45, warrantyOem: 90, warrantyGrade: 30 };
    case 'CHARGING_PORT':
      return { oem: Math.round(8500 * mult), gradeA: Math.round(5500 * mult), mins: 60, warrantyOem: 60, warrantyGrade: 30 };
    case 'BACK_GLASS':
      return { oem: Math.round(22000 * mult), gradeA: Math.round(14000 * mult), mins: 120, warrantyOem: 90, warrantyGrade: 30 };
    case 'CAMERA_LENS':
      return { oem: Math.round(15000 * mult), gradeA: Math.round(9500 * mult), mins: 75, warrantyOem: 60, warrantyGrade: 30 };
    case 'MOTHERBOARD_IC':
      return { oem: Math.round(35000 * mult), gradeA: Math.round(22000 * mult), mins: 240, warrantyOem: 30, warrantyGrade: 14 };
    default:
      return { oem: 10000, gradeA: 6500, mins: 60, warrantyOem: 30, warrantyGrade: 14 };
  }
}

export function lookupRepairCatalogQuote(input: {
  brand: string;
  deviceModel: string;
  repairCategory: RepairCategoryId;
  partQuality: PartQuality;
}): RepairCatalogEntry {
  const premium = PREMIUM_MODELS.test(input.deviceModel);
  const base = basePriceForCategory(input.repairCategory, premium);
  const isOem = input.partQuality === 'OEM_ORIGINAL';
  return {
    brand: input.brand,
    deviceModel: input.deviceModel,
    repairCategory: input.repairCategory,
    partQuality: input.partQuality,
    estimatedCostLkr: isOem ? base.oem : base.gradeA,
    estimatedMinutes: base.mins,
    warrantyDays: isOem ? base.warrantyOem : base.warrantyGrade,
  };
}

export function comparePartQualities(input: {
  brand: string;
  deviceModel: string;
  repairCategory: RepairCategoryId;
}) {
  return {
    oem: lookupRepairCatalogQuote({ ...input, partQuality: 'OEM_ORIGINAL' }),
    gradeA: lookupRepairCatalogQuote({ ...input, partQuality: 'GRADE_A_COMPATIBLE' }),
  };
}

export const PRE_REPAIR_CHECKLIST = [
  'Display touch responsive',
  'Face ID / fingerprint working',
  'TrueTone / colour calibration',
  'Microphones',
  'Front & rear cameras',
  'Speakers & earpiece',
] as const;

export const REPAIR_TIME_SLOTS = [
  '09:30 AM - 10:30 AM',
  '10:30 AM - 11:30 AM',
  '11:30 AM - 12:30 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
] as const;

export function availableBookingDates(days = 7): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 1; i <= days; i++) {
    const next = new Date(d);
    next.setDate(d.getDate() + i);
    if (next.getDay() === 0) continue; // skip Sunday
    out.push(next.toISOString().slice(0, 10));
  }
  return out;
}
