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
  taxTotal: number;
  grandTotal: number;
  tender: string;
  amountPaid?: number;
  changeDue?: number;
  loyaltyEarned?: number;
  loyaltyBalance?: number;
  footerNote?: string;
}

export function ThermalReceipt({ data }: { data: ThermalReceiptData | null }) {
  if (!data) return null;

  const dateStr = data.date || new Date().toLocaleString('en-LK', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div
      id="printable-thermal-receipt"
      className="hidden print:block bg-white text-black text-[11px] leading-tight font-mono w-[72mm] max-w-[72mm] mx-auto p-2"
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        color: '#000000',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Store Header */}
      <div className="text-center space-y-0.5 mb-2">
        <h2 className="text-base font-bold uppercase tracking-wider">
          {data.storeName || 'GRABBER STORE'}
        </h2>
        {data.storeAddress && <p className="text-[10px]">{data.storeAddress}</p>}
        {data.storePhone && <p className="text-[10px]">Tel: {data.storePhone}</p>}
        {data.vatRegNumber && <p className="text-[10px]">VAT Reg: {data.vatRegNumber}</p>}
      </div>

      <div className="border-b border-dashed border-black my-1.5" />

      {/* Bill Metadata */}
      <div className="text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span>Bill No: <strong className="font-bold">{data.orderNumber}</strong></span>
          <span>{dateStr}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier: {data.cashierName || 'Cashier'}</span>
          <span>Tender: {data.tender}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-black my-1.5" />

      {/* Line Items Table */}
      <div className="w-full">
        <div className="grid grid-cols-12 text-[10px] font-bold border-b border-black pb-0.5 mb-1">
          <span className="col-span-6 text-left">ITEM</span>
          <span className="col-span-2 text-center">QTY</span>
          <span className="col-span-4 text-right">AMOUNT</span>
        </div>

        <div className="space-y-1">
          {data.items.map((item, idx) => {
            const lineTotal = item.lineTotal ?? item.unitPrice * item.quantity;
            return (
              <div key={idx} className="grid grid-cols-12 text-[10.5px]">
                <div className="col-span-6 text-left truncate pr-1">
                  <span className="font-semibold">{item.name}</span>
                  {item.quantity > 1 && (
                    <div className="text-[9px] text-gray-700">
                      @{item.unitPrice.toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="col-span-2 text-center font-medium">
                  {item.quantity}
                </div>
                <div className="col-span-4 text-right font-medium">
                  {lineTotal.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-b border-dashed border-black my-1.5" />

      {/* Totals Section */}
      <div className="space-y-0.5 text-[10.5px]">
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

        <div className="flex justify-between">
          <span>VAT (18% Incl.)</span>
          <span>LKR {data.taxTotal.toFixed(2)}</span>
        </div>

        <div className="border-t border-black my-1 pt-1 flex justify-between text-sm font-bold">
          <span>TOTAL DUE</span>
          <span>LKR {data.grandTotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-[10px] pt-0.5">
          <span>Amount Paid ({data.tender})</span>
          <span>LKR {(data.amountPaid ?? data.grandTotal).toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-[10px]">
          <span>Change Returned</span>
          <span>LKR {(data.changeDue ?? 0).toFixed(2)}</span>
        </div>

        {Boolean(data.loyaltyEarned && data.loyaltyEarned > 0) && (
          <div className="flex justify-between text-[10px] font-bold text-gray-800 pt-0.5">
            <span>Loyalty Points Earned</span>
            <span>+{data.loyaltyEarned} pts</span>
          </div>
        )}
      </div>

      <div className="border-b border-dashed border-black my-2" />

      {/* Barcode representation of Bill */}
      <div className="text-center my-2 flex flex-col items-center justify-center">
        <BarcodeSVG
          value={data.orderNumber}
          format="CODE128"
          height={26}
          width={1.2}
          displayValue={true}
          fontSize={9}
          className="mx-auto"
        />
      </div>

      {/* Footer Notes */}
      <div className="text-center text-[9px] text-gray-800 space-y-0.5 mt-2">
        <p>{data.footerNote || 'Thank you for shopping with us!'}</p>
        <p>Exchange possible within 7 days with bill.</p>
        <p className="font-semibold mt-1 text-[8px] text-gray-600">
          Powered by Grabber Business OS
        </p>
      </div>
    </div>
  );
}
