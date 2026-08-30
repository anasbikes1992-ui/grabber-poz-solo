import { NextResponse } from 'next/server';
import { BackupService } from '@/lib/backup/backup-service';
import { defaultInventoryEngine } from '@/lib/commerce/inventory-engine';
import { defaultCreditEngine } from '@/lib/commerce/credit-engine';
import { defaultAccountingEngine } from '@/lib/commerce/accounting-engine';

export async function GET() {
  try {
    const payload = await BackupService.exportBusinessData({
      business: { name: 'Grabber Flagship Retail', currency: 'LKR', timezone: 'Asia/Colombo' },
      branches: [{ id: 'br_colombo_main', name: 'Colombo Main Branch' }, { id: 'br_kandy_outlet', name: 'Kandy Outlet' }],
      warehouses: [{ id: 'wh_central_colombo', name: 'Central Colombo Warehouse' }],
      products: [{ id: 'prod_linen_shirt', name: 'Linen Casual Shirt' }],
      stockBalances: [],
      customers: [{ id: 'cust_sarath_perera', name: 'Sarath Perera' }],
      polimPothaEntries: defaultCreditEngine.getEntries(),
      suppliers: [{ id: 'sup_textiles_ltd', name: 'Lanka Textiles Ltd' }],
      orders: [],
      journalEntries: defaultAccountingEngine.getEntries(),
    });

    return NextResponse.json({
      success: true,
      export: payload,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
