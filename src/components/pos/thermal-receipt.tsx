'use client';

import React from 'react';
import { BarcodeSVG } from '@/components/common/barcode-svg';

export interface ThermalReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
}

export interface ThermalReceiptData {
  orderNumber: string;
  date?: string;
  cashierName?: string;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  vatRegNumber?: string;
  items: ThermalReceiptItem[];
  grossSubtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  tradeInCredit?: { deviceModel: string; creditAmount: number };
  exchangeCredit?: { returnNumber: string; creditAmount: number };
  taxTotal: number;
  grandTotal: number;
  tender: string;
  amountPaid?: number;
  changeDue?: number;
  loyaltyEarned?: number;
  loyaltyBalance?: number;
  footerNote?: string;
}

/** widthMm = printable width (typically 72 for 80mm paper, 48 for 58mm). */
export function ThermalReceipt({
  data,
  widthMm = 72,
}: {
  data: ThermalReceiptData | null;
  widthMm?: number;
}) {
  if (!data) return null;

  const dateStr =
    data.date ||
    new Date().toLocaleString('en-LK', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

  const narrow = widthMm <= 52;
  const fontPx = narrow ? 10 : 11;

  return (
    <div
      id="printable-thermal-receipt"
      className="hidden print:block bg-white text-black leading-tight font-mono mx-auto"
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        color: '#000000',
        backgroundColor: '#ffffff',
        width: `${widthMm}mm`,
        maxWidth: `${widthMm}mm`,
        fontSize: `${fontPx}px`,
        padding: narrow ? '1.5mm 1mm' : '2mm 1.5mm',
        boxSizing: 'border-box',
      }}
      data-receipt-width-mm={widthMm}
    >
      <div className="text-center space-y-0.5 mb-2">
        <h2
          className="font-bold uppercase tracking-wider"
          style={{ fontSize: narrow ? '13px' : '15px' }}
        >
          {data.storeName || 'GRABBER STORE'}
        </h2>
        {data.storeAddress && <p style={{ fontSize: '10px' }}>{data.storeAddress}</p>}
        {data.storePhone && <p style={{ fontSize: '10px' }}>Tel: {data.storePhone}</p>}
        {data.vatRegNumber && <p style={{ fontSize: '10px' }}>VAT Reg: {data.vatRegNumber}</p>}
      </div>

      <div className="border-b border-dashed border-black my-1.5" />

      <div style={{ fontSize: '10px' }} className="space-y-0.5">
        <div className="flex justify-between gap-1">
          <span>
            Bill No: <strong>{data.orderNumber}</strong>
          </span>
          <span className="shrink-0">{dateStr}</span>
        </div>
        <div className="flex justify-between gap-1">
          <span>Cashier: {data.cashierName || 'Cashier'}</span>
          <span>Tender: {data.tender}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-black my-1.5" />

      <div className="w-full">
        <div
          className="grid grid-cols-12 font-bold border-b border-black pb-0.5 mb-1"
          style={{ fontSize: '10px' }}
        >
          <span className="col-span-6 text-left">ITEM</span>
          <span className="col-span-2 text-center">QTY</span>
          <span className="col-span-4 text-right">AMOUNT</span>
        </div>

        <div className="space-y-1">
          {data.items.map((item, idx) => {
            const lineTotal = item.lineTotal ?? item.unitPrice * item.quantity;
            return (
              <div key={idx} className="grid grid-cols-12" style={{ fontSize: '10.5px' }}>
                <div className="col-span-6 text-left truncate pr-1">
                  <span className="font-semibold">{item.name}</span>
                  {item.quantity > 1 && (
                    <div style={{ fontSize: '9px' }} className="text-gray-700">
                      @{item.unitPrice.toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="col-span-2 text-center font-medium">{item.quantity}</div>
                <div className="col-span-4 text-right font-medium">{lineTotal.toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-b border-dashed border-black my-1.5" />

      <div className="space-y-0.5" style={{ fontSize: '10.5px' }}>
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>LKR {data.grossSubtotal.toFixed(2)}</span>
        </div>

        {Boolean(data.discountAmount && data.discountAmount > 0) && (
          <div className="flex justify-between">
            <span>Discount {data.discountPercent ? `(${data.discountPercent}%)` : ''}</span>
            <span>- LKR {data.discountAmount?.toFixed(2)}</span>
          </div>
        )}

        {Boolean(data.tradeInCredit && data.tradeInCredit.creditAmount > 0) && (
          <div className="flex justify-between">
            <span>Trade-in ({data.tradeInCredit?.deviceModel})</span>
            <span>- LKR {data.tradeInCredit?.creditAmount.toFixed(2)}</span>
          </div>
        )}

        {Boolean(data.exchangeCredit && data.exchangeCredit.creditAmount > 0) && (
          <div className="flex justify-between">
            <span>Exchange Credit ({data.exchangeCredit?.returnNumber})</span>
            <span>- LKR {data.exchangeCredit?.creditAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span>VAT (18% Incl.)</span>
          <span>LKR {data.taxTotal.toFixed(2)}</span>
        </div>

        <div className="border-t border-black my-1 pt-1 flex justify-between text-sm font-bold">
          <span>TOTAL DUE</span>
          <span>LKR {data.grandTotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between" style={{ fontSize: '10px' }}>
          <span>Amount Paid ({data.tender})</span>
          <span>LKR {(data.amountPaid ?? data.grandTotal).toFixed(2)}</span>
        </div>

        <div className="flex justify-between" style={{ fontSize: '10px' }}>
          <span>Change Returned</span>
          <span>LKR {(data.changeDue ?? 0).toFixed(2)}</span>
        </div>

        {Boolean(data.loyaltyEarned && data.loyaltyEarned > 0) && (
          <div className="flex justify-between font-bold text-gray-800 pt-0.5" style={{ fontSize: '10px' }}>
            <span>Loyalty Points Earned</span>
            <span>+{data.loyaltyEarned} pts</span>
          </div>
        )}
      </div>

      <div className="border-b border-dashed border-black my-2" />

      <div className="text-center my-2 flex flex-col items-center justify-center">
        <BarcodeSVG
          value={data.orderNumber}
          format="CODE128"
          height={narrow ? 22 : 26}
          width={narrow ? 1.0 : 1.2}
          displayValue={true}
          fontSize={9}
          className="mx-auto"
        />
      </div>

      <div className="text-center text-gray-800 space-y-0.5 mt-2" style={{ fontSize: '9px' }}>
        <p>{data.footerNote || 'Thank you for shopping with us!'}</p>
        <p>Exchange possible within 7 days with bill.</p>
        <p className="font-semibold mt-1 text-gray-600" style={{ fontSize: '8px' }}>
          Powered by Grabber Business OS
        </p>
      </div>
    </div>
  );
}
