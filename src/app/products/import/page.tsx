'use client';

import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Download, RefreshCw, Check, X } from 'lucide-react';
import Link from 'next/link';

interface ParsedRow {
  name: string;
  category: string;
  sku: string;
  barcode: string;
  costPrice: number;
  salePrice: number;
  initialStock: number;
  variantName?: string;
  status: 'VALID' | 'WARNING' | 'COLLISION';
  note?: string;
  rowIndex: number;
}

export default function ProductImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSummary, setCommitSummary] = useState<{ total: number; added: number; updated: number; skipped: number; variantsAdded?: number } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    setImportError(null);
    setIsValidating(true);
    try {
      const csv = await file.text();
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', csv }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Validation failed');
      setPreviewRows(data.preview || []);
      setStep(2);
    } catch (err) {
      setImportError((err as Error).message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCommit = async () => {
    setIsCommitting(true);
    setImportError(null);
    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'commit', rows: previewRows }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Commit failed');
      setCommitSummary(data.summary);
      setStep(3);
    } catch (err) {
      setImportError((err as Error).message);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Name,Category,SKU,Barcode,CostPrice,SalePrice,InitialStock,VariantName\nCotton Casual Shirt,Apparel,CTN-SHT-01,8901112223334,2500.00,4500.00,20,Size M / White\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'grabber_product_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const warningCount = previewRows.filter((r) => r.status === 'WARNING').length;
  const collisionCount = previewRows.filter((r) => r.status === 'COLLISION').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
              Validate → Commit
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload CSV with server-side SKU collision detection and transactional commit.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download Sample CSV Template</span>
        </button>
      </div>

      {importError && (
        <p className="text-xs text-destructive p-3 rounded-xl bg-destructive/10 border border-destructive/20">{importError}</p>
      )}

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

      {step === 1 && (
        <div className="p-8 rounded-2xl bg-card border border-dashed border-border flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
            <UploadCloud className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Upload your Inventory Spreadsheet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Upload a UTF-8 <code className="text-primary font-mono">.csv</code> file. Excel (.xlsx) should be exported to CSV first.
            </p>
          </div>

          <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
            <span>{isValidating ? 'Validating…' : 'Choose CSV File'}</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" disabled={isValidating} />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-foreground">{fileName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {fileSize} · {previewRows.length} rows · {warningCount} warnings · {collisionCount} SKU updates
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border">
                Choose Another File
              </button>
              <button
                type="button"
                onClick={() => void handleCommit()}
                disabled={isCommitting || previewRows.length === 0}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Committing…</span>
                  </>
                ) : (
                  <>
                    <span>Commit {previewRows.length} Products</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2.5 font-medium">Validation</th>
                  <th className="pb-2.5 font-medium">Product Name</th>
                  <th className="pb-2.5 font-medium">SKU</th>
                  <th className="pb-2.5 font-medium text-right">Price</th>
                  <th className="pb-2.5 font-medium text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {previewRows.map((row) => (
                  <tr key={row.rowIndex} className="hover:bg-secondary/40">
                    <td className="py-2.5">
                      {row.status === 'VALID' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold inline-flex items-center gap-1">
                          <Check className="h-3 w-3" /> Ready
                        </span>
                      )}
                      {row.status === 'WARNING' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold inline-flex items-center gap-1" title={row.note}>
                          <AlertTriangle className="h-3 w-3" /> Warning
                        </span>
                      )}
                      {row.status === 'COLLISION' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold inline-flex items-center gap-1" title={row.note}>
                          <X className="h-3 w-3" /> Update
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 font-semibold">{row.name}</td>
                    <td className="py-2.5 font-mono text-primary">{row.sku}</td>
                    <td className="py-2.5 text-right font-mono">{row.salePrice.toFixed(2)}</td>
                    <td className="py-2.5 text-right">{row.initialStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 3 && commitSummary && (
        <div className="p-8 rounded-2xl bg-card border border-border shadow-sm text-center space-y-5">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Product Import Committed Successfully!</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-xs">
            <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
              <p className="text-muted-foreground">Added</p>
              <p className="text-xl font-extrabold text-emerald-600">{commitSummary.added}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
              <p className="text-muted-foreground">Updated</p>
              <p className="text-xl font-extrabold text-blue-600">{commitSummary.updated}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
              <p className="text-muted-foreground">Variants</p>
              <p className="text-xl font-extrabold text-foreground">{commitSummary.variantsAdded || 0}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
              <p className="text-muted-foreground">Skipped</p>
              <p className="text-xl font-extrabold text-foreground">{commitSummary.skipped}</p>
            </div>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/products" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs">
              View Products Catalog
            </Link>
            <Link href="/pos" className="px-5 py-2.5 rounded-xl bg-secondary border border-border font-semibold text-xs">
              Go to POS Counter
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
