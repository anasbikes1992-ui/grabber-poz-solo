/**
 * Shared print paper / label size presets for thermal receipts & barcode stickers.
 * Stored in localStorage; applied via @page + element widths at print time.
 */

export type ReceiptPaperId = 'THERMAL_80' | 'THERMAL_58' | 'THERMAL_72';

export type LabelPaperId =
  | 'THERMAL_50X30'
  | 'THERMAL_40X30'
  | 'THERMAL_58X40'
  | 'THERMAL_60X40'
  | 'A4_24UP'
  | 'A4_21UP'
  | 'CUSTOM';

export type ReceiptPaperPreset = {
  id: ReceiptPaperId;
  label: string;
  /** CSS @page / printable width in mm */
  widthMm: number;
  description: string;
};

export type LabelPaperPreset = {
  id: LabelPaperId;
  label: string;
  widthMm: number;
  heightMm: number;
  /** Labels per A4 sheet (0 = continuous roll / 1-per-page) */
  perSheet: number;
  cols: number;
  description: string;
};

export const RECEIPT_PAPER_PRESETS: ReceiptPaperPreset[] = [
  {
    id: 'THERMAL_80',
    label: '80mm thermal (standard)',
    widthMm: 72,
    description: 'Most 80mm ESC/POS printers — printable width ~72mm',
  },
  {
    id: 'THERMAL_72',
    label: '72mm thermal',
    widthMm: 68,
    description: 'Narrower 80mm roll / some Asian models',
  },
  {
    id: 'THERMAL_58',
    label: '58mm thermal (compact)',
    widthMm: 48,
    description: '58mm pocket / kitchen printers — printable ~48mm',
  },
];

export const LABEL_PAPER_PRESETS: LabelPaperPreset[] = [
  {
    id: 'THERMAL_50X30',
    label: '50×30mm thermal sticker',
    widthMm: 50,
    heightMm: 30,
    perSheet: 0,
    cols: 1,
    description: '1 label per tear — common barcode roll',
  },
  {
    id: 'THERMAL_40X30',
    label: '40×30mm thermal sticker',
    widthMm: 40,
    heightMm: 30,
    perSheet: 0,
    cols: 1,
    description: 'Smaller shelf / jewelry labels',
  },
  {
    id: 'THERMAL_58X40',
    label: '58×40mm thermal sticker',
    widthMm: 58,
    heightMm: 40,
    perSheet: 0,
    cols: 1,
    description: 'Wider product label on 58mm roll',
  },
  {
    id: 'THERMAL_60X40',
    label: '60×40mm thermal sticker',
    widthMm: 60,
    heightMm: 40,
    perSheet: 0,
    cols: 1,
    description: 'Large shelf talker style',
  },
  {
    id: 'A4_24UP',
    label: 'A4 — 24-up (3×8)',
    widthMm: 63.5,
    heightMm: 33.9,
    perSheet: 24,
    cols: 3,
    description: 'Standard Avery-style sheet',
  },
  {
    id: 'A4_21UP',
    label: 'A4 — 21-up (3×7)',
    widthMm: 63.5,
    heightMm: 38.1,
    perSheet: 21,
    cols: 3,
    description: 'Taller cells for longer names',
  },
  {
    id: 'CUSTOM',
    label: 'Custom size (mm)',
    widthMm: 50,
    heightMm: 30,
    perSheet: 0,
    cols: 1,
    description: 'Set width × height below',
  },
];

const RECEIPT_KEY = 'grabber.print.receiptPaper';
const LABEL_KEY = 'grabber.print.labelPaper';
const LABEL_CUSTOM_KEY = 'grabber.print.labelCustomMm';

export function readReceiptPaperId(): ReceiptPaperId {
  if (typeof window === 'undefined') return 'THERMAL_80';
  const v = localStorage.getItem(RECEIPT_KEY) as ReceiptPaperId | null;
  return RECEIPT_PAPER_PRESETS.some((p) => p.id === v) ? (v as ReceiptPaperId) : 'THERMAL_80';
}

export function writeReceiptPaperId(id: ReceiptPaperId) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RECEIPT_KEY, id);
}

export function readLabelPaperId(): LabelPaperId {
  if (typeof window === 'undefined') return 'THERMAL_50X30';
  const v = localStorage.getItem(LABEL_KEY) as LabelPaperId | null;
  return LABEL_PAPER_PRESETS.some((p) => p.id === v) ? (v as LabelPaperId) : 'THERMAL_50X30';
}

export function writeLabelPaperId(id: LabelPaperId) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LABEL_KEY, id);
}

export function readCustomLabelMm(): { widthMm: number; heightMm: number } {
  if (typeof window === 'undefined') return { widthMm: 50, heightMm: 30 };
  try {
    const raw = localStorage.getItem(LABEL_CUSTOM_KEY);
    if (!raw) return { widthMm: 50, heightMm: 30 };
    const parsed = JSON.parse(raw) as { widthMm?: number; heightMm?: number };
    return {
      widthMm: Math.min(120, Math.max(20, Number(parsed.widthMm) || 50)),
      heightMm: Math.min(100, Math.max(15, Number(parsed.heightMm) || 30)),
    };
  } catch {
    return { widthMm: 50, heightMm: 30 };
  }
}

export function writeCustomLabelMm(widthMm: number, heightMm: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    LABEL_CUSTOM_KEY,
    JSON.stringify({
      widthMm: Math.min(120, Math.max(20, widthMm)),
      heightMm: Math.min(100, Math.max(15, heightMm)),
    }),
  );
}

export function resolveLabelSize(
  id: LabelPaperId,
  custom?: { widthMm: number; heightMm: number },
): { widthMm: number; heightMm: number; perSheet: number; cols: number; isA4: boolean } {
  const preset = LABEL_PAPER_PRESETS.find((p) => p.id === id) || LABEL_PAPER_PRESETS[0];
  if (id === 'CUSTOM' && custom) {
    return {
      widthMm: custom.widthMm,
      heightMm: custom.heightMm,
      perSheet: 0,
      cols: 1,
      isA4: false,
    };
  }
  return {
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    perSheet: preset.perSheet,
    cols: preset.cols,
    isA4: preset.perSheet > 0,
  };
}

export function receiptPreset(id: ReceiptPaperId): ReceiptPaperPreset {
  return RECEIPT_PAPER_PRESETS.find((p) => p.id === id) || RECEIPT_PAPER_PRESETS[0];
}
