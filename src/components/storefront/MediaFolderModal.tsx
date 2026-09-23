'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Upload,
  Download,
  Copy,
  Check,
  X,
  Image as ImageIcon,
  Folder,
  Layers,
  FileText,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import type { MediaAssetItem } from '@/app/api/storage/media/route';

export function MediaFolderModal({
  isOpen,
  onClose,
  onSelectMedia,
  selectedUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia?: (media: MediaAssetItem) => void;
  selectedUrl?: string;
}) {
  const [items, setItems] = useState<MediaAssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(
    async (q: string, cat: string, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q,
          category: cat,
          page: String(p),
          limit: '36',
        });
        const res = await fetch(`/api/storage/media?${params}`);
        const data = await res.json();
        if (data.success) {
          setItems(data.items);
          setTotalPages(data.totalPages || 1);
          setTotalCount(data.total || 0);
        }
      } catch (err) {
        console.error('Failed to fetch media', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      fetchMedia(search, category, page);
    }, 250);
    return () => clearTimeout(timeout);
  }, [isOpen, search, category, page, fetchMedia]);

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (item: MediaAssetItem) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');

      // Refresh list and select if applicable
      fetchMedia(search, category, 1);
      if (onSelectMedia) {
        onSelectMedia({
          id: data.relativePath || data.url,
          name: data.name || file.name,
          url: data.url,
          relativePath: data.relativePath || data.url,
          sizeBytes: data.sizeBytes || file.size,
          sizeFormatted: data.sizeFormatted || `${(file.size / 1024).toFixed(1)} KB`,
          ext: file.name.split('.').pop() || 'jpg',
          mtime: new Date().toISOString(),
        });
        onClose();
      }
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[90vh] rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Media Folder & Asset Library
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                  {totalCount.toLocaleString()} Assets
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Browse, search, upload and copy links for party packages, balloons, and banner media.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{uploading ? 'Uploading…' : 'Upload New Media'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-2 text-xs text-red-600 font-medium">
            Upload Error: {uploadError}
          </div>
        )}

        {/* Filter / Search Bar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between bg-card">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by product name, decoration, or package..."
              className="w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'products', 'balloons', 'decorations'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                  category === cat
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-xs text-muted-foreground font-medium">Scanning media folder…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-bold text-foreground">No media files found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Try a different search keyword or upload an image directly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map((item) => {
                const isSelected = selectedUrl && (selectedUrl === item.url || selectedUrl === item.relativePath);
                return (
                  <div
                    key={item.id}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-2 bg-card transition-all duration-200 hover:shadow-lg ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/40 bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted/40 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className="absolute top-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white uppercase backdrop-blur-xs">
                        {item.ext}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="mt-2 space-y-1">
                      <p className="truncate text-xs font-bold text-foreground" title={item.name}>
                        {item.name.replace(/\.[^/.]+$/, '')}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span>{item.sizeFormatted}</span>
                        <span className="truncate max-w-[80px]">{item.category}</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-2 flex items-center gap-1 pt-1.5 border-t border-border/50">
                      {onSelectMedia && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectMedia(item);
                            onClose();
                          }}
                          className="flex-1 rounded-lg bg-primary py-1.5 text-[10px] font-bold text-primary-foreground hover:opacity-90 cursor-pointer text-center"
                        >
                          Use
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopy(item.url, item.id)}
                        title="Copy Public Link"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        title="Download Asset"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                      </button>

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Full Size"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3 bg-muted/20 text-xs">
            <span className="text-muted-foreground">
              Page <span className="font-bold text-foreground">{page}</span> of{' '}
              <span className="font-bold text-foreground">{totalPages}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-border px-3 py-1.5 font-semibold text-foreground hover:bg-secondary disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-border px-3 py-1.5 font-semibold text-foreground hover:bg-secondary disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
