'use client';

import { useMemo, useState } from 'react';
import type { ElectronicsVariant } from '@/lib/electronics/types';
import {
  conditionLabel,
  matchVariantByAttrs,
  uniqueAttrValues,
  warrantyLabel,
} from '@/lib/electronics/variant-attrs';
import { ELECTRONICS_CONDITION, ELECTRONICS_STORAGE, ELECTRONICS_WARRANTY } from '@/lib/electronics/types';

type Props = {
  productName: string;
  variants: ElectronicsVariant[];
  onSelect: (v: ElectronicsVariant) => void;
};

function pillClass(active: boolean) {
  return active
    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300';
}

export function ElectronicsVariantPicker({ productName, variants, onSelect }: Props) {
  const storages = uniqueAttrValues(variants, 'storage');
  const colors = uniqueAttrValues(variants, 'color');
  const conditions = uniqueAttrValues(variants, 'condition');
  const warranties = uniqueAttrValues(variants, 'warrantyType');

  const [storage, setStorage] = useState(storages[0] || '128GB');
  const [color, setColor] = useState(colors[0] || 'Default');
  const [condition, setCondition] = useState(conditions[0] || 'SEALED_NEW');
  const [warrantyType, setWarrantyType] = useState(warranties[0] || 'STORE_WARRANTY_6M');

  const selected = useMemo(
    () =>
      matchVariantByAttrs(variants, { storage, color, condition, warrantyType }) ||
      variants[0],
    [variants, storage, color, condition, warrantyType],
  );

  if (!selected) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{productName}</p>

      {(storages.length ? storages : [...ELECTRONICS_STORAGE]).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">Storage</p>
          <div className="flex flex-wrap gap-2">
            {(storages.length ? storages : [...ELECTRONICS_STORAGE]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStorage(s);
                  const m = matchVariantByAttrs(variants, { storage: s, color, condition, warrantyType });
                  if (m) onSelect(m);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${pillClass(storage === s)}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {colors.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">Color</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  const m = matchVariantByAttrs(variants, { storage, color: c, condition, warrantyType });
                  if (m) onSelect(m);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${pillClass(color === c)}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">Condition</p>
        <div className="flex flex-col gap-2">
          {(conditions.length ? conditions : [...ELECTRONICS_CONDITION]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCondition(c);
                const m = matchVariantByAttrs(variants, { storage, color, condition: c, warrantyType });
                if (m) onSelect(m);
              }}
              className={`rounded-xl border px-3 py-2 text-left text-xs font-medium ${pillClass(condition === c)}`}
            >
              {conditionLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">Warranty</p>
        <div className="space-y-2">
          {(warranties.length ? warranties : [...ELECTRONICS_WARRANTY]).map((w) => (
            <label key={w} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs cursor-pointer ${pillClass(warrantyType === w)}`}>
              <input
                type="radio"
                name="warranty"
                checked={warrantyType === w}
                onChange={() => {
                  setWarrantyType(w);
                  const m = matchVariantByAttrs(variants, { storage, color, condition, warrantyType: w });
                  if (m) onSelect(m);
                }}
                className="mt-0.5"
              />
              <span>{warrantyLabel(w)}</span>
            </label>
          ))}
        </div>
      </div>

      <p className="text-sm font-semibold text-emerald-800">
        LKR {selected.salePrice.toLocaleString('en-LK')}
        {selected.stockOnHand <= 0 && <span className="ml-2 text-red-600">Out of stock</span>}
      </p>
    </div>
  );
}
