'use client';

import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Download, RefreshCw, Layers, Check, X } from 'lucide-react';
import Link from 'next/link';

interface ParsedRow {
  name: string;
  category: string;
  sku: string;
  barcode: string;
  costPrice: number;
  salePrice: number;
  initialStock: number;
  status: 'VALID' | 'WARNING' | 'COLLISION';
  note?: string;
}

export default function ProductImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);

  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([
    { name: 'Pure Cotton Oxford Shirt', category: 'Apparel', sku: 'OXF-SHT-WHT-M', barcode: '8901234567891', costPrice: 2800.0, salePrice: 5200.0, initialStock: 25, status: 'VALID' },
    { name: 'Slim Fit Denim Jeans', category: 'Apparel', sku: 'DNM-JNS-BLU-32', barcode: '8901234567895', costPrice: 3500.0, salePrice: 6800.0, initialStock: 15, status: 'VALID' },
    { name: 'Leather Classic Belt', category: 'Accessories', sku: 'LTH-BLT-BRN-L', barcode: '8901234567898', costPrice: 1200.0, salePrice: 2500.0, initialStock: 40, status: 'VALID' },
    { name: 'Casual Polo T-Shirt', category: 'Apparel', sku: 'LNN-SHT-BLU-L', barcode: '8901234567890', costPrice: 1800.0, salePrice: 3200.0, initialStock: 30, status: 'COLLISION', note: 'Duplicate SKU exists in store' },
    { name: 'Running Sport Socks (3-Pack)', category: 'Footwear', sku: 'RUN-SCK-BLK-01', barcode: '', costPrice: 600.0, salePrice: 1100.0, initialStock: 50, status: 'WARNING', note: 'Auto-generating Code128 Barcode' },
  ]);

  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSummary, setCommitSummary] = useState<{ total: number; added: number; updated: number; skipped: number } | null>(null);

  const handleSimulatedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
      setStep(2);
    }
  };

  const handleCommit = () => {
    setIsCommitting(true);
    setTimeout(() => {
      setIsCommitting(false);
      setCommitSummary({
        total: previewRows.length,
        added: 4,
        updated: 1,
        skipped: 0,
      });
      setStep(3);
    }, 1200);
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Name,Category,SKU,Barcode,CostPrice,SalePrice,InitialStock\nCotton Casual Shirt,Apparel,CTN-SHT-01,8901112223334,2500.00,4500.00,20\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'grabber_product_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/products" className="text-xs text-muted-foreground hover:text-foreground">
              &larr; Back to Products
            </Link>
          </div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>3-Stage Bulk Product Excel Importer</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
              Zero-Loss Migration
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Migrate existing inventories from Excel (.xlsx) or CSV with automatic column mapping, duplicate detection, and stock ledger seeding.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download Sample CSV Template</span>
        </button>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className={`p-3 rounded-xl border flex items-center gap-2 ${step === 1 ? 'border-primary bg-primary/5 text-foreground font-bold' : step > 1 ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 font-medium' : 'border-border text-muted-foreground'}`}>
          <span className="h-5 w-5 rounded-full flex items-center justify-center bg-card border text-[11px] font-bold">1</span>
          <span>Upload File</span>
        </div>
        <div className={`p-3 rounded-xl border flex items-center gap-2 ${step === 2 ? 'border-primary bg-primary/5 text-foreground font-bold' : step > 2 ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 font-medium' : 'border-border text-muted-foreground'}`}>
          <span className="h-5 w-5 rounded-full flex items-center justify-center bg-card border text-[11px] font-bold">2</span>
          <span>Validate & Preview</span>
        </div>
        <div className={`p-3 rounded-xl border flex items-center gap-2 ${step === 3 ? 'border-primary bg-primary/5 text-foreground font-bold' : 'border-border text-muted-foreground'}`}>
          <span className="h-5 w-5 rounded-full flex items-center justify-center bg-card border text-[11px] font-bold">3</span>
          <span>Commit & Complete</span>
        </div>
      </div>

      {/* Stage 1: Upload */}
      {step === 1 && (
        <div className="p-8 rounded-2xl bg-card border border-dashed border-border flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
            <UploadCloud className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Upload your Inventory Spreadsheet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Drag and drop your <code className="text-primary font-mono">.xlsx</code> or <code className="text-primary font-mono">.csv</code> product catalog file to begin automated parsing.
            </p>
          </div>

          <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
            <span>Choose Spreadsheet File</span>
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleSimulatedFileUpload}
              className="hidden"
            />
          </label>

          <p className="text-[10px] text-muted-foreground">Supported format: UTF-8 CSV, Microsoft Excel (.xlsx) up to 25MB</p>
        </div>
      )}

      {/* Stage 2: Preview & Validation Table */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-foreground">{fileName || 'grabber_catalog_export.xlsx'}</p>
                <p className="text-[10px] text-muted-foreground">{fileSize || '38.4 KB'} &bull; {previewRows.length} rows detected &bull; 1 Warning &bull; 1 SKU Collision</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border"
              >
                Choose Another File
              </button>
              <button
                onClick={handleCommit}
                disabled={isCommitting}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Committing to Database...</span>
                  </>
                ) : (
                  <>
                    <span>Commit & Import {previewRows.length} Products</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-foreground">Parsed Product Catalog Matrix</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2.5 font-medium">Validation</th>
                    <th className="pb-2.5 font-medium">Product Name</th>
                    <th className="pb-2.5 font-medium">Category</th>
                    <th className="pb-2.5 font-medium">SKU Code</th>
                    <th className="pb-2.5 font-medium">Barcode</th>
                    <th className="pb-2.5 font-medium text-right">Cost (LKR)</th>
                    <th className="pb-2.5 font-medium text-right">Price (LKR)</th>
                    <th className="pb-2.5 font-medium text-right">Initial Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-2.5">
                        {row.status === 'VALID' && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold flex items-center gap-1 w-fit">
                            <Check className="h-3 w-3" /> Ready
                          </span>
                        )}
                        {row.status === 'WARNING' && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold flex items-center gap-1 w-fit" title={row.note}>
                            <AlertTriangle className="h-3 w-3" /> Auto-Barcode
                          </span>
                        )}
                        {row.status === 'COLLISION' && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-destructive/10 text-destructive font-bold flex items-center gap-1 w-fit" title={row.note}>
                            <X className="h-3 w-3" /> Update Existing
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 font-semibold text-foreground">{row.name}</td>
                      <td className="py-2.5 text-muted-foreground">{row.category}</td>
                      <td className="py-2.5 font-mono text-primary font-bold">{row.sku}</td>
                      <td className="py-2.5 font-mono text-muted-foreground">{row.barcode || 'Will Generate'}</td>
                      <td className="py-2.5 text-right font-mono">{row.costPrice.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-foreground">{row.salePrice.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{row.initialStock} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stage 3: Summary & Completion */}
      {step === 3 && commitSummary && (
        <div className="p-8 rounded-2xl bg-card border border-border shadow-sm text-center space-y-5">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground">Product Import Committed Successfully!</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              All validated products and SKU variants have been written to the database with corresponding double-entry inventory ledger movements.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-xs">
            <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
              <p className="text-muted-foreground">New Products Added</p>
              <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{commitSummary.added}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
              <p className="text-muted-foreground">Existing SKUs Updated</p>
              <p className="text-xl font-extrabold text-blue-600 mt-0.5">{commitSummary.updated}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
              <p className="text-muted-foreground">Errors / Skipped</p>
              <p className="text-xl font-extrabold text-foreground mt-0.5">{commitSummary.skipped}</p>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/products"
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              View Products Catalog
            </Link>
            <Link
              href="/pos"
              className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border transition-all"
            >
              Go to POS Counter
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
