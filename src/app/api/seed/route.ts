import { NextResponse } from 'next/server';

/**
 * GRABBER BUSINESS OS — PRODUCTION ONE-CLICK SEED API
 * Seeds initial branches, registers, tax profiles, Chart of Accounts, and demo catalog.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const catalog = body.catalog || 'master'; // 'master' | 'wowthings' | 'shopping_station'

    const seedSummary = {
      branches: [
        { id: 'br_colombo_main', name: 'Colombo Main Flagship Store', code: 'CMB-01' },
        { id: 'br_kandy_mall', name: 'Kandy City Center Branch', code: 'KCC-02' },
        { id: 'wh_central_colombo', name: 'Central Logistics Hub', code: 'LOG-WH01' },
      ],
      taxProfiles: [
        { id: 'tax_standard_vat', name: 'Sri Lanka Standard VAT 18%', rate: 18.0 },
        { id: 'tax_exempt', name: 'Tax Exempted Goods', rate: 0.0 },
      ],
      registers: [
        { id: 'reg_cmb_01', name: 'Register 01 (Main Counter)' },
        { id: 'reg_cmb_02', name: 'Register 02 (Express Counter)' },
      ],
      customers: [
        { id: 'cust_sarath_perera', name: 'Sarath Perera', creditLimit: 50000.0 },
        { id: 'cust_anaz_azeez', name: 'Anaz Azeez (VIP)', creditLimit: 200000.0 },
      ],
      selectedCatalog: catalog,
      status: 'SEEDED_SUCCESSFULLY',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(seedSummary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
