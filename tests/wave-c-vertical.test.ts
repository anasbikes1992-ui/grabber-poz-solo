import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { partitionItemIndexes, checkoutLinesFromIndexes } from '@/lib/restaurant/bill-split';
import { lineUnitPriceWithModifiers } from '@/lib/restaurant/modifiers';

const root = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Wave C vertical depth', () => {
  it('VERT-R05 bill split partitions lines', () => {
    expect(partitionItemIndexes(5, 2)).toEqual([[0, 2, 4], [1, 3]]);
    const lines = checkoutLinesFromIndexes(
      [
        { productId: 'a', name: 'A', qty: 1, price: 100 },
        { productId: 'b', name: 'B', qty: 1, price: 200, modifiers: [{ name: 'X', priceDelta: 50 }] },
      ],
      [1],
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].unitPrice).toBe(lineUnitPriceWithModifiers({ name: 'B', qty: 1, price: 200, modifiers: [{ name: 'X', priceDelta: 50 }] }));
    expect(read('src/lib/restaurant/restaurant-service.ts')).toContain('splitCount');
    expect(read('src/components/restaurant/table-service-panel.tsx')).toContain('splitSeats');
  });

  it('VERT-R06 public menu routes', () => {
    expect(fs.existsSync(path.join(root, 'src/app/api/restaurant/menu/route.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/shop/menu/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/shop/dine/[tableToken]/page.tsx'))).toBe(true);
    expect(read('src/middleware.ts')).toContain('/api/restaurant/menu');
    expect(read('drizzle/migrations/0015_vertical_depth_wave_c.sql')).toContain('qr_token');
  });

  it('VERT-S05 commission CSV export', () => {
    expect(fs.existsSync(path.join(root, 'src/lib/salon/commission-export.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/api/appointments/commissions/export/route.ts'))).toBe(true);
    expect(read('src/app/appointments/page.tsx')).toContain('Commission CSV');
  });

  it('VERT-M03/M04 campaign ROAS + blast id', () => {
    expect(fs.existsSync(path.join(root, 'src/lib/marketing/campaign-roas.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/api/marketing/roas/route.ts'))).toBe(true);
    expect(read('src/components/crm/segment-blast-button.tsx')).toContain('blast_');
    expect(read('src/app/marketing/spend/page.tsx')).toContain('Campaign ROAS');
  });
});
